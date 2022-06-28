'use strict';

const fs = require('fs');
const path = require('path');
const configs = require('../configs');

var _dirname_ = null;


function initDictionary(dirname, filename='db') {
  const dbPath = path.resolve(dirname, `./${filename}.list`);
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
      return ({[f[0]]: {
        mtime: parseInt(f[1]),
        processed: f[2]? parseInt(f[2]) : null,
        target: f[3],
      }});
    });

    dictionary = Object.assign({}, ...data);
  }

  _dirname_ = dirname;

  return dictionary;
}

function saveDictionary(dictionary = {}, filename='db', append=false) {
  var keys = Object.keys(dictionary);
  var data = [];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const item = dictionary[key];
    
    data.push(`${key}\t|${item.mtime || ''}\t|${item.processed || ''}\t|${item.target || ''}`);
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

function remove(dirname, filename) {
  const dbPath = path.resolve(dirname, `./${filename}.list`);

  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath);
  }
}

module.exports = {
  init: initDictionary,
  append: addDictionary,
  save: saveDictionary,
  remove: remove
};