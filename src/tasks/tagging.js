'use strict';

const fs = require('fs');
const db = require('../db');
const path = require('path');
const yaml = require('yaml');
const base = require('./base');
const plex = require('../plex');
const yellow = '\x1b[33m%s\x1b[0m';
const logger = require('../logger');


base.name = 'tagging';
base.exec = async function exec() {
  try {
    var files = db.init(base.user.name, 'process.');
    var ymls = loadYmlData(files);
    var client = plex.init(base.user.token, base.user.locations.plex);

    await client.refresh(base.user.token);
    await client.wait(base.user.token);

    logger.log(base.name, 'plex is ready! Tagging media...');
    await client.tagMedia(ymls);

    logger.log(base.name, 'refreshing media...');
    await client.refresh(base.user.token);
    await client.wait(base.user.token);
  } catch (error) {
    console.log('er', error);
    logger.error(base.name, error.stack || error);
  }

  return true;
};

function loadYmlData(files) {
  const ymlData = {};

  Object.keys(files).forEach(key => {
    const ymlpath = path.resolve(base.user.locations.photoprism, key.replace(path.extname(key), '.yml'));

    if (!files[key].processed && fs.existsSync(ymlpath)) {
      const data = yaml.parse(fs.readFileSync(ymlpath, 'utf8'));
      const taken = convertTZ(new Date(data.TakenAt), 'America/New_York');
      const target = getTargetPath(key, getSourcePath(key, data.Type));
      const basename = target.replace(base.user.locations.plex, '.');

      ymlData[basename] = {
        taken: taken,
        type: data.Type,
        title: data.Title,
        target: target,
        location: {
          tz: data.TimeZone,
          alt: data.Altitude,
          lat: data.Lat,
          lng: data.Lng,
        },
        tags: loadTags(data)
      };
    } else {
      logger.error(base.name, `yml not found for: ${key}`);
    }
  });

  return ymlData;
}

function getTargetPath(key, source) {
  let directory = base.user.locations.plex;
  return path.resolve(directory, path.dirname(key), path.basename(key, path.extname(key)) + path.extname(source));
}

function getSourcePath(key, type) {
  let origin = path.resolve(base.user.locations.originals, key);

  if (type === 'image') {
    let jpg = path.resolve(base.user.locations.photoprism, `${key}.jpg`);
    let jpeg = path.resolve(base.user.locations.photoprism, `${key}.jpeg`);

    return fs.existsSync(jpg)? jpg : fs.existsSync(jpeg)? jpeg : origin;
  }

  return origin;
}

function loadTags(data) {
  const tags = (data.Details && data.Details.Keywords || '').split(',').map(t => t.trim());
  const dict = {};

  tags.forEach(tag => dict[tag] = true);

  return Object.keys(dict);
}

function convertTZ(date, tzString) {
  return new Date((typeof date === 'string' ? new Date(date) : date).toLocaleString('en-US', {timeZone: tzString}));   
}

module.exports = base.task();
