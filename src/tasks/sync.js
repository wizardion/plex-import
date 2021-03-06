'use strict';

const fs = require('fs');
const db = require('../db');
const path = require('path');
const yaml = require('yaml');
const base = require('./base');
const logger = require('../logger');
const yellow = '\x1b[33m%s\x1b[0m';


base.name = 'sync-files';
base.exec = function exec() {
  var files = scanOriginals({old: db.init(base.user.name), new: {}, rest: {}, update: {}});

  importFiles(files.new);
  importFiles(files.update);
  cleanUp(files.old);
  db.save(Object.assign(files.new, files.rest, files.update));
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

      if (!item) {
        return (dict.new[key] = loadStats(path.resolve(base.user.locations.originals, key)));
      }

      if (isUpdated(key, item)) {
        dict.update[key] = {mtime: null, processed: null};
      } else {
        dict.rest[key] = Object.assign({}, dict.old[key]);
      }
      
      delete dict.old[key];
    }
  });

  return root !== '.'? null : dict;
}

function isUpdated(file, item) {
  const filepath = path.resolve(base.user.locations.originals, file);
  const stats = loadStats(filepath);

  if (equals(new Date(item.mtime), new Date(stats.mtime), 'mtime: ' + file)) {
    return false;
  }

  return true;
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

function importFiles(files = {}) {
  Object.keys(files).forEach(key => {
    const ymlpath = path.resolve(base.user.locations.photoprism, key.replace(path.extname(key), '.yml'));
    
    if (fs.existsSync(ymlpath)) {
      let data = yaml.parse(fs.readFileSync(ymlpath, 'utf8'));

      if (data.TakenAt) {
        let origin = path.resolve(base.user.locations.originals, key);
        let taken = new Date(data.TakenAt);
        var source = origin;
  
        if (data.Type === 'image') {
          let jpg = path.resolve(base.user.locations.photoprism, `${key}.jpg`);
          let jpeg = path.resolve(base.user.locations.photoprism, `${key}.jpeg`);
  
          source = fs.existsSync(jpg)? jpg : fs.existsSync(jpeg)? jpeg : source;
        }

	      // taken.setHours(taken.getHours() - 4);
        // console.log(yellow, 'taken', taken, '-', convertTZ(taken, 'America/New_York'));
        taken = convertTZ(taken, 'America/New_York');
        let target = path.resolve(base.user.locations.plex, path.dirname(key), path.basename(source));

        if (fs.existsSync(target)) {
          fs.unlinkSync(target);
        }
  
        fs.utimesSync(source, taken, taken);
        fs.utimesSync(origin, taken, taken);
        fs.mkdirSync(path.dirname(path.resolve(base.user.locations.plex, key)), {recursive: true});
        fs.linkSync(source, target);
        files[key].mtime = taken.getTime();
        files[key].processed = new Date().getTime();
      } else {
        logger.error(base.name, `'TakenAt' is not defined for: ${key}`);
      }
    } else {
      logger.error(base.name, `yml not found for: ${key}`);
    }
  });
}

function convertTZ(date, tzString) {
  return new Date((typeof date === 'string' ? new Date(date) : date).toLocaleString('en-US', {timeZone: tzString}));   
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
        files.forEach(f => fs.rmSync(path.resolve(directory, f.name)));
        cleanEmptyDirectories(root, directory);
      }
    });
  });
}

function cleanEmptyDirectories(root, pathname) {
  const directories = pathname.replace(root, '').split('/').filter(d => d);

  while(directories.length) {
    const dirrectory = path.resolve(root, directories.join('/'));
    
    if (fs.existsSync(dirrectory)) {
      const files = fs.readdirSync(dirrectory).filter(f => f.match(/^[^.]/));
      console.log(yellow, dirrectory, files);

      if (!files.length) {
        fs.rmSync(dirrectory, {recursive: true, force: true});
      }
    }
    
    directories.pop();
  }
}

module.exports = base.task();
