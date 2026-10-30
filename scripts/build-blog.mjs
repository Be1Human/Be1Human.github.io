import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { httpsUrl, validateEditionId } from './news-data.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJSON = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const [projects, posts, news, evidence, template] = await Promise.all([
  readJSON('data/projects.json'), readJSON('data/posts.json'), readJSON('data/news.json'), readJSON('data/content-sources.json'), readFile(resolve(root, 'src/page.template.html'), 'utf8'),
]);
const origin = 'https://be1human.github.io/portfolio/';
const styleVersion = createHash('sha256').update(await readFile(resolve(root, 'assets/styles.css'))).digest('hex').slice(0, 12);
const e = value => String(value).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
const external = 'target="_blank" rel="noopener noreferrer"';
const number = value => String(value).padStart(2, '0');
const dateLabel = date => `${Number(date.slice(5, 7))} 月 ${Number(date.slice(8, 10))} 日`;
const minutes = post => Math.max(1, Math.ceil(post.sections.reduce((n, section) => n + section.paragraphs.join('').length, 0) / 400));
const categories = {all: '全部作品', games: '游戏项目', visuals: '动态视觉', tools: 'AI 与工具'};
const pages = new Map();

function unique(items, key) {
  if (new Set(items.map(item => item[key])).size !== items.length) throw new Error(`Duplicate ${key}`);
}
unique(projects, 'id'); unique(posts, 'id'); unique(news.editions, 'id');
for (const project of projects) {
  if (!/^[a-z0-9-]+$/.test(project.id) || !categories[project.category] || project.category === 'all') throw new Error('Invalid project');
  for (const key of ['title', 'description', 'imageAlt', 'imageNote', 'kind', 'action', 'label']) if (!project[key]) throw new Error(`Missing project ${key}`);
  if (!/^assets\/images\/[\w.-]+$/.test(project.image)) throw new Error('Invalid local image');
  await access(resolve(root, project.image));
  for (const field of ['url', 'documentation', 'repository']) httpsUrl(project[field]);
  const source = evidence.projects.find(source => source.projectId === project.id);
  if (!source || !project.documentation.startsWith(`${project.repository}/blob/${source.revision}/`) || !source.documents.some(doc => doc.url === project.documentation)) throw new Error('Project documentation does not match its recorded source');
}
for (const post of posts) {
  if (!/^[a-z0-9-]+$/.test(post.id)) throw new Error('Invalid article ID');
  validateEditionId(post.date);
  if (!post.title || !post.summary || !post.sections.length || !post.tags.length) throw new Error('Incomplete article');
  if (post.image) {
    if (!/^assets\/images\/[\w.-]+$/.test(post.image)) throw new Error('Invalid article image');
    await access(resolve(root, post.image));
  }
  post.links.forEach(link => httpsUrl(link.url));
}
posts.sort((a, b) => b.date.localeCompare(a.date));
for (const edition of news.editions) {
  validateEditionId(edition.id);
  if (!edition.items.length) throw new Error('Empty edition');
  for (const item of edition.items) {
    if (Object.keys(item).some(key => !['id', 'rank', 'title', 'summary', 'category', 'author', 'url', 'sources', 'publishedAtISO', 'observedAt', 'preview'].includes(key))) throw new Error('Unexpected private field in public news');
    httpsUrl(item.url); item.sources.forEach(source => httpsUrl(source.url));
    if (item.preview) httpsUrl(item.preview.url);
  }
}
news.editions.sort((a, b) => b.id.localeCompare(a.id));
const latest = news.editions[0];

