'use strict';

const db = require('../lib/db');
const path = require('path');
const base = require('./base');
const logger = require('../logger');
const Prism = require('../lib/photoprism');


base.name = 'data-analysis';
base.exec = async function exec() {
  const session = db.init(base.user.locations.tmp, 'session');
  const client = new Prism(base.user.locations.photoprism.host, 100);
  const keys = Object.keys(session);
  const data = {};

  await client.login(base.user.locations.photoprism.username, base.user.locations.photoprism.password);

  for (let i = 0; i < keys.length; i++) {
    const file = keys[i];
    const uid = getUID(file);

    try {
      if (!data[uid]) {
        const response = await client.search(`filename:"${file}*"`);

        if (response && response.length) {
          let item = await client.get(response[0].UID);
          let bundles = item.Files.filter(f => f.Root !== 'sidecar');

          for (let j = 0; j < bundles.length; j++) {
            let bundle = bundles[j];
            delete session[bundle.Name];
          }

          data[uid] = getItemDetails(item);
        } else {
          logger.log(base.name, `file not found "${file}", seems skipped or yml...`);
        }
      }
    } catch (error) {
      logger.error(base.name, error.stack || error);
    }
  }

  let orphans = Object.keys(session);
  if (orphans.length) {
    logger.log(base.name, `found orphans ${orphans.length};`);
    db.save(Object.assign({}, db.init(base.user.locations.tmp, 'orphans'), session), 'orphans');    
  }

  db.saveDB(data, 'session');
  return Object.keys(session).length > 0;
};

function getUID(key) {
  const dirname = path.dirname(key);
  return `${dirname !== '.'? `${dirname}/` : ''}${path.basename(key, path.extname(key))}`;
}

function getItemDetails(item) {
  const taken = convertTZ(new Date(item.TakenAt), 'America/New_York');

  // TODO patch to fix issue with photoprism.
  if (item.Type === 'video' && item.Files.find(f => f.Mime === 'image/heif')) {
    item.Type = 'live';
  }

  const primary = getPrimary(item);

  return {
    id: item.UID,
    taken: taken,
    target: `${path.dirname(primary.Name)}/${item.Name}.${primary.FileType}`,
    source: {
      type: primary.Root === 'sidecar'? base.locationTypes.PHOTOPRISM : base.locationTypes.ORIGINAL,
      path: primary.Name
    },
    type: item.Type,
    title: item.Title,
    files: item.Files.map(m => m.Name),
    tags: loadTags(item),
    favorite: item.Favorite,
    location: {
      tz: item.TimeZone,
    },
  };
}

function getPrimary(item) {
  var isVideo = item.Type !== 'video';
  var files = item.Files;
  var result = isVideo? files.find(f => f.Primary) : files.find(f => f.MediaType === 'video' && f.Root !== 'sidecar');

  if (!result) {
    throw Error('Primary not found!');
  }

  return result;
}

function convertTZ(date, tzString) {
  return new Date((typeof date === 'string' ? new Date(date) : date).toLocaleString('en-US', {timeZone: tzString}));   
}

function loadTags(data) {
  const raw = (data.Details && data.Details.Keywords || '');
  const tags = raw.split(',').map(t => t.trim());
  const dict = {};

  tags.forEach(tag => dict[tag] = true);

  return Object.keys(dict);
}

// const sourceTypes = {
//   live: {
//     get: (file) => {
//       //TODO check mime type by file-type: {ext: 'jpg', mime: 'image/jpeg'}
//       if (!path.extname(file).match(/\.mov$/i)) {
//         let jpg = path.resolve(base.user.locations.photoprism.sidecar, `${file}.jpg`);
//         let jpeg = path.resolve(base.user.locations.photoprism.sidecar, `${file}.jpeg`);
  
//         return fs.existsSync(jpg)? jpg : fs.existsSync(jpeg)? jpeg : null;
//       }
//     }
//   },
//   image: {
//     get: (file) => {
//       let source = path.resolve(base.user.locations.originals, file);

