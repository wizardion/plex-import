// 'use strict';

// const fs = require('fs');
// const path = require('path');
// const yaml = require('yaml');
// const db = require('./db');
// const configs = require('../configs');
// const glob = require('glob');
// const { match } = require('assert');
// const yellow = '\x1b[33m%s\x1b[0m';


// function sync(){
//   var files = scanOriginals({old: db.init('alex'), new: {}, rest: {}, update: {}});
//   // console.log(yellow, '\ndict', JSON.parse(JSON.stringify(files)));

//   // importFiles(files.new);
//   // importFiles2(files.new);
//   importFiles3(files.new);
//   cleanUp(files);
  
//   // console.log(yellow, 'save: ', [].concat(files.rest, files.new));
//   // db.save(dict);
// }

// function scanOriginals(dict, root='.') {
//   const dirname = path.resolve(configs.locations.originals, root);
//   const files = fs.readdirSync(dirname, {withFileTypes: true}).filter(f => f.name.match(/^[^.]/));

//   files.forEach(file => {
//     if (file.isDirectory()) {
//       return scanOriginals(dict, `${root}/${file.name}`);
//     }

//     if (file.isFile()) {
//       let key = `${root}/${file.name}`;
//       let exists = dict.old[key];

//       if (!exists) {
//         return (dict.new[key] = true);
//       }

//       if (isUpdated(key)) {
//         return (dict.update[key] = true);
//       }

//       dict.rest[key] = true;
//       delete dict.old[key];
//     }
//   });

//   return root !== '.'? null : {
//     old: Object.keys(dict.old),
//     new: Object.keys(dict.new),
//     rest: Object.keys(dict.rest),
//     update: Object.keys(dict.update),
//   };
// }

// function isUpdated(file) {
//   return false;
// }

// function importFiles3(files = []) {
//   const NS_PER_SEC = 1e9;
//   var time = process.hrtime();
//   var ar = new Array(1).fill(0); //Took: 38,353 milliseconds.


//   files.forEach(file => {
//     const filename = path.basename(file, path.extname(file));
//     const dirname = path.resolve(configs.locations.photoprism, path.dirname(file));
    


//     console.log('file: ', file, fs.existsSync(path.resolve(dirname, `${filename}.yml`)));
//     // console.log('file: ', );
//   });

//   var diff = process.hrtime(time);
//   console.log(`Took: ${Math.round((diff[0] * NS_PER_SEC + diff[1]) / 1000000)} milliseconds.`);
//   console.log('----------------------------------------------------------------');
// }

// function importFiles(files = []) {
//   const NS_PER_SEC = 1e9;
//   var time = process.hrtime();
//   var ar = new Array(1).fill(0); //Took: 38353 milliseconds.
//   // var ar = new Array(1000000).fill(0); //Took: 38,353 milliseconds.

//   const dict = {};

//   // var f = fs.readdirSync();

//   ar.forEach(a => {
//     files.forEach(file => {
//       const key = path.dirname(file);
//       const dirnmae = path.resolve(configs.locations.photoprism, path.dirname(file));
//       const filename = path.basename(file, path.extname(file));
//       // console.log('file', path.dirname(file));

//       if (!dict[key]) {
//         dict[key] = fs.readdirSync(dirnmae, {withFileTypes: true}).filter(f => f.isFile() && f.name.match(/^[^.]/)).map(f => f.name);
//       }

//       const converted = dict[key].filter(f => f.indexOf(filename) >= 0).map(f => path.resolve(dirnmae, f));

//       console.log(file, '- found', converted);
//     });
//   });

//   var diff = process.hrtime(time);
//   console.log(`Took: ${Math.round((diff[0] * NS_PER_SEC + diff[1]) / 1000000)} milliseconds.`);
//   console.log('----------------------------------------------------------------');
// }

// function importFiles2(files = []) {
//   const NS_PER_SEC = 1e9;
//   var time = process.hrtime();
//   var ar = new Array(1).fill(0); //Took: 38,353 milliseconds.
//   // var ar = new Array(1000000).fill(0); //Took: 38,353 milliseconds.

//   ar.forEach(a => {
//     files.forEach(file => {
//       // const filepath = path.resolve(configs.locations.originals, file);
//       const pattern = path.resolve(configs.locations.photoprism, path.dirname(file), path.basename(file, path.extname(file)));
//       const converted = glob.sync(pattern + '**');
  
//       console.log(file, '- found', converted);
      
//       // console.log(gl, glob.sync(gl));
//       // console.log(photoprism);
//       // console.log('file:', photoprism);
//       // console.log(path.basename(file), 'exists', fs.existsSync(photoprism + '.jpg'));
  
//       // const urlYml = path.resolve(_dir_, file.name.replace(/\.\w+$/gi, '.yml'));
//       // const data = yaml.parse(fs.readFileSync(urlYml, 'utf8'));
  
//       // var date = new Date(data['TakenAt']);
//       // fs.utimesSync(url, date, date);
  
//       // console.log(yellow, url, data['TakenAt']);
//     });
//   });
  

//   var diff = process.hrtime(time);
//   console.log(`Took: ${Math.round((diff[0] * NS_PER_SEC + diff[1]) / 1000000)} milliseconds.`);
//   console.log('----------------------------------------------------------------');
// }

// function cleanUp(dict) {
//   const old = Object.keys(dict.old);

//   for (let i = 0; i < old.length; i++) {
//     const item = old[i];

//   }

//   // ... check if files exists in carside and remove it.
// }

// /* 

// const ut = require('utimes');
// ut.utimesSync(_dir_ + file.name, time);

// const ExifImage = require('exif').ExifImage;

// new ExifImage({
//   image: _dir_ + file.name
// }, function(error, exif) {
//     if (error) {
//         console.error(error);
//         return;
//     }
//     processFile(file, exif);
// });


// function processFile(file, exif) {

//   var date = resolveDate(exif),
//       timestamp;

//   if (date == null) {
//       console.error('Date not resolved', file.uri.toString());
//       return;
//   }

//   timestamp = +date / 1000 | 0;

//   try {
//       fs.utimesSync(file.uri.toLocalFile(), timestamp, timestamp);
//   } catch (error) {
//       console.error(error.toString(), 'timestamp', timestamp);
//       return;
//   }

//   console.log(color('green{Changed - }'), file.uri.file, '-', date.toString());
// }


// function resolveDate(exif) {
//   var dateMeta = ruqq.arr.first(exif.image, 'tagName', '==', 'DateTime'),
//       string = dateMeta.value,
//       date = new Date(string);

//   if (!isNaN(date)) {
//       return date;
//   }

//   // (CANON) - 2012:12:16 23:03:01
//   string = string.replace(/([\d]{4})[^\s]([\d]+)[^\s]([\d]+)/, function(full, num1, num2, num3) {
//       return Array.prototype.slice.call(arguments, 1, 4).join('-');
//   });

//   date = new Date(string);

//   if (!isNaN(date)) {
//       return date;
//   }

//   return null;
// } */


// module.exports = {
//   import: sync,
// };
