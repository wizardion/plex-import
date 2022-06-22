'use strict';

const PlexAPI = require('plex-api');
const logger = require('./logger');

const yellow = '\x1b[33m%s\x1b[0m';
const bin = 'Deleted2';
const __name = 'plex';
const base = {client: null, path: null};
const __types = {
  'movie': 1, 'show': 2, 'season': 3, 'episode': 4, 'trailer': 5, 'comic': 6, 'person': 7,
  'artist': 8, 'album': 9, 'track': 10, 'picture': 11, 'clip': 12, 'photo': 13, 'photoalbum': 14,
  'playlist': 15, 'playlistFolder': 16, 'collection': 18, 'optimizedVersion': 42, 'userPlaylistItem': 1001
};


function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getClient(host, token) {
  return new PlexAPI({
		hostname: host,
    token: token,
		options: {
			identifier: '3310aea3-e282-4f99-adf1-69c6e17d533c',
			product: 'Plex Web',
			version: '1.0',
			deviceName: 'Node.js App',
			platform: 'Chrome',
			platformVersion: '100',
			// device: 'iPhone'
		}
	});
}

base.getDirectories = function() {
  return new Promise((resolve, reject) => {
    base.client.find('/library/sections', {type: 'photo'}).then((response) => {
      resolve(response.filter(d => !!d.Location.find(l => l.path === base.path)));
    }, reject);
  });
};

base.check = function() {
  return new Promise(async (resolve, reject) => {
    try {
      const directories = await base.getDirectories();

      directories.forEach(directory => {
        if (directory.refreshing === true) {
          return resolve(true);
        }
      });

      resolve(false);
    } catch (error) {
      reject(error);
    }
  });
};

