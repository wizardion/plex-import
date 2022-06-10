'use strict';

const PlexAPI = require('plex-api');
const bin = 'Deleted2';

function getClient(token) {
  if (!token) {
    throw Error('Token is required!');
  }

	return new PlexAPI({
		hostname: '192.168.86.100',
		// username: 'al4273',
		// password: '9oCrArUswudrA?A6hOsW',
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

function logError(error) {
	console.warn('ERROR: ', error);
}

function diffMinutes(dt2, dt1) {
	return Math.abs(Math.round(((dt2.getTime() - dt1.getTime()) / 1000) / 60));
}

function getBinItems(token) {
	return new Promise((resolve, reject) => {
		const client = getClient(token);
    const result = {
      updated: {date: null, minutesAgo: 0},
      status: -1,
      items: []
    };

    getPlayList(client, bin).catch(reject).then(playlist => {
      if (playlist) {
        result.updated.date = new Date(playlist.updatedAt * 1000);
        result.updated.minutesAgo = diffMinutes(new Date(), result.updated.date);
        result.status = 200;

        console.log('playlist', playlist);

        client.query(`/playlists/${playlist.ratingKey}/items`).then((content) => {
          const list = content && content.MediaContainer && content.MediaContainer.Metadata || [];

          list.forEach(media => media.Media.forEach(parts => parts.Part.forEach(file => result.items.push(file))));
          resolve(result);
        }, reject);
      } else {
        resolve(result);
      }
    });		
	});
}

function createBin(token) {
  return new Promise((resolve, reject) => {
    const client = getClient(token);
    const summary = 'Deleted items will be permanently removed after 30 days.';

    // client.postQuery(`/playlists?uri=&title=Deleted&summary=${summary}&smart=0&type=photo`).then((result) => {
    // client.postQuery(`/playlists?uri=&title=${bin}&summary=${summary}&smart=0&type=photo`).then((result) => {
    client.postQuery(`/playlists?uri=&title=${bin}&summary=${summary}&smart=0`).then((result) => {
      if (result && result.MediaContainer) {
        let ratingKey = (result.MediaContainer.Metadata || [])[0].ratingKey;

        console.log('result', result);
        console.log('MediaContainer', result.MediaContainer);

        // return client.putQuery(`/playlists/${ratingKey}?summary=${summary}`).then(()=> resolve(ratingKey), reject);
      }
      
      resolve();
    }, reject);
  });
}

module.exports = {
  getBinItems: getBinItems,
  createBin: createBin,
};
