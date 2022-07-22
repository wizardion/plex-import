'use strict';

const fs = require('fs');
const db = require('../lib/db');
const path = require('path');
const base = require('./base');
const logger = require('../logger');


base.name = 'import-files';
base.exec = async function exec() {
  const session = db.loadDB(base.user.locations.tmp, 'session');
  var result = importFiles(session);

  db.saveDB(session, 'session');
  // logger.log(base.name, `imported: ${result.imported} files; skipped: ${result.skipped} files; `);
  logger.log(base.name, `imported: ${result.imported} files;`);
  return true;
};

function importFiles(data = {}) {
  const sources = {
    [base.locationTypes.ORIGINAL]: base.user.locations.originals,
    [base.locationTypes.PHOTOPRISM]: base.user.locations.photoprism.sidecar
  };
  const result = {
    imported: 0,
    skipped: 0,
  };

  Object.keys(data).forEach(key => {
    const item = data[key];
  
    if (item.taken) {
      const source = path.resolve(sources[item.source.type], item.source.path);
      const target = path.resolve(base.user.locations.plex.host, item.target);
      const tmp = path.resolve(base.user.locations.tmp, path.basename(source));

      if (fs.existsSync(target)) {
        fs.unlinkSync(target);
      }

      fs.linkSync(source, tmp);
      fs.utimesSync(tmp, item.taken, item.taken);
      fs.mkdirSync(path.dirname(target), {recursive: true});
      fs.renameSync(tmp, target);

      item.processed = new Date().getTime();
      result.imported++;
    }
  });

  return result;
}

module.exports = base.task();
