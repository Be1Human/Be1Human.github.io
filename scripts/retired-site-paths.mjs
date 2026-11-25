const retiredProjects = ['interactive-cube', 'network-lab', 'game-system-notes'];

// These public copies were explicitly removed by the site owner.
export const retiredSitePaths = new Set([
  'assets/styles.css',
  'assets/mark.svg',
  ...retiredProjects.flatMap(id => [
    `projects/${id}.html`,
    `portfolio/projects/${id}.html`,
    `assets/images/${id}-cover.svg`,
  ]),
  'assets/bdc88ee68c51.svg',
  'assets/6f28a0abf4e4.svg',
  'assets/0599db32fdea.svg',
]);
