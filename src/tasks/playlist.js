'use strict';

const fs = require('fs');
const db = require('../db');
const path = require('path');
const yaml = require('yaml');
const base = require('./base');
const plex = require('../plex');
const logger = require('../logger');


base.name = 'playlist';
base.exec = async function exec() {
  const files = loadYmlData(db.init(base.user.locations.tmp, 'process'));
  const client = plex.init(base.user.host, base.user.token, base.user.locations.plex.container);

  const playlists = await client.getPlayLists();
  var photos = playlists.find(p => p.title === 'Photos');
  var videos = playlists.find(p => p.title === 'Videos');

  if (!photos) {
    photos = await client.createPlayList('Photos', 'All your photos are in here.');
  }

  if (!videos) {
    videos = await client.createPlayList('Videos', 'All your photos are in here.');
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const data = await client.find(file.target);
    
    await sleep(500);

    if (data) {
      if (file.type === 'image') {
        await client.addToPlayList(photos.ratingKey, data.key);
        logger.log(base.name, `added photo: ${i} - ${file.target} of total: ${files.length}`);
      }
  
      if (file.type === 'video') {
        await client.addToPlayList(videos.ratingKey, data.key);
        logger.log(base.name, `added video: ${i} - ${file.target} of total: ${files.length}`);
      }
    } else {
      logger.error(base.name, `file not found: ${file.target}`);
    }
  }

  return true;
};

function loadYmlData(files) {
  const ymlData = [];

  Object.keys(files).forEach(key => {
    const ymlpath = path.resolve(base.user.locations.photoprism, key.replace(path.extname(key), '.yml'));

    if (!files[key].processed && fs.existsSync(ymlpath)) {
      const data = yaml.parse(fs.readFileSync(ymlpath, 'utf8'));
      const target = getTargetPath(key, getSourcePath(key, data.Type));

      ymlData.push({
        type: data.Type,
        title: data.Title,
        target: target,
        location: {
          tz: data.TimeZone,
          alt: data.Altitude,
          lat: data.Lat,
          lng: data.Lng,
        },
      });
    } else {
      logger.error(base.name, `yml not found: ${ymlpath}, origin: ${path.resolve(base.user.locations.originals, key)}`);
    }
  });

  return ymlData;
}

function getTargetPath(key, source) {
  let directory = base.user.locations.plex.container;
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

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

module.exports = base.task();
