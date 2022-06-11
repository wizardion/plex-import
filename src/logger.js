'use strict';

const fs = require('fs');
const path = require('path');
const configs = require('../configs');
const yellow = '\x1b[33m%s\x1b[0m';

const logfile = path.resolve(configs.tmpdir, 'logs.log');

function init() {
  const exists = fs.existsSync(logfile);
  const directory = path.dirname(logfile);

  if(!fs.existsSync(directory)) {
    fs.mkdirSync(directory, {recursive: true});
  }

  if (!exists || (fs.existsSync(logfile) && needToUpdate(logfile))) {
    fs.writeFileSync(logfile, '', {flag: 'w', encoding: 'utf-8'});
  } else {
    fs.writeFileSync(logfile, '\n', {flag: 'a', encoding: 'utf-8'});
  }
}

function needToUpdate(filepath) {
  const stats = loadStats(filepath) || {};
  var date = new Date();

  date.setDate(date.getDate() - configs.logger.days);
  if (stats && stats.mtime && date < new Date(stats.mtime)) {
    return false;
  }

  return true;
}

function loadStats(filepath) {
  const stats = fs.statSync(filepath, {throwIfNoEntry: true});
  return {
    atime: new Date(stats.atime).getTime(),
    mtime: new Date(stats.mtime).getTime(),
    ctime: new Date(stats.ctime).getTime(),
  };
}

function checkParameters(task, message) {
  if (!task) {
    throw Error(`!Task name is reuired`);
  }

  if (!message) {
    throw Error(`!Message name is reuired`);
  }
}

function save(task, message, level='Info') {
  try {
    var data = `[${new Date().toISOString()}]:[${task}]:[${level}]\t- ${message}`;

    if (configs.logger.level === configs.logger.levels.console) {
      console.log(level !== 'Info'? yellow : '', data);
    }

    fs.writeFileSync(logfile, `${data}\n`, {flag: 'a', encoding: 'utf-8'});
  } catch (err) {
    throw Error(`there was an error writing the dict for ${task}\n ${err}`);
  }
}

function log(task, message) {
  checkParameters(task, message);
  save(task, message);
}

function error(task, message) {
  checkParameters(task, message);
  save(task, message, 'Error');
}

init();

module.exports = {
  log: log,
  error: error
};