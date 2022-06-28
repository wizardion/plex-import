'use strict';

const fs = require('fs');
const db = require('../db');
const path = require('path');
const base = require('./base');
const logger = require('../logger');
const yellow = '\x1b[33m%s\x1b[0m';


base.name = 'origin-scan';
base.exec = async function exec() {
  const data = db.init(base.user.locations.tmp);
  const originals = scanDirectory(base.user.locations.originals, {old: data, new: {}, rest: {}, update: {}});
  const newCount = Object.keys(originals.new).length;
  const updatedCount = Object.keys(originals.update).length;
  const lostCount = Object.keys(originals.update).length;
  var result = false;

  db.save(Object.assign(originals.rest));

  if (lostCount) {
    db.save(originals.old, 'lost');

    logger.log(base.name, `found lost files: ${lostCount}`);
    result = true;
  }

  if (newCount || updatedCount) {
    cleanUpUpdated(originals.update);
    db.save(Object.assign(originals.new, originals.update), 'process');

    if (newCount) {
      logger.log(base.name, `found new files: ${newCount}`);
    }

    if (updatedCount) {
      logger.log(base.name, `found updated files: ${updatedCount}`);
    }

    await refreshPlex();
    result = true;
  }

  return result;
};

function scanDirectory(location, dict, root='.') {
  const dirname = path.resolve(location, root);
  const files = fs.readdirSync(dirname, {withFileTypes: true}).filter(f => f.name.match(/^[^.]/));

  files.forEach(file => {
    if (file.isDirectory()) {
      return scanDirectory(location, dict, `${root}/${file.name}`);
    }

    if (file.isFile()) {
      let key = `${root}/${file.name}`;
      let item = dict.old[key];
      let stats = loadStats(path.resolve(base.user.locations.originals, key));

      if (!item) {
        return (dict.new[key] = stats);
      }

      if (!equals(new Date(item.mtime), new Date(stats.mtime))) {
        dict.update[key] = stats;
      } else {
        dict.rest[key] = Object.assign({}, dict.old[key]);
      }
      
      delete dict.old[key];
    }
  });

  return root !== '.'? null : dict;
}

function loadStats(filepath) {
  const stats = fs.statSync(filepath, {throwIfNoEntry: true});

  return {
    mtime: new Date(stats.mtime).getTime(),
    processed: null
  };
}

function equals(first = new Date(), second = new Date()) {
  // console.log(yellow, {a: taken.toLocaleString(), b: modified.toLocaleString()});
  // console.log(yellow, 'getFullYear: ', taken.getFullYear());
  // console.log(yellow, 'getMonth: ', taken.getMonth());
  // console.log(yellow, 'getDate: ', taken.getDate());
  // console.log(yellow, 'getDay: ', taken.getDay());
  // console.log(yellow, 'getHours: ', taken.getHours());
  // console.log(yellow, 'getMinutes: ', taken.getMinutes());
  // console.log(yellow, 'getSeconds: ', taken.getSeconds());

  // return taken.getDate() === modified.getDate() && taken.getDay() === modified.getDay() && 
  //        taken.getFullYear() === modified.getFullYear() && taken.getHours() === modified.getHours() &&
  //        taken.getMonth() === modified.getMonth();
  // if (t && taken.toLocaleString() !== modified.toLocaleString()) {
  //   console.log(yellow, t, 'item: ', taken, '; stats: ', modified);
  // }
  return first.toLocaleString() === second.toLocaleString();
}

function getTargetPath(key, source) {
  let directory = base.user.locations.plex.host;
  return path.resolve(directory, path.dirname(key), path.basename(key, path.extname(key)) + path.extname(source));
}

function cleanUpUpdated(files) {
  Object.keys(files).forEach(key => {
    let jpg = path.resolve(base.user.locations.photoprism, `${key}.jpg`);
    let jpeg = path.resolve(base.user.locations.photoprism, `${key}.jpeg`);
    let source = fs.existsSync(jpg)? jpg : fs.existsSync(jpeg)? jpeg : null;
    let target = getTargetPath(key, source || key);

    if (source) {
      fs.rmSync(source);
    }

    if (fs.existsSync(target)) {
      fs.rmSync(target);
    }
  });
}

async function refreshPlex() {
  // let client = plex.init(base.user.host, base.user.token, base.user.locations.plex.host);

  // await client.refresh(base.user.token);
  // await client.wait(base.user.token);
}

module.exports = base.task();
