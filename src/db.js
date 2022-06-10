'use strict';

const fs = require('fs');
const path = require('path');
const configs = require('../configs');

var _name_ = null;


function initDictionary(name) {
  const dbPath = path.resolve(configs.tmpdir, `./${name}.list`);
  const dbDirectory = path.dirname(dbPath);
  var dictionary = {};

  if(!fs.existsSync(dbDirectory)) {
    fs.mkdirSync(dbDirectory, {recursive: true});
  }

  if(!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, '', {flag: 'w', encoding: 'utf-8'});
  } else {
    let data = fs.readFileSync(dbPath, 'utf-8') || '';
    data = data.split('\n').filter(p => p).map(v => {
      const f = v.split('\t|');
      return ({[f[0]]: {mtime: parseInt(f[1]), processed: f[2]? parseInt(f[2]) : null}});
    });

    dictionary = Object.assign({}, ...data);
  }

  _name_ = name;

  return dictionary;
}

function saveDictionary(dictionary = {}) {
  var keys = Object.keys(dictionary);
  var data = [];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const item = dictionary[key];
    
    data.push(`${key}\t|${item.mtime}\t|${item.processed || ''}`);
  }

  try {
    fs.writeFileSync(path.resolve(configs.tmpdir, `./${_name_}.list`), data.join('\n'), {flag: 'w', encoding: 'utf-8'});
  } catch (err) {
    throw Error(`there was an error writing the dict for ${_name_}\n ${err}`);
  }

  _name_ = null;
}

module.exports = {
  init: initDictionary,
  save: saveDictionary
};