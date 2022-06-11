const tmpdir = 'path.to.tmp';
const users = [
  {
    name: 'alex',
    token: 'p5v5SftAWa6QLHjzVsUm',
    locations: {
      originals: 'path.to.original.photos',
      photoprism: 'path.to.photoprism.sidecar',
      plex: 'path.to.plex.directory',
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
