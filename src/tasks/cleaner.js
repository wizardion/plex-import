'use strict';

const fs = require('fs');
const db = require('../db');
const path = require('path');
const base = require('./base');
const logger = require('../logger');
const yellow = '\x1b[33m%s\x1b[0m';


base.name = 'clean-files';
base.exec = async function exec() {
  const data = [
    {file: 'plex-lost', locations: [base.user.locations.originals, base.user.locations.photoprism]},
    {file: 'lost', locations: [base.user.locations.photoprism, base.user.locations.plex.host]},
  ];

  data.forEach(item => {
    if (fs.existsSync(path.resolve(base.user.locations.tmp, item.file))) {
      const lost = db.init(base.user.locations.tmp, item.file);

      cleanUp(lost, item.locations);
    }
  });

  return true;
};

function cleanUp(files, locations) {
  const dict = {};

  Object.keys(files).forEach(key => {
    const ext = path.extname(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const basename = path.basename(key, path.extname(key)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tester = new RegExp(`${basename + (ext? `(${ext})?` : '')}(\\.[a-zA-Z]{2,6})?$`, 'gi');

    locations.forEach(root => {
      const directory = path.dirname(path.resolve(root, key));

      if(fs.existsSync(directory)) {
        let listFiles = dict[directory];
        
        if (listFiles === null || listFiles === undefined) {
          listFiles = fs.readdirSync(directory, {withFileTypes: true});
          dict[directory] = listFiles;
        }

        // TODO make sure it will not delete life bundles
        listFiles.filter(f => f.name.match(tester) && f.isFile()).forEach(f => {
          logger.log(base.name, `removing file: ${f.name}`);
          fs.rmSync(path.resolve(directory, f.name));
        });
        cleanEmptyDirectories(root, directory);
      }
    });
  });
}

function cleanEmptyDirectories(root, pathname) {
  const directories = pathname.replace(root, '').split('/').filter(d => d);

  while(directories.length) {
    const directory = path.resolve(root, directories.join('/'));
    
    if (fs.existsSync(directory)) {
      const files = fs.readdirSync(directory).filter(f => f.match(/^[^.]/));

      if (!files.length) {
        logger.log(base.name, `removing directory: ${directory}`);
        fs.rmSync(directory, {recursive: true, force: true});
      }
    }
    
    directories.pop();
  }
}

module.exports = base.task();