//       if (!file.match(/\.jpe?g$/i)) {
//         let jpg = path.resolve(base.user.locations.photoprism.sidecar, `${file}.jpg`);
//         let jpeg = path.resolve(base.user.locations.photoprism.sidecar, `${file}.jpeg`);

//         return fs.existsSync(jpg)? jpg : fs.existsSync(jpeg)? jpeg : null;
//       }

//       return fs.existsSync(source) && source;
//     }
//   },
//   video: {
//     get: (file) => {
//       let source = path.resolve(base.user.locations.originals, file);
//       return fs.existsSync(source) && source;
//     }
//   },
// };

// base.exec23 = async function exec() {
//   const photoprism = base.user.locations.photoprism;
//   const files = db.init(base.user.locations.tmp, 'process');
//   // const processingData = await loadMediaData(files);
//   /*const processingData = loadYmlData(files);
//   const keys = Object.keys(processingData);

//   if (keys.length) {
//     const prism = new Prism(photoprism.host);
//     await prism.login(photoprism.username, photoprism.password);

//     for (let i = 0; i < keys.length; i++) {
//       const yml = processingData[keys[i]];
//       const item = await prism.get(yml.id);

//       // TODO patch to fix issue with photoprism.
//       if (yml.type === 'video' && item.Files.find(f => f.Mime === 'image/heif')) {
//         yml.type = 'live';
//       }

//       if (yml.type !== 'video') {
//         const primary = item.Files.find(f => f.Primary);

//         yml.target = `${path.dirname(primary.Name)}/${item.Name}.${primary.FileType}`;
//         yml.source = {
//           type: primary.Root === 'sidecar'? base.locationTypes.PHOTOPRISM : base.locationTypes.ORIGINAL, 
//           path: primary.Name
//         };
//       }
      
//       yml.files = item.Files.map(m => m.Name);
//       yml.title = item.Title;
//     }
//   }

//   var dict = {};

//   Object.keys(processingData).forEach(key => {
//     if (processingData[key].type === 'video') {
//       dict[key] = processingData[key];
//     }
//   });

//   // Search orphans
//   searchOrphans(files, processingData);
//   db.saveDB(processingData, 'process');*/
//   return false;
// };

// async function loadMediaData2(files) {
//   const photoprism = base.user.locations.photoprism;
//   const client = new Prism(photoprism.host);

//   await client.login(photoprism.username, photoprism.password);

//   // var response = await client.search('filename:Test-Upl/IMG_5420_103642.heic*');
//   var response = await client.search('filename:Test-Upl/IMG_4593_065602.mov*');

//   console.log('response', response);
//   console.log('length', response.length);
//   console.log('-----------------------------------------------------------------------------------------------------\n');

//   await sleep(1500);

//   if (response.length) {
//     var data = await client.get(response[0].UID);
//     console.log('data', data);
//   }
// }

// function loadYmlData(files) {
//   const ymlData = {};

//   Object.keys(files).forEach(key => {
//     const uid = getUID(key);

//     if (!ymlData[uid]) {
//       const ymlpath = path.resolve(base.user.locations.photoprism.sidecar, key.replace(path.extname(key), '.yml'));

//       if (fs.existsSync(ymlpath)) {
//         const data = yaml.parse(fs.readFileSync(ymlpath, 'utf8'));
//         let taken = convertTZ(new Date(data.TakenAt), 'America/New_York');
  
//         ymlData[uid] = {
//           id: data.UID,
//           taken: taken,
//           target: data.Type === 'video'? key : null,
//           source: {
//             type: base.locationTypes.ORIGINAL, 
//             path: data.Type === 'video'? key : null
//           },
//           type: data.Type,
//           title: null,
//           // files: [key],
//           tags: loadTags(data),
//           location: {
//             tz: data.TimeZone,
//             alt: data.Altitude,
//             lat: data.Lat,
//             lng: data.Lng,
//           },
//         };
//       } else {
//         logger.log(base.name, `yml not found: ${ymlpath.replace(base.user.locations.photoprism.sidecar, '')}`);
//       }
//     } else {
//       // ymlData[uid].files.push(key);
//     }
//   });

