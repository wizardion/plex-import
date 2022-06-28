'use strict';

const fs = require('fs');
const path = require('path');
const base = require('./base');
const logger = require('../logger');


base.name = 'forcer';
base.exec = async function exec() {
  if (base.user.force.plex) {
    const files = fs.readdirSync(base.user.locations.tmp, {withFileTypes: true}).filter(f => !f.name.match(/\.log$/));

    files.forEach(file => {
      let filepath = path.resolve(base.user.locations.tmp, file.name);

      if (fs.existsSync(filepath)) {
        logger.log(base.name, `removing file: ${file.name}`);
        fs.rmSync(filepath);
      }
    });

    cleanUpDirectory(base.user.locations.plex.host);
    return true;
  }

  return false;
};

function cleanUpDirectory(directory) {
  const files = fs.readdirSync(directory, {withFileTypes: true});

  files.forEach(f => {
    const pathname = path.resolve(directory, f.name);

    if (f.isDirectory()) {
      fs.rmSync(pathname, { recursive: true, force: true });
    } else {
      fs.rmSync(pathname);
    }
  });
}

module.exports = base.task();
