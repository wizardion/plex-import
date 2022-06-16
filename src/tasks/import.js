'use strict';

const fs = require('fs');
const db = require('../db');
const path = require('path');
const yaml = require('yaml');
const base = require('./base');
const logger = require('../logger');
const {tmpdir} = require('../../configs');
const yellow = '\x1b[33m%s\x1b[0m';


base.name = 'import-files';
base.exec = async function exec() {
  var files = db.init(base.user.name, 'process.');
  var result = importFiles(files);

  db.append(files);

  logger.log(base.name, `imported: ${result.imported} files; skipped: ${result.skipped} files; `);
  return true;
};

function importFiles(files = {}) {
  var result = {
    imported: 0,
    skipped: 0,
  };

  Object.keys(files).forEach(key => {
    const ymlpath = path.resolve(base.user.locations.photoprism, key.replace(path.extname(key), '.yml'));
    
    if (fs.existsSync(ymlpath)) {
      let data = yaml.parse(fs.readFileSync(ymlpath, 'utf8'));

      if (data.TakenAt) {
        var source = getSourcePath(key, data.Type);
        let tmp = path.resolve(tmpdir, path.basename(source));
        let taken = convertTZ(new Date(data.TakenAt), 'America/New_York');
        let target = getTargetPath(key, source);

        if (fs.existsSync(target)) {
          fs.unlinkSync(target);
        }

        fs.linkSync(source, tmp);
        fs.utimesSync(tmp, taken, taken);

        fs.mkdirSync(path.dirname(path.resolve(base.user.locations.plex, key)), {recursive: true});
        fs.renameSync(tmp, target);

        files[key].processed = new Date().getTime();
        result.imported++;
      } else {
        logger.error(base.name, `'TakenAt' is not defined for: ${key}`);
        result.skipped++;
      }
    } else {
      logger.error(base.name, `yml not found for: ${key}`);
      result.skipped++;
    }
  });

  return result;
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

function convertTZ(date, tzString) {
  return new Date((typeof date === 'string' ? new Date(date) : date).toLocaleString('en-US', {timeZone: tzString}));   
}

module.exports = base.task();
