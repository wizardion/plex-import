'use strict';

const fs = require('fs');
const path = require('path');
const configs = require('../../configs');

var _dirname_ = null;

function ensureDirectory(pathname) {
  const dbDirectory = path.dirname(pathname);

  if(!fs.existsSync(dbDirectory)) {
    fs.mkdirSync(dbDirectory, {recursive: true});
  }

  _dirname_ = dbDirectory;
}

function loadDB(dirname, filename='data') {
  var dictionary = {};
  const dbPath = path.resolve(dirname, `./${filename}.db`);
  
  ensureDirectory(dbPath);
  if(fs.existsSync(dbPath)) {
    let data = fs.readFileSync(dbPath, 'utf-8') || '';

    data = data.split('\n').filter(p => p).map(v => {
      const f = v.split('\t|');
      return ({[f[0]]: {
        id: f[1],
        taken: f[2]? new Date(f[2]) : null,
        target: f[3] || null,
        type: f[4] || null,
        processed: f[5]? new Date(f[5]) : null,
        title: f[6] || null,
        favorite: f[7]? true : false,
        source: {
          type: f[8]? parseInt(f[8]) : null,
          path: f[9] || null
        },
        files: f[10]? f[10].split(',') : null,
        tags: f[11]? f[11].split(',') : null,
        location: {
          tz: f[12] || null,
        }
      }});
    });

    dictionary = Object.assign({}, ...data);
  } else {
    fs.writeFileSync(dbPath, '', {flag: 'w', encoding: 'utf-8'});
  }

  return dictionary;
}

function saveDB(dictionary, filename='data', append=false) {
  var keys = Object.keys(dictionary);
  var data = [];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const item = dictionary[key];
    var row = `${key}\t|${item.id || ''}` + 
                `\t|${item.taken? new Date(item.taken).toISOString() : ''}` +
                `\t|${item.target || ''}` +
                `\t|${item.type || ''}` +
                `\t|${item.processed? new Date(item.processed).toISOString() : ''}` +
                `\t|${item.title || ''}` +
                `\t|${item.favorite? 1 : ''}`;
    
    if (item.source) {
      row += `\t|${item.source.type || ''}` +
             `\t|${item.source.path || ''}`;
    }

    if (item.files) {
      row += `\t|${item.files.join(',') || ''}`;
    }

    if (item.tags) {
      row += `\t|${item.tags.join(',') || ''}`;
    }

    if (item.location) {
      row += `\t|${item.location.tz || ''}`;
    }

    data.push(row);
  }

  try {
    let filepath = path.resolve(_dirname_, `./${filename}.db`);

    fs.writeFileSync(filepath, `${data.join('\n')}\n`, {flag: append? 'a':'w', encoding: 'utf-8'});
  } catch (err) {
    throw Error(`there was an error writing the dict for data.db\n ${err}`);
  }
}




function initDictionary(dirname, filename='origin') {
  const dbPath = path.resolve(dirname, `./${filename}.list`);
  var dictionary = {};

  ensureDirectory(dbPath);

  if(fs.existsSync(dbPath)) {
    let data = fs.readFileSync(dbPath, 'utf-8') || '';
    data = data.split('\n').filter(p => p).map(v => {
      const f = v.split('\t|');

      return ({[f[0]]: {
        mtime: parseInt(f[1]),
        processed: f[2]? new Date(f[2]) : null,
      }});
    });

    dictionary = Object.assign({}, ...data);
  } else {
    fs.writeFileSync(dbPath, '', {flag: 'w', encoding: 'utf-8'});
  }

  // _dirname_ = dirname;

  return dictionary;
}

function saveDictionary(dictionary = {}, filename='origin', append=false) {
  var keys = Object.keys(dictionary);
  var data = [];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const item = dictionary[key];
    var row = `${key}\t|${item.mtime || ''}` + 
                `\t|${item.processed || ''}`;

    data.push(row);
  }

  try {
    let filepath = path.resolve(_dirname_, `./${filename}.list`);

    fs.writeFileSync(filepath, `${data.join('\n')}\n`, {flag: append? 'a':'w', encoding: 'utf-8'});
  } catch (err) {
    throw Error(`there was an error writing the dict for ${filename}\n ${err}`);
  }
}

function addDictionary(dictionary = {}, filename='db') {
  saveDictionary(dictionary, filename, true);
}

function remove(dirname, filename, ext='list') {
  const dbPath = path.resolve(dirname, `./${filename}.${ext}`);

  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath);
  }
}

module.exports = {
  loadDB: loadDB,
  saveDB: saveDB,
  init: initDictionary,
  append: addDictionary,
  save: saveDictionary,
  remove: remove
};