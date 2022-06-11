'use strict';

const fs = require('fs');
const db = require('../db');
const path = require('path');
const base = require('./base');
const logger = require('../logger');
const yellow = '\x1b[33m%s\x1b[0m';

base.name = 'scan-sync-files';
base.exec = function exec() {
  var files = scanOriginals({old: db.init(base.user.name), new: {}, rest: {}, update: {}});
  var newCount = Object.keys(files.new).length;
  var updatedCount = Object.keys(files.update).length;
  
  cleanUp(files.old);
  db.save(Object.assign(files.rest));

  if (newCount || updatedCount) {
    cleanUpUpdated(files.update);
    db.save(Object.assign(files.new, files.update), 'process.');

    if (newCount) {
      logger.log(base.name, `found new files: ${newCount}`);
    }

    if (updatedCount) {
      logger.log(base.name, `found updated files: ${updatedCount}`);
    }
    return true;
  }

  return false;
};

function scanOriginals(dict, root='.') {
  const dirname = path.resolve(base.user.locations.originals, root);
  const files = fs.readdirSync(dirname, {withFileTypes: true}).filter(f => f.name.match(/^[^.]/));

  files.forEach(file => {
    if (file.isDirectory()) {
      return scanOriginals(dict, `${root}/${file.name}`);
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
  let directory = base.user.locations.plex;
  return path.resolve(directory, path.dirname(key), path.basename(key, path.extname(key)) + path.extname(source));
}

function cleanUpUpdated(files) {
  Object.keys(files).forEach(key => {
    let jpg = path.resolve(base.user.locations.photoprism, `${key}.jpg`);
    let jpeg = path.resolve(base.user.locations.photoprism, `${key}.jpeg`);
    let photoPath = fs.existsSync(jpg)? jpg : fs.existsSync(jpeg)? jpeg : null;
    let target = getTargetPath(key, photoPath || key);

    if (photoPath) {
      fs.rmSync(photoPath);
    }

    if (fs.existsSync(target)) {
      fs.rmSync(target);
    }
  });
}

function cleanUp(files) {
  const dict = {};

  Object.keys(files).forEach(key => {
    const ext = path.extname(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const basename = path.basename(key, path.extname(key)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tester = new RegExp(`${basename + (ext? `(${ext})?` : '')}(\\.[a-zA-Z]{2,6})?$`, 'gi');
    const locations = [base.user.locations.photoprism, base.user.locations.plex];

    locations.forEach(root => {
      const directory = path.dirname(path.resolve(root, key));

      if(fs.existsSync(directory)) {
        let listFiles = dict[directory];
        
        if (listFiles === null || listFiles === undefined) {
          listFiles = fs.readdirSync(directory, {withFileTypes: true});
          dict[directory] = listFiles;
        }
  
        let files = listFiles.filter(f => f.name.match(tester) && f.isFile());
        files.forEach(f => {
          logger.log(base.name, `removing file: ${f.name}`);
          fs.rmSync(path.resolve(directory, f.name));
        });
        cleanEmptyDirectories(root, directory);
      }
    });
  });
}

function cleanEmptyDirectories(root, pathname) {
  const directories = pathname.replace(root, '').split('/').filter(d => d);

  while(directories.length) {
    const directory = path.resolve(root, directories.join('/'));
    
    if (fs.existsSync(directory)) {
      const files = fs.readdirSync(directory).filter(f => f.match(/^[^.]/));

      if (!files.length) {
        logger.log(base.name, `removing directory: ${directory}`);
        fs.rmSync(directory, {recursive: true, force: true});
      }
    }
    
    directories.pop();
  }
}

module.exports = base.task();