base.refresh = function() {
  return new Promise(async (resolve, reject) => {
    try {
      const directories = await base.getDirectories();

      for (let i = 0; i < directories.length; i++) {
        const directory = directories[i];

        if (directory.type === 'photo') {
          await base.client.perform(`/library/sections/${directory.key}/refresh?force=1`);
          await base.wait();
          await base.client.perform(`/library/sections/${directory.key}/emptyTrash`);
          await base.client.perform(`/library/optimize`);
          await base.client.perform(`/library/clean/bundles?async=1`);
        }
      }

      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

base.wait = function() {
  return new Promise(async (resolve, reject) => {
    try {
      var count = 2;
      var refreshing = true;

      while (refreshing === true) {
        count--;
        refreshing = await base.check();
        logger.log(__name, `plex is refreshing: ${refreshing}`);
        await sleep(10000);

        if (count > 0) {
          refreshing = true;
        }
      }

      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

base.find = function(filepath) {
  return new Promise(async (resolve, reject) => {
    try {
      const directories = await base.getDirectories();

      for (let index = 0; index < directories.length; index++) {
        const directory = directories[index];
        const location = directory.Location[0];
        const response = await base.client.query(encodeURI(`/library/sections/${directory.key}/all?file=${filepath}`));
        const list = response && response.MediaContainer && response.MediaContainer.Metadata || [];

        for (let i = 0; i < list.length; i++) {
          const data = list[i];
          const media = data.Media || [];

          for (let j = 0; j < media.length; j++) {
            const item = media[j];
            const parts =item.Part || [];

            for (let k = 0; k < parts.length; k++) {
              const container = parts[k];

              if (filepath === container.file) {
                let key = container.file.replace(location.path, '.');

                return resolve({
                  id: data.ratingKey,
                  path: key,
                  key: data.key,
                  type: data.type,
                  title: data.title,
                  summary: data.summary,
                  section: {
                    key: directory.key
                  }
                });
              }
            }
          }
        }
      }

      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

base.tagMedia = function(tags) {
  // const files = Object.keys(tags).map(k => tags[k].target);
  // const files = Object.keys(tags).map(k => tags[k].target.replace('/home/alex/pictures/', ''));
  const files = ['/pictures/IMG_4665.jpeg'];

  return new Promise(async (resolve, reject) => {
    try {
      for (let i = 0; i < files.length; i++) {
        await sleep(500);
        const item = await base.find(files[i]);

        if (item) {
          await sleep(500);
          base.update(item, tags[item.path]);
          logger.log(__name, `tagged: ${i} - ${item.path} of total: ${files.length}`);
        } else {
          logger.error(__name, `NO FILE: ${files[i]}`);
        }
      }

      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

function formateDate(d) {
return d.getFullYear().toString()+'-' + 
  ((d.getMonth()+1).toString().length==2?(d.getMonth()+1).toString():'0' +
  (d.getMonth()+1).toString()) + '-' + (d.getDate().toString().length==2?d.getDate().toString():'0' +
  d.getDate().toString())+ ' ' + 
  (d.getHours().toString().length==2?d.getHours().toString(): '0' +
  d.getHours().toString())+':'+((parseInt(d.getMinutes()/5)*5).toString().length==2? 
    (parseInt(d.getMinutes()/5)*5).toString():'0'+(parseInt(d.getMinutes()/5)*5).toString())+':00';
}

base.update = function(file, media) {
  return new Promise(async (resolve, reject) => {
    try {
      var params = `type=${__types[file.type]}&id=${file.id}&summary.value=${media.title}&includeExternalMedia=1`;
      params += `&originallyAvailableAt.value=${formateDate(media.taken)}&originallyAvailableAt.locked=1`;

      await base.client.putQuery(encodeURI(`/library/sections/${file.section.key}/all?${params}`));
      await sleep(100);

      params = `type=${__types[file.type]}&id=${file.id}`;

      for (let i = 0; i < media.tags.length; i++) {
        const tag = media.tags[i];
        
        params += `&tag[${i}].tag.tag=${tag}`;
      }

      await base.client.putQuery(encodeURI(`/library/sections/${file.section.key}/all?${params}`));
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

function init(host, token, plexpath) {
  if (!token) {
    throw Error('Token is required!');
  }

  base.path = plexpath;
  base.client = getClient(host, token);
  return base;
}
// -----------------------------------------------


function getPlayList(client, name) {
  return new Promise((resolve, reject) => {
    client.query('/playlists').then((result) => {
      if (result && result.MediaContainer) {
        const data = (result.MediaContainer.Metadata || []);

        for (let i = 0; i < data.length; i++) {
          const element = data[i];
          
          console.log('playlist', element);
        }

        console.log('------------------------------------------------------');
        return resolve(data.find(item => item.type === 'playlist' && item.title === name));
      }

      reject('Data not found!');
    }, reject);
  });
}

function diffMinutes(dt2, dt1) {
	return Math.abs(Math.round(((dt2.getTime() - dt1.getTime()) / 1000) / 60));
}

function getBinItems(token) {
	// return new Promise((resolve, reject) => {
	// 	const client = getClient(token);
  //   const result = {
  //     updated: {date: null, minutesAgo: 0},
  //     status: -1,
  //     items: []
  //   };

  //   getPlayList(client, bin).catch(reject).then(playlist => {
  //     if (playlist) {
  //       result.updated.date = new Date(playlist.updatedAt * 1000);
  //       result.updated.minutesAgo = diffMinutes(new Date(), result.updated.date);
  //       result.status = 200;

  //       console.log('playlist', playlist);

  //       client.query(`/playlists/${playlist.ratingKey}/items`).then((content) => {
  //         const list = content && content.MediaContainer && content.MediaContainer.Metadata || [];

  //         list.forEach(media => media.Media.forEach(parts => parts.Part.forEach(file => result.items.push(file))));
  //         resolve(result);
  //       }, reject);
  //     } else {
  //       resolve(result);
  //     }
  //   });		
	// });
}

function createBin(token) {
  // return new Promise((resolve, reject) => {
  //   const client = getClient(token);
  //   const summary = 'Deleted items will be permanently removed after 30 days.';

  //   // client.postQuery(`/playlists?uri=&title=Deleted&summary=${summary}&smart=0&type=photo`).then((result) => {
  //   // client.postQuery(`/playlists?uri=&title=${bin}&summary=${summary}&smart=0&type=photo`).then((result) => {
  //   client.postQuery(`/playlists?uri=&title=${bin}&summary=${summary}&smart=0`).then((result) => {
  //     if (result && result.MediaContainer) {
  //       let ratingKey = (result.MediaContainer.Metadata || [])[0].ratingKey;

  //       console.log('result', result);
  //       console.log('MediaContainer', result.MediaContainer);

  //       // return client.putQuery(`/playlists/${ratingKey}?summary=${summary}`).then(()=> resolve(ratingKey), reject);
  //     }
      
  //     resolve();
  //   }, reject);
  // });
}

// function find(token, file) {
//   // var response = await client.query(`/library/sections/${directory.key}/all`);
//   return new Promise(async (resolve, reject) => {
//     try {
//       const result = {};
//       const client = getClient(token);
//       const directories = await getDirectories(token, client);

//       for (let i = 0; i < directories.length; i++) {
//         const directory = directories[i];

//         if (directory.type === 'photo') {
//           const location = directory.Location[0];
//           const response = await client.query(`/library/sections/${directory.key}/all?file=${file}`);
//           const list = ((response.MediaContainer || {Metadata: []}).Metadata || []);

//           for (let j = 0; j < list.length; j++) {
//             const item = list[j];
//             const media = item.Media || [];

//             for (let x = 0; x < media.length; x++) {
//               const m = media[x].Part || [];
              
//               for (let y = 0; y < m.length; y++) {
//                 const container = m[y];

//                 if (file === container.file) {
//                   let key = container.file.replace(location.path, '.');

//                   result[key] = {
//                     id: item.ratingKey,
//                     key: item.key,
//                     type: item.type,
//                     title: item.title,
//                     summary: item.summary,
//                   };
//                 }
//               }
//             }
//           }
//         }
//       }

//       resolve(result);
//     } catch (error) {
//       reject(error.stack);
//     }
//   });
// }

module.exports = {
  init: init,
  getBinItems: getBinItems,
  createBin: createBin,
};