function render(path, title, description, active, content, ogtype = 'website') {
  const base = path.includes('/') ? '../' : '';
  const navActive = active === 'journal' ? 'home' : active;
  const nav = [['index.html', 'home', '博客'], ['works.html', 'works', '作品集'], ['news.html', 'news', '科技新闻']].map(([href, key, name]) => `<a href="${base}${href}"${key === navActive ? ' aria-current="page"' : ''}>${name}</a>`).join('');
  let html = template;
  const variables = {TITLE: e(title), DESCRIPTION: e(description), CANONICAL: origin + (path === 'index.html' ? '' : path), OGTYPE: ogtype, BASE: base, PAGE: active, STYLE_VERSION: styleVersion, NAV: nav, CONTENT: content};
  for (const [key, value] of Object.entries(variables)) html = html.replaceAll(`{{${key}}}`, value);
  // Keep the blog index focused on reading, with compact navigation and footer.
  if (active === 'home') {
    html = html.replace(/  <header class="site-header">[\s\S]*?<\/header>/, `<header class="blog-header"><a class="blog-brand" href="index.html" aria-label="云上男孩的博客"><span aria-hidden="true">☁</span>云上男孩</a><nav aria-label="主导航">${nav}</nav></header>`);
    html = html.replace(/  <footer class="site-footer wrap">[\s\S]*?<\/footer>/, `<footer class="blog-footer"><p>© 2026 云上男孩</p><nav aria-label="更多链接"><a href="https://github.com/Be1Human" ${external}>GitHub ↗</a><a href="feed.xml">RSS ↗</a></nav></footer>`);
  }
  if (/\{\{[A-Z_]+\}\}/.test(html)) throw new Error(`Unfilled template: ${path}`);
  pages.set(path, html);
}

function heading(kicker, title, description, extra = '') {
  return `<header class="page-heading wrap"><p class="eyebrow">${kicker}</p><div class="page-title-row"><div><h1>${title}<span class="blue">.</span></h1><p class="page-description">${description}</p></div>${extra}</div></header>`;
}

function projectCard(project, compact = false, base = '') {
  return `<article class="project-card${compact ? ' compact' : ''}" id="${e(project.id)}" data-filter-item data-category="${e(project.category)}" data-search="${e([project.title, project.description, ...project.tags].join(' '))}">
    <a class="project-image-link ${project.artwork === 'clawpm' ? 'logo-art' : ''}" href="${e(project.url)}" ${external} aria-label="${e(project.title)}：${e(project.action)}（新窗口）"><img src="${base}${e(project.image)}" alt="${e(project.imageAlt)}" loading="lazy" width="1200" height="706"><span class="image-note">${e(project.imageNote)}</span><span class="image-arrow" aria-hidden="true">↗</span></a>
    <div class="project-body"><div class="meta"><span class="category-label">${e(project.label)}</span><span>${e(project.kind)}</span></div><h3><a href="${e(project.url)}" ${external}>${e(project.title)} <span aria-hidden="true">↗</span></a></h3><p>${e(project.description)}</p><div class="project-bottom"><div class="tags">${project.tags.map(tag => `<span>${e(tag)}</span>`).join('')}</div>${compact ? '' : `<a class="subtle-link" href="${e(project.documentation)}" ${external}>项目说明 ↗</a>`}</div></div>
  </article>`;
}

function controls(labels, searchLabel, count, noun) {
  return `<div class="filter-toolbar" data-controls hidden><div class="filters" role="group" aria-label="分类筛选">${labels.map(([id, label]) => `<button type="button" data-filter="${e(id)}" aria-pressed="${id === 'all'}">${e(label)}</button>`).join('')}</div><label class="search-box"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input type="search" placeholder="${searchLabel}" aria-label="${searchLabel}" data-search-input></label></div><p class="result-count" data-count data-noun="${noun}" aria-live="polite" aria-atomic="true">共 ${count} ${noun}</p>`;
}
const empty = '<div class="empty-state" data-empty hidden><span aria-hidden="true">⌕</span><h2>暂时没有找到</h2><p>换个关键词，或试试其他分类。</p><button class="button button-light" type="button" data-clear>清除筛选</button></div>';

const home = `<section class="blog-home" aria-labelledby="home-title">
  <h1 id="home-title">博客</h1>
  <div class="blog-posts">${posts.map(post => `<article class="blog-entry">
    <div class="blog-meta"><time datetime="${post.date}">${post.date.replaceAll('-', '.')}</time><span>${e(post.category)}</span></div>
    <h2><a href="posts/${post.id}.html">${e(post.title)}</a></h2>
    <p>${e(post.summary)}</p>
  </article>`).join('')}</div>
</section>`;
render('index.html', '博客 — CLOUD BOY · 云上男孩', '按时间阅读云上男孩的博客：创作手记、项目记录与想法。', 'home', home);

