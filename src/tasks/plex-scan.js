'use strict';

const fs = require('fs');
const db = require('../db');
const path = require('path');
const base = require('./base');
const logger = require('../logger');
const yellow = '\x1b[33m%s\x1b[0m';


base.name = 'plex-scan';
base.exec = async function exec() {
  const data = db.init(base.user.locations.tmp);

  if (Object.keys(data).length) {
    const scanned = scanPlex(base.user.locations.plex.host, {new: {}, lost: data});

    if (Object.keys(scanned.lost).length) {
      db.save(scanned.lost, 'plex-lost');
      return true;
    }
  }
  
  return false;
};

function scanPlex(location, dict, root='.') {
  const dirname = path.resolve(location, root);
  const files = fs.readdirSync(dirname, {withFileTypes: true}).filter(f => f.name.match(/^[^.]/));

  files.forEach(file => {
    if (file.isDirectory()) {
      return scanPlex(location, dict, `${root}/${file.name}`);
    }

    if (file.isFile()) {
      let key = getSource(dict.lost, root, file.name);
      let item = dict.lost[key];

      if (!item) {
        dict.new[key] = Object.assign({}, dict.lost[key]);
      }

      delete dict.lost[key];
    }
  });

  return root !== '.'? null : dict;
}

function getSource(dict, root, name) {
  var key = Object.keys(dict).find(k => {
    var dirname = path.dirname(k);

    if (dirname == root) {
      let item = dict[k];
      return item.target === name;
    }

    return false;
  });

  return key;
}

module.exports = base.task();
