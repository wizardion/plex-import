const tmpdir = '/Users/alex/Projects/plex-server/dicts';
const users = [
  {
    name: 'alex',
    token: 'p5v5SftAWa6QLHjzVsUm',
    locations: {
      originals: '/Users/alex/Projects/plex-server/tmp/orig',
      photoprism: '/Users/alex/Projects/plex-server/tmp/sidecar',
      plex: '/Users/alex/Projects/plex-server/tmp/plex',
    }
  }
];

const tasks = [
  'duplicates',
  'scanner',
  // 'photoprism',
  'import',
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
