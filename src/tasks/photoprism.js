'use strict';

const fs = require('fs');
const configs = require('../../configs');
const path = require('path');
const yellow = '\x1b[33m%s\x1b[0m';
const child = require('child_process');
const base = require('./base');

base.name = 'photoprism-tensor-flow';
base.exec = function() {
  try {
    child.execSync(`docker-compose -f /home/${base.user.name}/photoprism/docker-compose.yml up -d`, {stdio: 'inherit'});
    child.execSync(`docker-compose -f /home/${base.user.name}/photoprism/docker-compose.yml exec photoprism photoprism index`, {stdio: 'inherit'});
  } catch (error) {
    child.execSync(`docker-compose -f /home/${base.user.name}/photoprism/docker-compose.yml stop`, {stdio: 'inherit'});
    throw Error(error);  
  }
  
  child.execSync(`docker-compose -f /home/${base.user.name}/photoprism/docker-compose.yml stop`, {stdio: 'inherit'});
};

module.exports = base.task();