'use strict';

const plex = require('../lib/plex');
const base = require('./base');


base.name = 'ensure-bin';
base.exec = async function exec() {
  const client = plex.init(base.user.host, base.user.token);

  await client.ensureBin();
  return true;
};


module.exports = base.task();
