'use strict';

const child = require('child_process');
const base = require('./base');

base.name = 'photoprism-stop';
base.exec = async function() {
  try {
    child.execSync(`docker-compose -f /home/${base.user.name}/photoprism/docker-compose.yml stop`, {stdio: 'inherit'});
  } catch (error) {
    throw Error(error);  
  }

  return true;
};

module.exports = base.task();