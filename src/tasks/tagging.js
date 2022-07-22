'use strict';

const fs = require('fs');
const db = require('../lib/db');
const path = require('path');
const yaml = require('yaml');
const base = require('./base');
const plex = require('../lib/plex');
const yellow = '\x1b[33m%s\x1b[0m';
const logger = require('../logger');


base.name = 'tagging';
base.exec = async function exec() {
  const session = db.loadDB(base.user.locations.tmp, 'session');
  const client = plex.init(base.user.host, base.user.token, base.user.locations.plex.container);
  const keys = Object.keys(session).filter(f => !!session[f].processed);

  await client.refresh();

  for (let i = 0; i < keys.length; i++) {
    const item = session[keys[i]];
    const target = path.resolve(base.user.locations.plex.container, item.target);
    
    try {
      const data = await client.find(target);
    
      await sleep(500);

      if (data) {
        await client.update(data, item);
        item.key = data.id;
        logger.log(base.name, `tagged media: ${i} of ${keys.length}: ${item.target}`);
      } else {
        logger.error(base.name, `file not found: ${item.target}`);
      }
    } catch (error) {
      logger.error(base.name, error.stack || error);
    }
  }

  db.saveDB(session, 'session');
  return true;
};

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

module.exports = base.task();