//   return ymlData;
// }

// function searchOrphans(files, processingData) {
//   var orphans = {};
//   var originals = {};

//   Object.keys(files).forEach(key => {
//     originals[key] = {exists: false};
//   });

//   Object.keys(processingData).forEach(key => {
//     const processed = processingData[key].files;

//     processed.forEach(file => {
//       if (originals[file]) {
//         originals[file].exists = true;
//       }
//     });
//   });

//   Object.keys(originals).forEach(key => {
//     if (!originals[key].exists) {
//       const uid = getUID(key);

//       if (!orphans[uid]) {
//         orphans[uid] = [];
//       }

//       orphans[uid].push(key);
//     }
//   });

//   Object.keys(orphans).forEach(key => {
//     logger.error(base.name, `orphaned files: [${orphans[key]}]`);
//   });

//   // console.log('orphans', orphans);
//   // Object.keys(files).forEach(file => {
//   //   console.log('file', file);
//   // });

//   // Object.keys(files).forEach(key => {
//   //   const uid = getUID(key);

//   //   if (!group[uid]) {
//   //     group[uid] = [];
//   //   }

//   //   group[uid].push({file: key, processed: false});
//   // });
  
//   // Object.keys(group).forEach(key => {
//   //   const processed = processingData[key];
//   //   const origins = group[key];

//   //   if (processed) {
//   //     let found = origins.filter(d => {
//   //       let result = processed.files.find(f => f === d.file);
//   //       d.processed = result;
//   //       return result;
//   //     });

//   //     if (found.length !== origins.length) {
//   //       if (!orphans[key]) {
//   //         orphans[key] = [];
//   //       }

//   //       orphans[key] = [].concat(orphans[key], found.filter(d => !d.processed));
//   //     }
//   //   } else {
//   //     let lost =  origins.filter(d => !d.processed);

//   //     if (lost.length) {
//   //       if (!orphans[key]) {
//   //         orphans[key] = [];
//   //       }
  
//   //       orphans[key] = [].concat(orphans[key], lost);
//   //     }
//   //   }
//   // });
// }
// ---------------------------------------------------------------------------------------------------------------------
// function getFileData(files, yml) {
//   var source = {type: 0, path: null, ext: null};

//   // console.log('files', files, 'yml', yml);

//   files.forEach(file => {
//     if (file.Primary) {
//       source.path = file.Name;
//       source.type = file.Root === 'sidecar'? base.locationTypes.PHOTOPRISM : base.locationTypes.ORIGINAL;
//       // source.ext = file.FileType;
//     }

    
//   });

//   return {
//     source: source
//   };
// }

// function scanDirectory(location, dict, root='') {
//   const dirname = path.resolve(location, root);
//   const files = fs.readdirSync(dirname, {withFileTypes: true}).filter(f => f.name.match(/^[^.]/));

//   files.forEach(file => {
//     if (file.isDirectory()) {
//       return scanDirectory(location, dict, `${root}${file.name}/`);
//     }

//     if (file.isFile() && file.name.match(/\.yml$/i)) {
//       // let filename = `${root}${file.name}`;
//       // let key = `${root}${path.basename(file.name, path.extname(file.name))}`;
//       // let item = dict.old[key];

//       // if (!item) {
//       //   return (dict.new[key] = {});
//       // }

//       // dict.rest[key] = Object.assign({}, dict.old[key]);
//       // delete dict.old[key];
//     }
//   });

//   return root !== ''? null : dict;
// }

// function getMetaData(data, filename) {
//   const ymlpath = path.resolve(base.user.locations.photoprism.sidecar, filename.replace(path.extname(filename), '.yml'));

//   if (fs.existsSync(ymlpath)) {
//     let yml = yaml.parse(fs.readFileSync(ymlpath, 'utf8'));

