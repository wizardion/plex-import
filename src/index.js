'use strict';

const path = require('path');
const configs = require('../configs');
const logger = require('./logger');
const yellow = '\x1b[33m%s\x1b[0m';

const users = configs.users;
const tasks = configs.tasks;
const _task_ = 'tasks';

users.forEach(user => {
  try {
    logger.log(_task_, `Started process for: ${user.name}`);

    for (let i = 0; i < tasks.length; i++) {
      const task = require(path.resolve(__dirname, './tasks', tasks[i]));
    
      logger.log(_task_, `Started task: ${task.name}`);
      task.init(user);
      task.exec();
    }

    logger.log(_task_, `Done!`);
  } catch (error) {
    logger.error(_task_, error.message);
    return;
  }
});  




// // const plex = require('./plex.js');
// const exif = require('./exif');

// // configs.users.forEach(user => {
// //   plex.getBinItems(user.token).then(result => {
// //     if (result.status === -1) {
// //       return plex.createBin(user.token).catch(er => console.warn(er)).then(() => console.log('Created new.'));
// //     }
  
// //     if (result.status === 200) {    
// //       console.log('result', result);
// //     }
// //   }).catch(err => console.warn(err));
// // });

// try {
//   // replace edited...
//   exif.import();
// } catch (error) {
//   console.log('\n-------------------------------');
//   console.error(yellow, 'ERROR', error);
//   process.exit(-1);
// }
