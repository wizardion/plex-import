'use strict';

const PlexAPI = require('plex-api');
const path = require('path');
const logger = require('./logger');

const yellow = '\x1b[33m%s\x1b[0m';
const _binname_ = 'Trash';
const __name = 'plex';
const __types = {
  'movie': 1, 'show': 2, 'season': 3, 'episode': 4, 'trailer': 5, 'comic': 6, 'person': 7,
  'artist': 8, 'album': 9, 'track': 10, 'picture': 11, 'clip': 12, 'photo': 13, 'photoalbum': 14,
  'playlist': 15, 'playlistFolder': 16, 'collection': 18, 'optimizedVersion': 42, 'userPlaylistItem': 1001
};

var _machineIdentifier_;


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

function diffMinutes(dt2, dt1) {
	return Math.abs(Math.round(((dt2.getTime() - dt1.getTime()) / 1000) / 60));
}

// TODO fix time
function formateDate(d) {
  return d.getFullYear().toString()+'-' + 
    ((d.getMonth()+1).toString().length==2?(d.getMonth()+1).toString():'0' +
    (d.getMonth()+1).toString()) + '-' + (d.getDate().toString().length==2?d.getDate().toString():'0' +
    d.getDate().toString())+ ' ' + 
    (d.getHours().toString().length==2?d.getHours().toString(): '0' +
    d.getHours().toString())+':'+((parseInt(d.getMinutes()/5)*5).toString().length==2? 
      (parseInt(d.getMinutes()/5)*5).toString():'0'+(parseInt(d.getMinutes()/5)*5).toString())+':00';
}

const base = {
  client: null,
  path: null,
  getDirectories: () => {
    return new Promise((resolve, reject) => {
      base.client.find('/library/sections', {type: 'photo'}).then((response) => {
        resolve(response.filter(d => !!d.Location.find(l => l.path === base.path)));
      }, reject);
    });
  },
  getPlayLists: () => {
    return new Promise((resolve, reject) => {
      base.client.query('/playlists', {type: 'playlist'}).then((response) => {
        resolve(response && response.MediaContainer && response.MediaContainer.Metadata || []);
      }, reject);
    });
  },
  createPlayList: (title, summary=null) => {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await base.client.postQuery(`/playlists?uri=&title=${title}&smart=0&type=photo`);
        const data = response && response.MediaContainer && response.MediaContainer.Metadata || [];
        const playlist = data.find(p => p.title == title && p.playlistType === 'photo');
  
        if (summary) {
          await base.client.putQuery(`/playlists/${playlist.ratingKey}?summary=${summary}`);
        }
        
        resolve(playlist);
      } catch (error) {
        reject(error);
      }    
    });
  },
  getBinItems: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const bin = (await base.getPlayLists() || []).find(p => p.title === _binname_ && p.playlistType === 'photo') || {};
        const response = await base.client.query(`/playlists/${bin.ratingKey}/items`);
        const items = response && response.MediaContainer && response.MediaContainer.Metadata || [];
        const result = {
          updated: {date: null, minutesAgo: 0},
          items: []
        };
  
        items.forEach(media => media.Media.forEach(parts => parts.Part.forEach(file => result.items.push(file))));
        result.updated.date = new Date(bin.updatedAt * 1000);
        result.updated.minutesAgo = diffMinutes(new Date(), result.updated.date);
  
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  },
  ensureBin: () => {
    return new Promise(async (resolve, reject) => {
      try {
        var bin = (await base.getPlayLists() || []).find(p => p.title === _binname_ && p.playlistType === 'photo');
  
        if (!bin) {
          bin = await base.createPlayList(_binname_, 'Deleted items will be permanently removed by schedule.');
        }
  
        resolve(bin);
      } catch (error) {
        reject(error);
      }
    });
  },
  addToPlayList: (key, item) => {
    return new Promise(async (resolve, reject) => {
      try {
        if (!_machineIdentifier_) {
          let details = await base.client.query('/');
          let data = details && details.MediaContainer;

          if (!data) {
            return reject(Error('Cannot get details from plex!'));
          }

          _machineIdentifier_ = data.machineIdentifier;
        }

        const uri = `server://${_machineIdentifier_}/com.plexapp.plugins.library${item}`;
        const response = await base.client.putQuery(encodeURI(`/playlists/${key}/items?uri=${uri}`));

        resolve(response);
      } catch (error) {
        reject(error);
      }
    });
  },
  check: () => {
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
  },
  refresh: () => {
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
  },
  wait: () => {
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
  },
  find: (filepath) => {
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
  },
  tagMedia: (tags) => {
    const files = Object.keys(tags).map(k => path.resolve(base.path, k));

    return new Promise(async (resolve, reject) => {
      try {
        for (let i = 0; i < files.length; i++) {
          await sleep(500);
          const item = await base.find(files[i]);

          if (item) {
            await sleep(500);
            await base.update(item, tags[item.path]);
            logger.log(__name, `tagged: ${i} - ${item.path} of total: ${files.length}`);
          } else {
            logger.error(__name, `NO FILE: ${files[i]}`);
          }
        }

        resolve();
      } catch (error) {
        console.log('er', error);
        reject(error);
      }
    });
  },
  update: (file, media) => {
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
  },
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

module.exports = {
  init: init,
};