render('works.html', '作品集 — CLOUD BOY · 云上男孩', '游戏、动态视觉与 AI 工具：CLOUD BOY 的 7 件公开作品及项目说明。', 'works', `${heading('01 / SELECTED WORKS', '让想法，有个形状', '游戏、动态视觉、AI 与工具。这里是我做过的一些尝试。', '<span class="page-doodle" aria-hidden="true">✳</span>')}<section class="wrap page-body" id="works" data-filterable>${controls(Object.entries(categories), '搜索作品或技术…', projects.length, '件作品')}<div class="project-grid">${projects.map(project => projectCard(project)).join('')}</div>${empty}<div class="endnote"><span>更多正在生长的项目</span><a href="https://github.com/Be1Human?tab=repositories" ${external}>查看全部 GitHub 仓库 ↗</a></div></section>`);

const months = [...new Set(posts.map(post => post.date.slice(0, 7)))];
render('journal.html', '博客时间线 — CLOUD BOY · 云上男孩', '按时间翻阅云上男孩的创作手记、项目记录和想法。', 'journal', `${heading('02 / THE JOURNAL', '一路创造，一路记录', '关于游戏、技术与创作的一些文字。顺着时间，慢慢读。', `<div class="page-stat"><strong>${number(posts.length)}</strong><span>篇记录 / 持续书写</span></div>`)}<section class="wrap page-body journal-layout" data-filterable><aside class="journal-rail"><p class="eyebrow">ARCHIVE</p>${[...new Set(posts.map(post => post.date.slice(0, 4)))].map(year => `<a href="#month-${months.find(month => month.startsWith(year))}">${year}<span>${posts.filter(post => post.date.startsWith(year)).length} 篇</span></a>`).join('')}<div class="rail-note">不是每一步都有答案，<br>但每一步都值得留下。</div></aside><div class="journal-main">${controls([['all', '全部记录'], ...[...new Set(posts.map(post => post.category))].map(category => [category, category])], '搜索文章或标签…', posts.length, '篇文章')}<div class="timeline">${months.map(month => `<section class="timeline-month" data-filter-section id="month-${month}"><div class="month-marker"><span>${month.slice(0, 4)}</span><h2>${Number(month.slice(5))} 月</h2></div>${posts.filter(post => post.date.startsWith(month)).map(post => `<article class="timeline-entry" data-filter-item data-category="${e(post.category)}" data-search="${e([post.title, post.summary, ...post.tags].join(' '))}"><div class="timeline-date"><time datetime="${post.date}">${post.date.slice(8)}</time><span>${new Intl.DateTimeFormat("en", {month: "short", timeZone: "UTC"}).format(new Date(post.date)).toUpperCase()}</span></div><div class="timeline-entry-body"><div class="meta"><span class="category-label">${e(post.category)}</span><span>${minutes(post)} 分钟阅读</span></div><h3><a href="posts/${post.id}.html">${e(post.title)} <span aria-hidden="true">↗</span></a></h3><p>${e(post.summary)}</p><div class="tags">${post.tags.map(tag => `<span># ${e(tag)}</span>`).join('')}</div>${post.image ? `<a class="timeline-image" href="posts/${post.id}.html" tabindex="-1" aria-hidden="true"><img src="${post.image}" alt="" loading="lazy" width="800" height="320"></a>` : ''}</div></article>`).join('')}</section>`).join('')}<p class="timeline-start">◦ &nbsp; 故事从这里开始，也还在继续。</p></div>${empty}</div></section>`);

for (const post of posts) {
  const body = `<article class="article-shell wrap"><a class="back-link" href="../index.html">← 返回博客</a><header class="article-header"><div class="meta"><span class="category-label">${e(post.category)}</span><time datetime="${post.date}">${post.date.replaceAll('-', '.')}</time><span>${minutes(post)} 分钟阅读</span></div><h1>${e(post.title)}</h1><p class="article-lede">${e(post.summary)}</p><div class="article-author"><span class="author-cloud" aria-hidden="true">☁</span><div><strong>CLOUD BOY</strong><span>云上男孩 · 创作记录</span></div></div></header>${post.image ? `<figure class="article-cover"><img src="../${post.image}" alt="${e(post.imageAlt)}" width="1200" height="600"><figcaption>${e(post.imageAlt)}</figcaption></figure>` : ''}<div class="article-layout"><div class="prose">${post.sections.map((section, index) => `<section id="section-${index + 1}"><h2>${e(section.heading)}</h2>${section.paragraphs.map(paragraph => `<p>${e(paragraph)}</p>`).join('')}</section>`).join('')}${post.links.length ? `<section class="article-links"><h2>继续探索</h2><ul>${post.links.map(link => `<li><a href="${e(link.url)}" ${external}>${e(link.title)} ↗</a></li>`).join('')}</ul></section>` : ''}<div class="article-end"><span>— END —</span><div class="tags">${post.tags.map(tag => `<span># ${e(tag)}</span>`).join('')}</div></div></div><aside class="article-toc"><p class="eyebrow">ON THIS PAGE</p><nav aria-label="文章目录">${post.sections.map((section, index) => `<a href="#section-${index + 1}">${number(index + 1)} &nbsp; ${e(section.heading)}</a>`).join('')}</nav></aside></div><a class="button button-light" href="../index.html">← 查看更多文章</a></article>`;
  render(`posts/${post.id}.html`, `${post.title} — CLOUD BOY`, post.summary, 'journal', body, 'article');
}

function newsCard(item, index) {
  const sources = item.sources.filter(source => source.url !== item.url);
  return `<article class="news-card" id="item-${item.id}" data-filter-item data-category="${e(item.category)}" data-search="${e([item.title, item.summary, item.author, item.category].join(' '))}"><div class="news-rank">${number(index + 1)}</div><div class="news-copy"><div class="meta"><span class="category-label">${e(item.category)}</span>${item.preview ? `<span>${item.preview.type === 'video' ? '视频原帖' : '图片原帖'}</span>` : ''}</div><h2><a href="${e(item.url)}" ${external}>${e(item.title)} <span aria-hidden="true">↗</span></a></h2><p>${e(item.summary)}</p><div class="news-byline"><span>${e(item.author)}</span>${item.publishedAtISO ? `<time datetime="${e(item.publishedAtISO)}">${e(item.publishedAtISO.slice(0, 10))} 发布</time>` : ''}</div><div class="news-links"><a href="${e(item.url)}" ${external}>打开原帖 ↗</a>${sources.length ? `<details><summary>来源资料 · ${sources.length}</summary><ul>${sources.map(source => `<li><a href="${e(source.url)}" ${external}>${e(source.title)} ↗</a></li>`).join('')}</ul></details>` : ''}</div></div>${item.preview ? `<a class="news-preview" href="${e(item.url)}" ${external} aria-label="查看 ${e(item.title)} 的原帖媒体"><img src="${e(item.preview.url)}" alt="${e(item.preview.alt)}" width="320" height="210" loading="lazy" referrerpolicy="no-referrer"><span>${item.preview.type === 'video' ? '↗ 打开原帖看视频' : '↗ 查看原图'}</span></a>` : ''}</article>`;
}

function newsPage(edition, base) {
  const cats = [...new Set(edition.items.map(item => item.category))];
  const prev = news.editions[news.editions.indexOf(edition) + 1];
  const next = news.editions[news.editions.indexOf(edition) - 1];
  const link = target => `${base}news/${target.id}.html`;
  const syncDate = new Intl.DateTimeFormat('zh-CN', {timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false}).format(new Date(news.syncedAt));
  return `${heading('03 / DAILY SIGNAL', '世界在更新，保持好奇', '从 Dot 每日精选同步而来。AI、游戏开发、内容制作与硬件创客，按天收藏。')}<section class="wrap page-body news-page"><div class="edition-banner"><div><div class="edition-kicker"><span class="status-dot"></span> AI 热门 20 · 每日精选</div><h2>${dateLabel(edition.date)}<span>${edition.id.includes('evening') ? '晚间精选' : '科技精选'}</span></h2><p>${edition.items.length} 条值得关注的动态<span> / </span>保留原作者、摘要与来源</p></div><div class="edition-picker"><label for="edition-select">翻阅其他日期 <span>ARCHIVE</span></label><select id="edition-select" data-edition-select>${news.editions.map(entry => `<option value="${link(entry)}"${entry.id === edition.id ? ' selected' : ''}>${entry.id.replace('-evening', ' 晚间')} · ${entry.items.length} 条</option>`).join('')}</select><div class="edition-controls">${prev ? `<a href="${link(prev)}">← 上一期</a>` : '<span>已到最早一期</span>'}${next ? `<a href="${link(next)}">下一期 →</a>` : '<span>当前为最新一期</span>'}</div></div></div><div class="news-layout"><section class="news-main" data-filterable>${controls([['all', '全部'], ...cats.map(category => [category, category])], '搜索话题、作者或工具…', edition.items.length, '条资讯')}<div class="news-list">${edition.items.map(newsCard).join('')}</div>${empty}</section><aside class="news-rail"><section class="news-source-note"><span class="signal-icon" aria-hidden="true">◉</span><p class="eyebrow">FROM DOT, WITH CURIOSITY</p><h2>每天，少一点翻找。</h2><p>这份精选来自我的 Dot「AI 热门 20」。在这里按日期归档，让有用的发现不再被时间冲走。</p><dl><div><dt>已归档</dt><dd>${news.editions.length} 期</dd></div><div><dt>最新一期</dt><dd>${latest.date.replaceAll('-', '.')}</dd></div><div><dt>同步时间</dt><dd>${e(syncDate)}<small>洛杉矶时间</small></dd></div></dl><a class="subtle-link" href="${e(edition.sourceUrl)}" ${external}>查看 Dot 原始精选 ↗</a><small class="source-access-note">原始阅览室需要所有者登录。<br>本页原帖链接可直接访问。</small></section><div class="reading-note"><p>关于这些资讯</p><span>摘要沿用每日精选的整理结果，不代表已独立实测产品。请结合原作者与官方资料阅读；图片版权归原作者，视频在原帖观看。</span></div><details class="archive-list"><summary>全部日期归档 · ${news.editions.length} 期</summary><nav aria-label="新闻日期归档">${news.editions.map(entry => `<a href="${link(entry)}"${entry.id === edition.id ? ' aria-current="page"' : ''}>${entry.id.replace('-evening', ' 晚间')}<span>${entry.items.length} 条</span></a>`).join('')}</nav></details></aside></div></section>`;
}
render('news.html', '科技新闻 — CLOUD BOY · 云上男孩', '从 Dot AI 热门 20 同步的每日科技精选，按日期归档，支持分类与搜索。', 'news', newsPage(latest, ''));
for (const edition of news.editions) render(`news/${edition.id}.html`, `${edition.date} 科技精选 — CLOUD BOY`, `${edition.date} 的 ${edition.items.length} 条科技精选，保留原作者和来源。`, 'news', newsPage(edition, '../'));

const rssItems = [
  ...posts.map(post => ({title: post.title, link: `posts/${post.id}.html`, date: post.date, summary: post.summary})),
  ...news.editions.map(edition => ({title: `${edition.date} 科技精选 · ${edition.items.length} 条`, link: `news/${edition.id}.html`, date: edition.date, summary: edition.items.slice(0, 3).map(item => item.title).join('；')})),
].sort((a, b) => b.date.localeCompare(a.date));
pages.set('feed.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>CLOUD BOY · 云上男孩</title><link>${origin}</link><description>作品、创作手记与每日科技精选</description><language>zh-CN</language>${rssItems.map(item => `<item><title>${e(item.title)}</title><link>${origin}${item.link}</link><guid>${origin}${item.link}</guid><pubDate>${new Date(`${item.date}T12:00:00Z`).toUTCString()}</pubDate><description>${e(item.summary)}</description></item>`).join('')}</channel></rss>\n`);
pages.set('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...pages.keys()].filter(path => path.endsWith('.html')).map(path => `<url><loc>${origin}${path === 'index.html' ? '' : path}</loc></url>`).join('')}</urlset>\n`);

// Check local hrefs/srcs against this build or actual assets before writing any output.
for (const [path, html] of pages) {
  if (!path.endsWith('.html')) continue;
  const pageIds = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  if (new Set(pageIds).size !== pageIds.length) throw new Error(`Duplicate HTML ID: ${path}`);
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const url = match[1];
    if (/^(?:https?:|#)/.test(url)) continue;
    const target = resolve(root, dirname(path), url.split(/[?#]/)[0]);
    const localPath = relative(root, target).replaceAll('\\', '/');
    if (localPath.startsWith('../')) throw new Error(`Link escapes site root: ${url}`);
    if (!pages.has(localPath)) await access(target);
  }
}
for (const [path, content] of pages) {
  const target = resolve(root, path);
  if (process.argv.includes('--check')) {
    if (await readFile(target, 'utf8') !== content) throw new Error(`Generated page is stale: ${path}`);
  } else {
    await mkdir(dirname(target), {recursive: true});
    await writeFile(target, content);
  }
}
console.log(`${process.argv.includes('--check') ? 'Checked' : 'Built'} ${pages.size} files: ${projects.length} projects, ${posts.length} posts, ${news.editions.length} news editions / ${news.editions.reduce((sum, edition) => sum + edition.items.length, 0)} items.`);
