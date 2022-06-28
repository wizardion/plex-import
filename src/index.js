'use strict';

const path = require('path');
const configs = require('../configs');
const logger = require('./logger');
const yellow = '\x1b[33m%s\x1b[0m';

const users = configs.users;
const tasks = configs.sync;
const _task_ = 'tasks';

const env = {
  clean: process.env.npm_config_clean === 'all'? true : false,
  force: process.env.npm_config_clean === 'plex' || process.env.npm_config_clean === 'all'? true : false,
};


function syncMedia() {
  return new Promise(async function(resolve){
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const results = {};

      user.force.plex = env.force;
      user.force.prism = env.clean;

      try {
        logger.init(user.locations.tmp);
        logger.log(_task_, `Started process for: ${user.name}${env.force? ' - forced;' : ''}`);

        for (let i = 0; i < tasks.length; i++) {
          const item = tasks[i];

          if (!item.depends || (item.depends instanceof(Array)? item.depends.find(i => results[i]) : results[item.depends])) {            
            const task = require(path.resolve(__dirname, './tasks', item.name));
      
            task.init(user, {tmp: configs.tmpdir});
            logger.log(_task_, `Started task: ${task.name}`);

            results[item.name] = await task.exec();
          }
        }
      } catch (error) {
        logger.error(_task_, error && error.stack || error && error.message || error || 'Unknown error');
      }
    }
    
    resolve(`Done!`);
  });
}

syncMedia().then(test => console.log(`\n${test}`));
