'use strict';

const db = require('../lib/db');
const base = require('./base');
const yellow = '\x1b[33m%s\x1b[0m';


base.name = 'finish';
base.exec = async function exec() {
  var files = db.init(base.user.locations.tmp, 'session');

  db.save(Object.assign({}, db.init(base.user.locations.tmp), files));
  db.remove(base.user.locations.tmp, 'session');

  var data = db.loadDB(base.user.locations.tmp, 'session');
  
  db.saveDB(Object.assign({}, db.loadDB(base.user.locations.tmp), data));
  db.remove(base.user.locations.tmp, 'session', 'db');

  return true;
};

module.exports = base.task();
