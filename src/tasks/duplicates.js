'use strict';

const fs = require('fs');
const path = require('path');
const base = require('./base');
const yellow = '\x1b[33m%s\x1b[0m';

base.name = 'fix-duplicates';
base.exec = function() {
  const duplicates = [];
  const data = scanOriginals();
  const keys = Object.keys(data);

  for (let i = 0; i < keys.length; i++) {
    const element = data[keys[i]];
    
    if (Object.keys(element).length > 1) {
      duplicates.push(element);
    }
  }

  renameDuplicates(duplicates);
};

function scanOriginals(data={}, root='.') {
  const dirname = path.resolve(base.user.locations.originals, root);
  const files = fs.readdirSync(dirname, {withFileTypes: true}).filter(f => f.name.match(/^[^.]/));

  files.forEach(file => {
    if (file.isDirectory()) {
      return scanOriginals(data, `${root}/${file.name}`);
    }

    if (file.isFile()) {
      let fileName = `${root}/${file.name}`;
      let key = `${root}/${path.basename(file.name, path.extname(file.name))}`;
      let exists = data[key];

      if (!exists) {
        data[key] = [fileName];
      } else {
        data[key].push(fileName);
      }
    }
  });

  return root === '.'? data : null;
}

function renameDuplicates(duplicates) {
  duplicates.forEach(files => {
    var count = 1;

    for (let i = 0; i < files.length; i++) {
      var filename = files[i];
      const extname = path.extname(filename).replace(/^\./gi, '').toLowerCase();
      const filepath = path.resolve(base.user.locations.originals, filename);

      if(['heif', 'heifs', 'heic', 'heics'].indexOf(extname) < 0) {
        filename = filename.replace(new RegExp(`(.*)(\.${extname})$`, 'gi'), `$1 - edited-${count}$2`);
        count++;
      }
    
      fs.renameSync(filepath, path.resolve(base.user.locations.originals, filename));
    }
  });
}

module.exports = base.task();
