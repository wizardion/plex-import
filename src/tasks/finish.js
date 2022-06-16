'use strict';

const db = require('../db');
const base = require('./base');
const yellow = '\x1b[33m%s\x1b[0m';


base.name = 'finish';
base.exec = async function exec() {
  db.remove(base.user.name, 'process.');
  return true;
};

module.exports = base.task();
