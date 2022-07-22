'use strict';

const fs = require('fs');
const db = require('../lib/db');
const path = require('path');
const base = require('./base');
const plex = require('../lib/plex');
const yellow = '\x1b[33m%s\x1b[0m';


base.name = 'plex-scan';
base.exec = async function exec() {
  const data = db.loadDB(base.user.locations.tmp);
  const client = plex.init(base.user.host, base.user.token, base.user.locations.plex.container);
  const keys = Object.keys(data);
  const lost = [];
  var changed = false;

  for (let i = 0; i < keys.length; i++) {
    const item = data[keys[i]];
    const target = path.resolve(base.user.locations.plex.host, item.target);
    
    if (fs.existsSync(target)) {
      let details = getMediaDetails(await client.get(item.key));
      
      if (!changed && 
          (item.title !== details.title || item.favorite !== details.favorite || !equal(item.tags, details.tags))) {
        changed = true;
      }

      await sleep(100);
      item.title = details.title;
      item.favorite = details.favorite;
      item.tags = details.tags;
    } else {
      lost.push(item);
    }
  }
  
  if (lost.length) {
    db.saveDB(lost, 'lost');
  }

  if (changed) {
    console.log('changed', changed);
    db.saveDB(data);
  }

  return changed;
};

function getMediaDetails(media) {
  return {
    title: media.summary,
    favorite: (media.userRating? true : false),
    tags: (media.Tag && media.Tag.length? media.Tag.map(t => t.tag) : null),
  };
}

function equal(first, second) {
  return first.sort().join('').toLowerCase() === second.sort().join('').toLowerCase();
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

module.exports = base.task();
