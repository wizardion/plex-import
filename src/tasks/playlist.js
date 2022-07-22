'use strict';

const fs = require('fs');
const db = require('../lib/db');
const path = require('path');
const yaml = require('yaml');
const base = require('./base');
const plex = require('../lib/plex');
const logger = require('../logger');


base.name = 'playlist';
base.exec = async function exec() {
  const session = db.loadDB(base.user.locations.tmp, 'session');
  const client = plex.init(base.user.host, base.user.token);
  const keys = Object.keys(session).filter(f => !!session[f].processed);

  const playlists = await client.getPlayLists();
  var photos = playlists.find(p => p.title === 'Photos');
  var videos = playlists.find(p => p.title === 'Videos');

  if (!photos) {
    photos = await client.createPlayList('Photos', 'All your photos are in here.');
  }

  if (!videos) {
    videos = await client.createPlayList('Videos', 'All your photos are in here.');
  }

  for (let i = 0; i < keys.length; i++) {
    const item = session[keys[i]];
    const target = path.resolve(base.user.locations.plex.container, item.target);
    
    try {
      const data = await client.find(target);
    
      await sleep(500);

      if (data) {
        if (['image', 'live'].indexOf(item.type) >= 0) {
          await client.addToPlayList(photos.ratingKey, data.key);
          logger.log(base.name, `added photo: ${i} of ${keys.length}: ${item.target}`);
        }
    
        if (['video'].indexOf(item.type) >= 0) {
          await client.addToPlayList(videos.ratingKey, data.key);
          logger.log(base.name, `added video: ${i} of ${keys.length}: ${item.target}`);
        }
      } else {
        logger.error(base.name, `file not found: ${item.target}`);
      }
    } catch (error) {
      logger.error(base.name, error.stack || error);
    }
  }

  return true;
};

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

module.exports = base.task();
