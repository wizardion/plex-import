'use strict';

const path = require('path');
const configs = require('../configs');
const logger = require('./logger');
const yellow = '\x1b[33m%s\x1b[0m';

const users = configs.users;
const tasks = configs.tasks;
const _task_ = 'tasks';


function syncMedia(){
  return new Promise(async function(resolve){
    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      try {
        logger.log(_task_, `Started process for: ${user.name}`);

        for (let i = 0; i < tasks.length; i++) {
          const task = require(path.resolve(__dirname, './tasks', tasks[i]));
      
          task.init(user);
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
