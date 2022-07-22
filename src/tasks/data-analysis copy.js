'use strict';

const fs = require('fs');
const db = require('../lib/db');
const path = require('path');
const base = require('./base');
const yaml = require('yaml');
const logger = require('../logger');
const yellow = '\x1b[33m%s\x1b[0m';


const sourceTypes = {
  live: {
    get: (file) => {
      //TODO check mime type by file-type: {ext: 'jpg', mime: 'image/jpeg'}
      if (!path.extname(file).match(/\.mov$/i)) {
        let jpg = path.resolve(base.user.locations.photoprism.sidecar, `${file}.jpg`);
        let jpeg = path.resolve(base.user.locations.photoprism.sidecar, `${file}.jpeg`);
  
        return fs.existsSync(jpg)? jpg : fs.existsSync(jpeg)? jpeg : null;
      }
    }
  },
  image: {
    get: (file) => {
      let source = path.resolve(base.user.locations.originals, file);

      if (!file.match(/\.jpe?g$/i)) {
        let jpg = path.resolve(base.user.locations.photoprism.sidecar, `${file}.jpg`);
        let jpeg = path.resolve(base.user.locations.photoprism.sidecar, `${file}.jpeg`);

        return fs.existsSync(jpg)? jpg : fs.existsSync(jpeg)? jpeg : null;
      }

      return fs.existsSync(source) && source;
    }
  },
  video: {
    get: (file) => {
      let source = path.resolve(base.user.locations.originals, file);
      return fs.existsSync(source) && source;
    }
  },
};

base.name = 'data-analysis';
base.exec = async function exec() {
  const data = db.init(base.user.locations.tmp);

  // console.log(yellow, 'originals', originals.new);
};

function scanDirectory(location, dict, root='') {
  const dirname = path.resolve(location, root);
  const files = fs.readdirSync(dirname, {withFileTypes: true}).filter(f => f.name.match(/^[^.]/));

  files.forEach(file => {
    if (file.isDirectory()) {
      return scanDirectory(location, dict, `${root}${file.name}/`);
    }

    if (file.isFile()) {
      let filename = `${root}${file.name}`;
      let key = `${root}${path.basename(file.name, path.extname(file.name))}`;
      // let stats = loadStats(path.resolve(base.user.locations.originals, filename));
      let stats = getMetaData(loadStats(path.resolve(base.user.locations.originals, filename)), filename);
      let item = dict.old[key];
      
      stats.files.push(file.name);

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

  return root !== ''? null : dict;
}

function getMetaData(data, filename) {
  const ymlpath = path.resolve(base.user.locations.photoprism.sidecar, filename.replace(path.extname(filename), '.yml'));

  if (fs.existsSync(ymlpath)) {
    let yml = yaml.parse(fs.readFileSync(ymlpath, 'utf8'));

    if (yml.TakenAt) {
      var source = sourceTypes[yml.Type] && sourceTypes[yml.Type].get(filename);

      if (source) {
        let target = path.basename(filename.replace(path.extname(filename), path.extname(source).toLowerCase()));
        let taken = convertTZ(new Date(yml.TakenAt), 'America/New_York');

        data.source = source;
        data.target = target;
        data.meta = {
          taken: taken,
          type: yml.Type,
          title: yml.Title,
          tags: loadTags(yml),
          location: {
            tz: yml.TimeZone,
            alt: yml.Altitude,
            lat: yml.Lat,
            lng: yml.Lng,
          },
        };
      }
    }
  }

  return data;
}

function loadStats(filepath) {
  const stats = fs.statSync(filepath, {throwIfNoEntry: true});

  return {
    mtime: new Date(stats.mtime).getTime(),
    files: [],
    processed: null,
    source: null,
    target: null,
    meta: null
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

function getSourcePath(file, type) {
  // return sourceTypes[type].get(file);

  // let origin = path.resolve(base.user.locations.originals, key);

  // if (type === 'live' && !!path.extname(key).match(/\.mov$/i)) {
  //   return null;
  // }

  // if (type === 'image' || type === 'live') {
  //   let jpg = path.resolve(base.user.locations.photoprism.sidecar, `${key}.jpg`);
  //   let jpeg = path.resolve(base.user.locations.photoprism.sidecar, `${key}.jpeg`);

  //   return fs.existsSync(jpg)? jpg : fs.existsSync(jpeg)? jpeg : origin;
  // }

  // return origin;
}

function convertTZ(date, tzString) {
  return new Date((typeof date === 'string' ? new Date(date) : date).toLocaleString('en-US', {timeZone: tzString}));   
}

function loadTags(data) {
  const tags = (data.Details && data.Details.Keywords || '').split(',').map(t => t.trim());
  const dict = {};

  tags.forEach(tag => dict[tag] = true);

  return Object.keys(dict);
}

// ---------------------------------------------------------------------------------------------------------------------
function getTargetPath(file, source) {
  return file.replace(path.extname(file), path.extname(source).toLowerCase());
}

function cleanUpUpdated(files) {
  Object.keys(files).forEach(key => {
    let jpg = path.resolve(base.user.locations.photoprism.sidecar, `${key}.jpg`);
    let jpeg = path.resolve(base.user.locations.photoprism.sidecar, `${key}.jpeg`);
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
  // let client = plex.init(base.user.host, base.user.token);

  // await client.refresh(base.user.token);
  // await client.wait(base.user.token);
}

module.exports = base.task();
