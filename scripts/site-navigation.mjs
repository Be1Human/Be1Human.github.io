export const siteNavigation = [
  ['home', '首页'],
  ['journal', '手记'],
  ['works', '作品'],
  ['learning', 'Agent 学习'],
  ['news', '新闻'],
  ['about', '关于'],
];

export function renderSiteNavigation({base = '', active = '', interactive = false} = {}) {
  return siteNavigation.map(([id, label]) => `<a href="${id === 'learning' ? base+'learn.html' : (interactive ? '' : base+'index.html')+'#'+id}"${id === active ? ' aria-current="page"' : ''}>${label}</a>`).join('');
}
