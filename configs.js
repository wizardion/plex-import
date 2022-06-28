const users = [
  {
    name: 'name-of-the-user',
    username: 'plex-login.or.email',
    host: 'plex.host.address.example:127.0.0.1',
    token: 'plex-token:', // how to find: https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/
    locations: {
      tmp: 'path/to/tmp/folder',
      originals: 'path/to/folder/where/original/photos/are',
      photoprism: 'path/to/folder/where/photoprism/storage/sidecar',
      plex: {
        host: 'path/to/folder/where/plex-docker/has/library:mapped/on/host/machine:target-folder',
        container: '/path/to/folder/inside/of/plex/container'
      },
    },
    force: {
      plex: false,
      prism: false,
    },
  }
];

const sync = [
  {name: 'forcer'},                                         // forces plex or photoprism for initial scan
  {name: 'plex-backups', depends: 'forcer'},                // backups all media from plex to restore => tmp/plex-bk.list
  {name: 'plex-restore', depends: 'forcer'},                // restores media from tmp/plex-bk.list to plex
  {name: 'duplicates'},                                     // searches form duplicated names in files and renames them
  {name: 'plex-scan'},                                      // scans plex files, stores {lost} files => tmp/plex-lost.list
  {name: 'origin-scan'},                                    // scans original folder, stores {new,updated} data => tmp/process.list, {lost} => tmp/lost.list
  {name: 'cleaner', depends: ['plex-scan', 'origin-scan']}, // clean original/photoprism files from tmp/plex-lost.list, tmp/lost.list
  {name: 'photoprism', depends: 'origin-scan'},             // starts photoprism for tensor flow scanning
  {name: 'import', depends: 'origin-scan'},                 // imports from tmp/process.list into plex
  {name: 'tagging', depends: 'origin-scan'},                // imports from tmp/process.list into plex
  {name: 'ensure-bin'},                                     // tags all plex data from tmp/process.list
  {name: 'playlist', depends: 'origin-scan'},               // adds playlists to plex, data taken from tmp/process.list
  {name: 'optimizer', depends: 'origin-scan'},              // optimizes all videos to play from remote
  {name: 'finish'},                                         // depends on scanners
];

const logger = {
  days: 30,
  level: 0,
  levels: {
    console: 0,
    file: 1,
  }
};

module.exports = {
  sync: sync,
  users: users,
  logger: logger,
};
