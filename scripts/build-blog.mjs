import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { httpsUrl, validateEditionId } from './news-data.mjs';
import { buildFeed, renderStatusText } from './blog-feed.mjs';
import { projectCategories, projectPagePath, validateProject } from './project-data.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJSON = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const [projects, posts, news, evidence, template, updates] = await Promise.all([
  readJSON('data/projects.json'), readJSON('data/posts.json'), readJSON('data/news.json'), readJSON('data/content-sources.json'), readFile(resolve(root, 'src/page.template.html'), 'utf8'),
  readJSON('data/updates.json'),
]);
const origin = 'https://be1human.github.io/';
const styleVersion = createHash('sha256').update(await readFile(resolve(root, 'assets/styles.css'))).digest('hex').slice(0, 12);
const e = value => String(value).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
const external = 'target="_blank" rel="noopener noreferrer"';
const number = value => String(value).padStart(2, '0');
const dateLabel = date => `${Number(date.slice(5, 7))} 月 ${Number(date.slice(8, 10))} 日`;
const minutes = post => Math.max(1, Math.ceil(post.sections.reduce((n, section) => n + section.paragraphs.join('').length, 0) / 400));
const categories = projectCategories;
const pages = new Map();

function unique(items, key) {
  if (new Set(items.map(item => item[key])).size !== items.length) throw new Error(`Duplicate ${key}`);
}
unique(projects, 'id'); unique(posts, 'id'); unique(news.editions, 'id');
for (const project of projects) {
  const source = evidence.projects.find(source => source.projectId === project.id);
  validateProject(project, source);
  await access(resolve(root, project.image));
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
const feed = buildFeed(posts, updates);
for (const update of updates) if (update.image) await access(resolve(root, update.image));
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
const redirectVersion = createHash('sha256').update(await readFile(resolve(root, 'assets/legacy-redirect.js'))).digest('hex').slice(0, 12);

function render(path, title, description, active, content, ogtype = 'website') {
  const base = path.includes('/') ? '../' : '';
  const navActive = active === 'journal' ? 'home' : active;
  const nav = [['index.html', 'home', '主页'], ['works.html', 'works', '作品集'], ['news.html', 'news', '科技新闻']].map(([href, key, name]) => `<a href="${base}${href}"${key === navActive ? ' aria-current="page"' : ''}>${name}</a>`).join('');
  let html = template;
  const variables = {TITLE: e(title), DESCRIPTION: e(description), CANONICAL: origin + (path === 'index.html' ? '' : path), OGTYPE: ogtype, BASE: base, PAGE: active, STYLE_VERSION: styleVersion, NAV: nav, CONTENT: content};
  for (const [key, value] of Object.entries(variables)) html = html.replaceAll(`{{${key}}}`, value);
  if (/\{\{[A-Z_]+\}\}/.test(html)) throw new Error(`Unfilled template: ${path}`);
  pages.set(path, html);
}

function heading(id, title, description, extra = '') {
  return `<header class="panel-heading"><div><h1 id="${id}">${title}</h1><p>${description}</p></div>${extra}</header>`;
}

function projectCard(project) {
  const local = project.presentation === 'showcase';
  const linkAttributes = local ? '' : external;
  const arrow = local ? '→' : '↗';
  return `<article class="project-card" id="${e(project.id)}" data-filter-item data-category="${e(project.category)}" data-search="${e([project.title, project.description, project.kind, ...project.tags].join(' '))}">
    <a class="project-image-link ${project.artwork === 'clawpm' ? 'logo-art' : ''}" href="${e(project.url)}" ${linkAttributes} aria-label="${e(project.title)}：${e(project.action)}${local ? '' : '（新窗口）'}"><img src="${e(project.image)}" alt="${e(project.imageAlt)}" loading="lazy" width="1200" height="706"><span class="image-note">${e(project.imageNote)}</span><span class="image-arrow" aria-hidden="true">${arrow}</span></a>
    <div class="project-body"><div class="meta"><span class="category-label">${e(project.label)}</span><span>${e(project.kind)}</span></div><h2><a href="${e(project.url)}" ${linkAttributes}>${e(project.title)} <span aria-hidden="true">${arrow}</span></a></h2><p>${e(project.description)}</p><div class="project-bottom"><div class="tags">${project.tags.map(tag => `<span>${e(tag)}</span>`).join('')}</div><a class="subtle-link" href="${e(project.documentation)}" ${linkAttributes}>${local ? '查看项目' : '项目说明'} ${arrow}</a></div></div>
  </article>`;
}

function controls(labels, searchLabel, count, noun) {
  return `<div class="filter-toolbar" data-controls hidden><div class="filters" role="group" aria-label="分类筛选">${labels.map(([id, label]) => `<button type="button" data-filter="${e(id)}" aria-pressed="${id === 'all'}">${e(label)}</button>`).join('')}</div><label class="search-box"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input type="search" placeholder="${searchLabel}" aria-label="${searchLabel}" data-search-input></label></div><p class="result-count" data-count data-noun="${noun}" aria-live="polite" aria-atomic="true">共 ${count} ${noun}</p>`;
}
const empty = '<div class="empty-state" data-empty hidden><span aria-hidden="true">⌕</span><h2>暂时没有找到</h2><p>换个关键词，或试试其他分类。</p><button class="button button-light" type="button" data-clear>清除筛选</button></div>';

function feedEntry(entry) {
  const id = `${entry.type}-${entry.id}`;
  const meta = `<div class="feed-meta"><a class="feed-date" href="${entry.permalink}" aria-label="${entry.date} 发布的${entry.type === 'status' ? '动态' : '文章'}"><time datetime="${e(entry.publishedAt || entry.date)}"><span>${entry.date.slice(5).replace('-', ' / ')}</span><small>${entry.date.slice(0, 4)}</small></time></a><span class="entry-kind">${entry.type === 'status' ? '动态' : '文章'}</span></div>`;
  const content = entry.type === 'status'
    ? `<div class="feed-status">${renderStatusText(entry.content)}</div>${entry.image ? `<a class="feed-photo" href="${e(entry.image)}" aria-label="查看原图"><img src="${e(entry.image)}" alt="${e(entry.imageAlt)}" width="1200" height="750" loading="lazy"></a>` : ''}`
    : `<a class="feed-article" href="${entry.permalink}" aria-labelledby="feed-title-${entry.id}">${entry.image ? `<div class="feed-cover"><img src="${e(entry.image)}" alt="${e(entry.imageAlt)}" width="1200" height="675" loading="lazy"></div>` : ''}<div class="feed-article-copy"><p class="feed-article-label">${e(entry.category)}<span>·</span>${minutes(entry)} 分钟阅读</p><h2 id="feed-title-${entry.id}">${e(entry.title).replaceAll('：', '：<wbr>')}</h2><p class="feed-excerpt">${e(entry.summary)}</p><span class="feed-readline">阅读全文 <span aria-hidden="true">↗</span></span></div></a>`;
  return `<article class="feed-entry" id="${id}" data-entry-type="${entry.type}">${meta}<div class="feed-entry-main">${content}</div></article>`;
}
const home = `<section class="site-panel activity-feed" aria-labelledby="home-title">${heading('home-title', '动态', '日常的记录，与慢慢写下的长文。', '<a class="heading-link" href="feed.xml" aria-label="通过 RSS 订阅动态">RSS <span aria-hidden="true">↗</span></a>')}<div class="feed-entries">${feed.map(feedEntry).join('')}</div></section>`;
render('index.html', '云上男孩 · 动态与文章', '云上男孩的个人时间流。随手记录的文字动态，以及关于游戏、技术与创作的长文章。', 'home', home);

render('works.html', '作品集 — CLOUD BOY · 云上男孩', `游戏、视觉、工具与研究实验：CLOUD BOY 的 ${projects.length} 件作品及项目记录。`, 'works', `<section class="site-panel works-page" aria-labelledby="works-title">${heading('works-title', '作品集', '做过的作品，正在进行的尝试。')}<div class="panel-content" id="works" data-filterable>${controls(Object.entries(categories), '搜索作品或技术…', projects.length, '件作品')}<div class="project-grid">${projects.map(project => projectCard(project)).join('')}</div>${empty}<div class="endnote"><span>更多创作，慢慢更新</span><a href="https://github.com/Be1Human?tab=repositories" ${external}>公开源码项目 ↗</a></div></div></section>`);

for (const project of projects.filter(project => project.presentation === 'showcase')) {
  const body = `<article class="site-panel article-page"><div class="article-topbar"><a class="back-link" href="../works.html#${project.id}">← 返回作品集</a><span>项目记录</span></div><div class="article-content"><header class="article-header"><div class="article-author"><div><strong>云上男孩 <span>${e(project.detail.period)}</span></strong><p>${e(project.kind)}<span>·</span>${e(project.detail.status)}</p></div></div><h1>${e(project.title)}</h1><p class="article-lede">${e(project.description)}</p></header><figure class="article-cover"><img src="../${e(project.image)}" alt="${e(project.imageAlt)}" width="1200" height="706"><figcaption>${e(project.imageNote)}</figcaption></figure><div class="prose">${project.detail.sections.map((section, index) => `<section id="section-${index + 1}"><h2>${e(section.heading)}</h2>${section.paragraphs.map(paragraph => `<p>${e(paragraph)}</p>`).join('')}</section>`).join('')}</div><footer class="article-end"><div class="tags">${project.tags.map(tag => `<span>${e(tag)}</span>`).join('')}</div><a class="back-link" href="../works.html#${project.id}">← 返回作品集</a></footer></div></article>`;
  render(projectPagePath(project), `${project.title} — CLOUD BOY`, project.description, 'works', body, 'article');
}

render('journal.html', '云上男孩 · 动态与文章', '云上男孩的文字动态与长文章，按发布时间排列。', 'home', home);

for (const post of posts) {
  const body = `<article class="site-panel article-page"><div class="article-topbar"><a class="back-link" href="../index.html">← 返回主页</a><span>文章</span></div><div class="article-content"><header class="article-header"><div class="article-author"><div><strong>云上男孩 <span>@Be1Human</span></strong><p><time datetime="${e(post.publishedAt || post.date)}">${post.date.replaceAll('-', '.')}</time><span>·</span>${minutes(post)} 分钟阅读<span>·</span>${e(post.category)}</p></div></div><h1>${e(post.title).replaceAll('：', '：<wbr>')}</h1><p class="article-lede">${e(post.summary)}</p></header>${post.image ? `<figure class="article-cover"><img src="../${post.image}" alt="${e(post.imageAlt)}" width="1200" height="600"><figcaption>${e(post.imageAlt)}</figcaption></figure>` : ''}<div class="prose">${post.sections.map((section, index) => `<section id="section-${index + 1}"><h2>${e(section.heading)}</h2>${section.paragraphs.map(paragraph => `<p>${e(paragraph)}</p>`).join('')}</section>`).join('')}${post.links.length ? `<section class="article-links"><h2>继续探索</h2><ul>${post.links.map(link => `<li><a href="${e(link.url)}" ${external}>${e(link.title)} ↗</a></li>`).join('')}</ul></section>` : ''}</div><footer class="article-end"><div class="tags">${post.tags.map(tag => `<span># ${e(tag)}</span>`).join('')}</div><a class="back-link" href="../index.html">← 返回主页</a></footer></div></article>`;
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
  return `<section class="site-panel news-page" aria-labelledby="news-title">${heading('news-title', '科技新闻', '来自 Dot「AI 热门 20」的每日精选')}<div class="edition-banner"><div class="edition-heading"><p>每日归档</p><h2>${dateLabel(edition.date)}<span>${edition.id.includes('evening') ? '晚间精选' : edition.date.slice(0, 4)}</span></h2><p>${edition.items.length} 条资讯 · 保留原作者与来源</p></div><div class="edition-picker"><label for="edition-select">选择日期</label><select id="edition-select" data-edition-select>${news.editions.map(entry => `<option value="${link(entry)}"${entry.id === edition.id ? ' selected' : ''}>${entry.id.replace('-evening', ' 晚间')} · ${entry.items.length} 条</option>`).join('')}</select><div class="edition-controls">${prev ? `<a href="${link(prev)}">← 上一期</a>` : '<span>已到最早一期</span>'}${next ? `<a href="${link(next)}">下一期 →</a>` : '<span>当前为最新一期</span>'}</div></div></div><div class="panel-content news-main" data-filterable>${controls([['all', '全部'], ...cats.map(category => [category, category])], '搜索话题、作者或工具…', edition.items.length, '条资讯')}<div class="news-list">${edition.items.map(newsCard).join('')}</div>${empty}</div><footer class="news-notes"><details class="source-details"><summary>关于这份精选与同步</summary><div class="source-content"><p>每日精选来自我的 Dot「AI 热门 20」，在这里持续同步并按日期归档。</p><dl><div><dt>已归档</dt><dd>${news.editions.length} 期</dd></div><div><dt>最新一期</dt><dd>${latest.date.replaceAll('-', '.')}</dd></div><div><dt>同步时间</dt><dd>${e(syncDate)}（洛杉矶）</dd></div></dl><a href="${e(edition.sourceUrl)}" ${external}>查看 Dot 原始精选 ↗</a><p class="source-access-note">原始阅览室需要所有者登录，本页原帖链接可直接访问。</p><p>摘要沿用每日精选的整理结果，不代表已独立实测产品。请结合原作者与官方资料阅读；图片版权归原作者，视频在原帖观看。</p></div></details><details class="archive-list"><summary>全部日期归档 · ${news.editions.length} 期</summary><nav aria-label="新闻日期归档">${news.editions.map(entry => `<a href="${link(entry)}"${entry.id === edition.id ? ' aria-current="page"' : ''}>${entry.id.replace('-evening', ' 晚间')}<span>${entry.items.length} 条</span></a>`).join('')}</nav></details></footer></section>`;
}
render('news.html', '科技新闻 — CLOUD BOY · 云上男孩', '从 Dot AI 热门 20 同步的每日科技精选，按日期归档，支持分类与搜索。', 'news', newsPage(latest, ''));
for (const edition of news.editions) render(`news/${edition.id}.html`, `${edition.date} 科技精选 — CLOUD BOY`, `${edition.date} 的 ${edition.items.length} 条科技精选，保留原作者和来源。`, 'news', newsPage(edition, '../'));

const rssItems = [
  ...feed.map(entry => ({title: entry.type === 'article' ? entry.title : entry.content.split('\n')[0].slice(0, 60), link: entry.permalink, date: entry.date, publishedAt: entry.publishedAt, summary: entry.type === 'article' ? entry.summary : entry.content})),
  ...news.editions.map(edition => ({title: `${edition.date} 科技精选 · ${edition.items.length} 条`, link: `news/${edition.id}.html`, date: edition.date, summary: edition.items.slice(0, 3).map(item => item.title).join('；')})),
].sort((a, b) => b.date.localeCompare(a.date));
pages.set('feed.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>CLOUD BOY · 云上男孩</title><link>${origin}</link><description>作品、创作手记与每日科技精选</description><language>zh-CN</language>${rssItems.map(item => `<item><title>${e(item.title)}</title><link>${origin}${item.link}</link><guid>${origin}${item.link}</guid><pubDate>${new Date(item.publishedAt || `${item.date}T12:00:00Z`).toUTCString()}</pubDate><description>${e(item.summary)}</description></item>`).join('')}</channel></rss>\n`);
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
// The user site also owns the old /portfolio/ URLs after that project's Pages
// deployment is disabled. Generate aliases with each build, including new news.
const canonicalPages = [...pages.keys()].filter(path => path.endsWith('.html'));
for (const path of canonicalPages) {
  const target = origin + (path === 'index.html' ? '' : path);
  pages.set(`portfolio/${path}`, `<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>正在前往云上男孩的博客</title><link rel="canonical" href="${target}"><meta name="robots" content="noindex"><script src="/assets/legacy-redirect.js?v=${redirectVersion}"></script><noscript><meta http-equiv="refresh" content="0;url=${target}"></noscript></head><body><p>博客已迁到新地址。<a href="${target}">继续阅读 →</a></p></body></html>\n`);
}
// Feed readers do not execute JavaScript; keep their existing subscription live.
pages.set('portfolio/feed.xml', pages.get('feed.xml'));
pages.set('portfolio/sitemap.xml', pages.get('sitemap.xml'));
pages.set('404.html', `<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>页面未找到 — 云上男孩</title><meta name="robots" content="noindex"><script src="/assets/legacy-redirect.js?v=${redirectVersion}"></script></head><body><p>这个页面暂时没有找到。<a href="${origin}">返回博客主页 →</a></p></body></html>\n`);

for (const [path, content] of pages) {
  const target = resolve(root, path);
  if (process.argv.includes('--check')) {
    if (await readFile(target, 'utf8') !== content) throw new Error(`Generated page is stale: ${path}`);
  } else {
    await mkdir(dirname(target), {recursive: true});
    await writeFile(target, content);
  }
}
console.log(`${process.argv.includes('--check') ? 'Checked' : 'Built'} ${pages.size} files: ${projects.length} projects, ${posts.length} articles, ${updates.length} updates, ${news.editions.length} news editions / ${news.editions.reduce((sum, edition) => sum + edition.items.length, 0)} items.`);
