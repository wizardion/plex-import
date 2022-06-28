'use strict';

const fs = require('fs');
const path = require('path');
const base = require('./base');

base.name = 'plex-restore';
base.exec = async function exec() {

  return true;
};


module.exports = base.task();
