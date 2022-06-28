'use strict';

const plex = require('../plex');
const base = require('./base');


base.name = 'ensure-bin';
base.exec = async function exec() {
  const client = plex.init(base.user.host, base.user.token, base.user.locations.plex.container);

  await client.ensureBin();
  return true;
};


module.exports = base.task();
