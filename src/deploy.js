'use strict';

const yellow = '\x1b[33m%s\x1b[0m';
const path = require('path');
const fs = require('fs');
const scp = require('node-scp');
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const __root = path.resolve(__dirname, '../');
const __remote = '/home/alex/scripts';
const __ignore = ['node_modules', 'configs.js'];

const env = {
  port:  process.env.npm_config_port || 22,
  host:  process.env.npm_config_host,
  username:  process.env.npm_config_user,
  password:  process.env.npm_config_password,
};

async function deploy() {
  const client = await scp.Client({
    host: env.host,
    port: 22,
    username: env.username,
    password: env.password,
    readyTimeout: 1000
  });


  try {
    var remote = await scanRemoteFiles(client);
    var files = scanLocalFiles();

    await cleanUp(client, remote);
    await upload(client, files);
    
    console.log('\ndeploy is completed');
  } catch (e) {
    console.log(e);
  }

  client.close();
}

async function upload(client, data) {
  const keys = Object.keys(data);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const file = data[key];
    const filepath = path.resolve(__root, key);
    const remote = path.resolve(__remote, key);

    if(file.dir) {
      await client.mkdir(remote);
    } else {
      console.log(yellow, 'uploading file:', key);
      await client.uploadFile(filepath, remote);
    }
  }
}

async function cleanUp(client, data) {
  for (let i = 0; i < data.files.length; i++) {
    const filepath = path.resolve(__remote, data.files[i]);
    
    console.log(yellow, 'removed file:', filepath, {t: data.files[i]});
    await client.unlink(filepath);
  }

  for (let i = 0; i < data.directories.length; i++) {
    const dirpath = path.resolve(__remote, data.directories[i]);
    
    console.log(yellow, 'removed directory:', dirpath, {t: data.directories[i]});
    await client.rmdir(dirpath);
  }
}

async function scanRemoteFiles(client, dict={}, root='.') {
  const files = await client.list(path.resolve(__remote, root));
  var folders = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ignored = __ignore.indexOf(file.name) >= 0;

    if (!ignored) {
      if (file.type === 'd') {
        folders.push(`${root}/${file.name}`);
        folders = folders.concat(await scanRemoteFiles(client, dict, `${root}/${file.name}`));
      } else {
        let key = `${root}/${file.name}`;
        let item = dict[key];
  
        if (!item) {
          dict[key] = true;
        }
      }
    }
  }

  return root !== '.'? folders : {
    files: Object.keys(dict),
    directories: folders.sort((a, b) => b.length - a.length)
  };// [].concat(Object.keys(dict), folders.sort((a, b) => b.length - a.length));
}

function scanLocalFiles(dict={}, root='.') {
  const dirname = path.resolve(__root, root);
  const files = fs.readdirSync(dirname, {withFileTypes: true}).filter(f => f.name.match(/^[^.]/));

  files.forEach(file => {
    const ignored = __ignore.indexOf(file.name) >= 0;

    if (!ignored) {
      let key = `${root}/${file.name}`;

      if (file.isDirectory()) {
        dict[key] = {dir: true};
        return scanLocalFiles(dict, `${root}/${file.name}`);
      }
  
      if (file.isFile()) {
        let item = dict[key];
  
        if (!item) {
          return (dict[key] = {dir: false});
        }
      }
    }
  });

  return root !== '.'? null : dict;
}

rl.question('Please confirm that process (Y/N): ', async function (answer) {
  if (!!answer.match(/(y|yes)$/gi)) {
    await deploy();
  }

  rl.close();
});

rl.on('close', function () {
  process.exit(0);
});