//     if (yml.TakenAt) {
//       var source = sourceTypes[yml.Type] && sourceTypes[yml.Type].get(filename);

//       if (source) {
//         let target = path.basename(filename.replace(path.extname(filename), path.extname(source).toLowerCase()));
//         let taken = convertTZ(new Date(yml.TakenAt), 'America/New_York');

//         data.source = source;
//         data.target = target;
//         data.meta = {
//           taken: taken,
//           type: yml.Type,
//           title: yml.Title,
//           tags: loadTags(yml),
//           location: {
//             tz: yml.TimeZone,
//             alt: yml.Altitude,
//             lat: yml.Lat,
//             lng: yml.Lng,
//           },
//         };
//       }
//     }
//   }

//   return data;
// }

// function loadStats(filepath) {
//   const stats = fs.statSync(filepath, {throwIfNoEntry: true});

//   return {
//     mtime: new Date(stats.mtime).getTime(),
//     files: [],
//     processed: null,
//     source: null,
//     target: null,
//     meta: null
//   };
// }

// function equals(first = new Date(), second = new Date()) {
//   // console.log(yellow, {a: taken.toLocaleString(), b: modified.toLocaleString()});
//   // console.log(yellow, 'getFullYear: ', taken.getFullYear());
//   // console.log(yellow, 'getMonth: ', taken.getMonth());
//   // console.log(yellow, 'getDate: ', taken.getDate());
//   // console.log(yellow, 'getDay: ', taken.getDay());
//   // console.log(yellow, 'getHours: ', taken.getHours());
//   // console.log(yellow, 'getMinutes: ', taken.getMinutes());
//   // console.log(yellow, 'getSeconds: ', taken.getSeconds());

//   // return taken.getDate() === modified.getDate() && taken.getDay() === modified.getDay() && 
//   //        taken.getFullYear() === modified.getFullYear() && taken.getHours() === modified.getHours() &&
//   //        taken.getMonth() === modified.getMonth();
//   // if (t && taken.toLocaleString() !== modified.toLocaleString()) {
//   //   console.log(yellow, t, 'item: ', taken, '; stats: ', modified);
//   // }
//   return first.toLocaleString() === second.toLocaleString();
// }

// function getSourcePath(file, type) {
//   // return sourceTypes[type].get(file);

//   // let origin = path.resolve(base.user.locations.originals, key);

//   // if (type === 'live' && !!path.extname(key).match(/\.mov$/i)) {
//   //   return null;
//   // }

//   // if (type === 'image' || type === 'live') {
//   //   let jpg = path.resolve(base.user.locations.photoprism.sidecar, `${key}.jpg`);
//   //   let jpeg = path.resolve(base.user.locations.photoprism.sidecar, `${key}.jpeg`);

//   //   return fs.existsSync(jpg)? jpg : fs.existsSync(jpeg)? jpeg : origin;
//   // }

//   // return origin;
// }

// ---------------------------------------------------------------------------------------------------------------------
// function getTargetPath(file, source) {
//   return file.replace(path.extname(file), path.extname(source).toLowerCase());
// }

// function cleanUpUpdated(files) {
//   Object.keys(files).forEach(key => {
//     let jpg = path.resolve(base.user.locations.photoprism.sidecar, `${key}.jpg`);
//     let jpeg = path.resolve(base.user.locations.photoprism.sidecar, `${key}.jpeg`);
//     let source = fs.existsSync(jpg)? jpg : fs.existsSync(jpeg)? jpeg : null;
//     let target = getTargetPath(key, source || key);

//     if (source) {
//       fs.rmSync(source);
//     }

//     if (fs.existsSync(target)) {
//       fs.rmSync(target);
//     }
//   });
// }

// async function refreshPlex() {
//   // let client = plex.init(base.user.host, base.user.token);

//   // await client.refresh(base.user.token);
//   // await client.wait(base.user.token);
// }



module.exports = base.task();
