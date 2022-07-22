'use strict';

const fs = require('fs');
const db = require('../lib/db');
const path = require('path');
const base = require('./base');
const logger = require('../logger');


base.name = 'scan-origin';
base.exec = async function exec() {
  const data = db.init(base.user.locations.tmp);
  const originals = scanDirectory(base.user.locations.originals, {old: data, new: {}, rest: {}, updated: {}});
  var result = false;

  db.save(Object.assign(originals.rest));

  if (originals.lost.count) {
    db.save(originals.lost.data, 'lost');

    logger.log(base.name, `found lost files: ${originals.lost.count}`);
    result = true;
  }

  if (originals.new.count || originals.updated.count) {
    db.save(Object.assign(originals.new.data, originals.updated.data), 'session');

    if (originals.new.count) {
      logger.log(base.name, `found new files: ${originals.new.count}`);
    }

    if (originals.updated.count) {
      logger.log(base.name, `found updated files: ${originals.updated.count}`);
    }

    result = true;
  }

  return result;
};

function scanDirectory(location, dict, root='') {
  const dirname = path.resolve(location, root);
  const files = fs.readdirSync(dirname, {withFileTypes: true}).filter(f => f.name.match(/^[^.]/));

  files.forEach(file => {
    if (file.isDirectory()) {
      return scanDirectory(location, dict, `${root}${file.name}/`);
    }

    if (file.isFile()) {
      let key = `${root}${file.name}`;
      // let key = `${root}${path.basename(file.name, path.extname(file.name))}`;
      let stats = loadStats(path.resolve(base.user.locations.originals, key));
      let item = dict.old[key];

      if (!item) {
        return (dict.new[key] = {mtime: stats.mtime, files: {[key]: true}});
      }

      if (!equals(new Date(item.mtime), new Date(stats.mtime))) {
        dict.updated[key].mtime = stats.mtime;
      } else {
        // TODO check for deep copies
        dict.rest[key] = Object.assign({}, dict.old[key]);
      }
      
      delete dict.old[key];
    }
  });

  return root !== ''? null : {
    rest: dict.rest,
    lost: {
      count: Object.keys(dict.old).length,
      data: dict.old
    },
    new: {
      count: Object.keys(dict.new).length,
      data: dict.new
    },
    updated: {
      count: Object.keys(dict.updated).length,
      data: dict.updated
    }
  };
}

function loadStats(filepath) {
  const stats = fs.statSync(filepath, {throwIfNoEntry: true});

  return {
    mtime: new Date(stats.mtime).getTime(),
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

module.exports = base.task();
