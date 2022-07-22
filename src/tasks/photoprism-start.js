'use strict';

const child = require('child_process');
const base = require('./base');

base.name = 'photoprism-start';
base.exec = async function() {
  try {
    child.execSync(`docker-compose -f /home/${base.user.name}/photoprism/docker-compose.yml start`, {stdio: 'inherit'});
    child.execSync(`docker-compose -f /home/${base.user.name}/photoprism/docker-compose.yml exec photoprism photoprism index`, {stdio: 'inherit'});
  } catch (error) {
    throw Error(error);  
  }

  return true;
};

module.exports = base.task();