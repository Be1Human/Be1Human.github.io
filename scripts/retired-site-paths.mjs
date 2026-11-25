const retiredProjects = ['interactive-cube', 'network-lab', 'game-system-notes', 'codebuddy-memory', 'voxelspace', 'workflow-skills'];

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
  'assets/8d0d1c570ac3.svg',
  'assets/fe2a3729d8b9.svg',
  'assets/images/duomind-cover.svg',
  'assets/263810aa0ad9.svg',
  'assets/231e0750ef8f.svg',
]);
