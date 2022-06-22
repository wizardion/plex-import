'use strict';

const path = require('path');
const configs = require('../configs');
const logger = require('./logger');
const yellow = '\x1b[33m%s\x1b[0m';

const users = configs.users;
const tasks = configs.tasks;
const _task_ = 'tasks';

const env = {
  clean: process.env.npm_config_clean === 'all'? true : false,
  force: process.env.npm_config_clean === 'plex' || process.env.npm_config_clean === 'all'? true : false,
};


function syncMedia(){
  return new Promise(async function(resolve){
    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      try {
        user.clean = env.clean;
        user.force = env.force;
        logger.log(_task_, `Started process for: ${user.name}${env.force? ' - forced;' : ''}`);

        for (let i = 0; i < tasks.length; i++) {
          const task = require(path.resolve(__dirname, './tasks', tasks[i]));
      
          task.init(user, {tmp: configs.tmpdir});
          logger.log(_task_, `Started task: ${task.name}`);

          if (!await task.exec()) {
            logger.log(_task_, `No need to processed`);
            break;
          }
        }
      } catch (error) {
        logger.error(_task_, error.stack);
      }
    }
    
    resolve(`Done!`);
  });
}

syncMedia().then(test => console.log(`\n${test}`));
