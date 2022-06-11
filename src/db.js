'use strict';

const fs = require('fs');
const path = require('path');
const configs = require('../configs');

var _name_ = null;


function initDictionary(name, filename='') {
  const dbPath = path.resolve(configs.tmpdir, `./${filename}${name}.list`);
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

function saveDictionary(dictionary = {}, filename='', append=false) {
  var keys = Object.keys(dictionary);
  var data = [];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const item = dictionary[key];
    
    data.push(`${key}\t|${item.mtime}\t|${item.processed || ''}`);
  }

  try {
    let filepath = path.resolve(configs.tmpdir, `./${filename}${_name_}.list`);

    fs.writeFileSync(filepath, `${data.join('\n')}\n`, {flag: append? 'a':'w', encoding: 'utf-8'});
  } catch (err) {
    throw Error(`there was an error writing the dict for ${_name_}\n ${err}`);
  }
}

function addDictionary(dictionary = {}, filename='') {
  saveDictionary(dictionary, filename, true);
}

function remove(name, filename='') {
  const dbPath = path.resolve(configs.tmpdir, `./${filename}${name}.list`);

  fs.rmSync(dbPath);
}

module.exports = {
  init: initDictionary,
  append: addDictionary,
  save: saveDictionary,
  remove: remove
};