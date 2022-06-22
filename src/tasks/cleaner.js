'use strict';

const fs = require('fs');
const path = require('path');
const base = require('./base');

base.name = 'clean-files';
base.exec = async function exec() {
  if (base.user.force) {
    let dbpath = path.resolve(base.user.tmp, `./${base.user.name}.list`);
    let processpath = path.resolve(base.user.tmp, `./process.${base.user.name}.list`);

    cleanUpDirectory(base.user.locations.plex);

    if (fs.existsSync(dbpath)) {
      fs.rmSync(dbpath);
    }
    
    if (fs.existsSync(processpath)) {
      fs.rmSync(processpath);
    }
  }

  return true;
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
