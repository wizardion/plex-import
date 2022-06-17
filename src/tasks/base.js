'use strict';

const _config_ = {
  user: {
    name: null, 
    token: null, 
    locations: {
      originals: null,
      photoprism: null,
      plex: null,
      db: null,
    },
    clean: false,
    force: false,
    tmp: null
  },
  name: null,
  init: () => {},
  exec: () => {},
  task: task
};

function init(user, conf) {
  if(!user) {
   throw Error('User is not set!');
  }

  _config_.user = Object.assign({}, user, conf);
  _config_.init();
}

async function exec() {
  if(!_config_.user) {
    throw Error('User is not set!');
  }

  return _config_.exec();
}

function task() {
  return {
    init: init,
    exec: exec,
    name: _config_.name
  };
}


module.exports = _config_;
// module.exports = {
//   init: init,
//   exec: exec,
//   name: 'base'
// };