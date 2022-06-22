const tmpdir = '/Users/alex/Projects/plex-server/dicts';
const users = [
  {
    name: 'alex',
    username: 'alex@zarnitsa.net',
    host: '192.168.86.100',
    token: 'yxCZPBgvRTBrLLpeJXYA',
    locations: {
      originals: '/Users/alex/Projects/plex-server/tmp/orig',
      photoprism: '/Users/alex/Projects/plex-server/tmp/sidecar',
      plex: '/Users/alex/Projects/plex-server/tmp/plex',
    },
    clean: false,
    force: false,
  }
];

const tasks = [
  'cleaner',
  // 'duplicates',
  'scanner',
  // 'photoprism',
  // 'import',
  'tagging',
  // 'finish',
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
  tasks: tasks,
  users: users,
  tmpdir: tmpdir,
  logger: logger,
};
