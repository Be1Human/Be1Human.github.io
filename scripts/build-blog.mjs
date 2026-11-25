import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { httpsUrl, validateEditionId } from './news-data.mjs';
import { buildFeed, postPagePath, renderStatusText } from './blog-feed.mjs';
import { projectCategories, projectPagePath, validateProject } from './project-data.mjs';
import { buildExperienceNews } from './experience-news.mjs';
import { readLearning, learningPages } from './learning.mjs';
import { renderRichContent } from './rich-content.mjs';
import { renderSiteNavigation } from './site-navigation.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJSON = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const [projects, posts, news, evidence, template, updates] = await Promise.all([
  readJSON('data/projects.json'), readJSON('data/posts.json'), readJSON('data/news.json'), readJSON('data/content-sources.json'), readFile(resolve(root, 'src/page.template.html'), 'utf8'),
  readJSON('data/updates.json'),
]);
const origin = 'https://be1human.github.io/';
async function assetVersion(path) {
  // Match the LF bytes Git publishes, including files edited with CRLF locally.
  const content = (await readFile(resolve(root, path), 'utf8')).replaceAll('\r\n', '\n');
  return createHash('sha256').update(content).digest('hex').slice(0, 12);
}
const styleVersion = await assetVersion('assets/site.css');
const scriptVersion = await assetVersion('assets/app.js');
const learnStyleVersion = await assetVersion('assets/learn.css');
const learnScriptVersion = await assetVersion('assets/learn.js');
const directoryStyleVersion = await assetVersion('assets/learn-directory.css');
const directoryScriptVersion = await assetVersion('assets/learn-directory.js');
const readingStyleVersion = await assetVersion('assets/reading.css');
const readingScriptVersion = await assetVersion('assets/reading.js');
const workflowStyle = 'assets/project-workflow.css';
const workflowStyleVersion = await assetVersion(workflowStyle);
const attentionScriptVersion = await assetVersion('assets/attention.js');
const kvCacheScriptVersion = await assetVersion('assets/kv-cache.js');
const learningModules = {
  'learn/softmax-attention.html': ['attention.js', attentionScriptVersion],
  'learn/kv-cache.html': ['kv-cache.js', kvCacheScriptVersion],
};
const projectSlidesStyleVersion = await assetVersion('assets/project-slides.css');
const archiveStyleVersion = await assetVersion('assets/archive.css');
const archiveHead = (base = '') => `<link rel="stylesheet" href="${base}assets/archive.css?v=${archiveStyleVersion}">`;
const e = value => String(value).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
const external = 'target="_blank" rel="noopener noreferrer"';
const number = value => String(value).padStart(2, '0');
const dateLabel = date => `${Number(date.slice(5, 7))} 月 ${Number(date.slice(8, 10))} 日`;
const minutes = post => Math.max(1, Math.ceil(post.sections.reduce((n, section) => n + section.paragraphs.join('').length, 0) / 400));
const categories = projectCategories;
const pages = new Map();
const learning = await readLearning(root);
const learningOutput = learningPages(learning);
const experienceContent = await readJSON('content-local.json');
experienceContent.journal = experienceContent.journal.map(entry => {
  const post = posts.find(post => post.id === entry.id);
  if (!post) throw new Error('Unknown featured journal entry: ' + entry.id);
  const { id, title, summary, date, image, imageAlt } = post;
  return { id, title, summary, date, image, imageAlt, imageFit: entry.imageFit, page: postPagePath(post) };
});
// The interactive homepage fetches the small index and just one edition at a
// time; keep it synchronized with the same authoritative public archive.
for (const [path, content] of await buildExperienceNews({root, archive: news})) pages.set(path, content);

function unique(items, key) {
  if (new Set(items.map(item => item[key])).size !== items.length) throw new Error(`Duplicate ${key}`);
}
unique(projects, 'id'); unique(posts, 'id'); unique(news.editions, 'id');
for (const project of projects) {
  const source = evidence.projects.find(source => source.projectId === project.id);
  validateProject(project, source);
  await access(resolve(root, project.image));
  for (const section of project.detail.sections) {
    for (const image of section.images ?? []) await access(resolve(root, image.src));
    if (section.video) {
      await access(resolve(root, section.video.src));
      await access(resolve(root, section.video.poster));
    }
  }
}
// Keep the experience index for card navigation. The project HTML owns the introduction.
experienceContent.projects = projects.map(({ id, title, category, label, image, imageAlt, tags }) =>
  ({ id, title, category, categoryLabel: label, image, imageAlt, tags, page: projectPagePath({ id }) })
);
delete experienceContent.featuredProject;
pages.set('content-local.json',JSON.stringify(experienceContent,null,2)+'\n');
for (const post of posts) {
  if (post.learningId && !learning.some(article=>article.id===post.learningId)) throw new Error('Unknown learning article link');
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
const redirectVersion = await assetVersion('assets/legacy-redirect.js');

function render(path, title, description, active, content, ogtype = 'website', extraPageHead = '') {
  const base = path.includes('/') ? '../' : '';
  const nav = renderSiteNavigation({base, active});
  let html = template;
  const learningModule = learningModules[path];
  const extraHead = active === 'learning' ? `<link rel="stylesheet" href="${base}assets/learn.css?v=${learnStyleVersion}"><script src="${base}assets/learn.js?v=${learnScriptVersion}" defer></script>${path==='learn.html'?`<link rel="stylesheet" href="assets/learn-directory.css?v=${directoryStyleVersion}"><script src="assets/learn-directory.js?v=${directoryScriptVersion}" defer></script>`:''}${learningModule?`<script type="module" src="${base}assets/${learningModule[0]}?v=${learningModule[1]}"></script>`:''}` : '';
  const brandedTitle = title.replaceAll('CLOUD BOY · 云上男孩', '克劳德梦见电子羊').replaceAll('— CLOUD BOY', '— 克劳德梦见电子羊');
  const variables = {TITLE: e(brandedTitle), DESCRIPTION: e(description), CANONICAL: origin + (path === 'index.html' ? '' : path), OGTYPE: ogtype, BASE: base, PAGE: path==='learn.html'?'learning-directory':active, STYLE_VERSION: styleVersion, SCRIPT_VERSION: scriptVersion, READING_STYLE_VERSION:readingStyleVersion, READING_SCRIPT_VERSION:readingScriptVersion, NAV: nav, CONTENT: content, EXTRA_HEAD: extraHead + extraPageHead};
  for (const [key, value] of Object.entries(variables)) html = html.replaceAll(`{{${key}}}`, value);
  if (/\{\{[A-Z_]+\}\}/.test(html)) throw new Error(`Unfilled template: ${path}`);
  pages.set(path, html);
}

function heading(id, title, description, extra = '') {
  return `<header class="panel-heading"><div><h1 id="${id}">${title}</h1><p>${description}</p></div>${extra}</header>`;
}

function selectedCoverVideo(project) {
  return project.detail?.coverVideo
    ? project.detail.sections.find(section => section.video?.src === project.detail.coverVideo).video
    : null;
}

function projectCard(project) {
  const [width, height] = project.detail?.coverSize ?? [1200, 706];
  const preview = selectedCoverVideo(project);
  const media = preview
    ? `<project-preview><video src="${e(preview.src)}" poster="${e(preview.poster)}" muted playsinline preload="none" width="${preview.width}" height="${preview.height}" style="width:100%;height:100%;object-fit:contain;display:block;background:#20292e" aria-hidden="true"></video></project-preview>`
    : `<img src="${e(project.image)}" alt="${e(project.imageAlt)}" title="${e(project.imageNote)}" loading="lazy" decoding="async" width="${width}" height="${height}">`;
  const path = e(projectPagePath(project));

  return `<article class="project-card" id="${e(project.id)}" data-filter-item data-category="${e(project.category)}"${project.categories ? ` data-categories="${e(project.categories.join(' '))}"` : ''} data-search="${e([project.title, project.description, project.kind, ...project.tags].join(' '))}">
    <a class="project-image-link" href="${path}" aria-label="查看 ${e(project.title)}">${media}</a>
    <div class="project-body"><div class="meta"><span class="category-label">${e(project.label)}</span><span>${e(project.kind)}</span></div><h3><a href="${path}">${e(project.title)} <span aria-hidden="true">→</span></a></h3><p>${e(project.description)}</p><div class="project-bottom"><div class="tags">${project.tags.map(tag => `<span>${e(tag)}</span>`).join('')}</div><a class="subtle-link" href="${path}">查看项目 →</a></div></div>
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
const projectList = `<div class="works-list" data-filterable>${controls(Object.entries(categories), '搜索作品或技术…', projects.length, '件作品')}<div class="project-grid">${projects.map(projectCard).join('')}</div>${empty}</div>`;

const home = `<section class="site-panel activity-feed" aria-labelledby="home-title">${heading('home-title', '动态', '日常的记录，与慢慢写下的长文。', '<a class="heading-link" href="feed.xml" aria-label="通过 RSS 订阅动态">RSS <span aria-hidden="true">↗</span></a>')}<div class="feed-entries">${feed.map(feedEntry).join('')}</div></section>`;
// Preserve the approved interactive homepage when rebuilding news and archives.
const homepageTemplate = await readFile(resolve(root, 'src/experience/index.html'), 'utf8');
const homepageAssets = new Map([
  ['assets/archive.css', archiveStyleVersion], ['assets/app.js', scriptVersion],
]);
let homepage = homepageTemplate.replace('<!--SITE_NAVIGATION-->',`<!--HOME_NAV_START-->${renderSiteNavigation({interactive:true})}<!--HOME_NAV_END-->`);
homepage = homepage.replace('<!--WORKS_LIST-->', `<!--WORKS_LIST_START-->${projectList}<!--WORKS_LIST_END-->`);
for (const [path,version] of homepageAssets) homepage=homepage.replaceAll(`"${path}"`,`"${path}?v=${version}"`);
pages.set('index.html', homepage);

render('works.html', '作品集 — CLOUD BOY · 云上男孩', `Agent、游戏、视觉与研究实验，共 ${projects.length} 件作品及项目记录。`, 'works', `<script type="module" src="assets/project-preview.js"></script><section class="site-panel works-page" aria-labelledby="works-title">${heading('works-title', '作品集', '做过的作品，正在进行的尝试。')}<div class="panel-content" id="works">${projectList}</div></section>`, 'website', archiveHead());

function projectFigure({src, alt, caption, width, height}, cover = false) {
  return renderRichContent(`<figure class="learn-figure"><img src="../${e(src)}" alt="${e(alt)}" width="${width}" height="${height}" ${cover ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"><figcaption>${e(caption)}</figcaption></figure>`);
}

function projectVideo({src, poster, caption, width, height}) {
  return `<figure class="project-video"><video src="../${e(src)}" poster="../${e(poster)}" width="${width}" height="${height}" controls playsinline preload="none" aria-label="${e(caption)}"></video><figcaption>${e(caption)}</figcaption></figure>`;
}

function projectWorkflow(workflow) {
  const steps = workflow.map(({ title, tool, output }) =>
    `<li><strong>${e(title)}</strong><span class="workflow-tool">${e(tool)}</span><span class="workflow-output">${e(output)}</span></li>`
  ).join('');
  return `<ol class="project-workflow" role="list">${steps}</ol>`;
}

function projectTables(tables = []) {
  return tables.map(({ caption, columns, rows }) => {
    const header = columns.map(column => `<th scope="col">${e(column)}</th>`).join('');
    const body = rows.map(([label, ...values]) => `<tr><th scope="row">${e(label)}</th>${values.map(value => `<td>${e(value)}</td>`).join('')}</tr>`).join('');
    return `<table class="project-detail-table"><caption>${e(caption)}</caption><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
  }).join('');
}

function projectDiagram({ caption, switchable, paths }, id) {
  const route = ({ nodes, screen }) => {
    const steps = nodes.map(({ title, note }) => `<li><strong>${e(title)}</strong><span>${e(note)}</span></li>`).join('');
    const regions = screen ? `<div class="project-screen" data-region="${screen}" aria-hidden="true"><span>状态栏</span><span>聊天视口</span><span>选项卡片</span></div>` : '';
    return `<div class="project-path${screen ? ' project-path-with-screen' : ''}"><ol role="list">${steps}</ol>${regions}</div>`;
  };
  if (!switchable) {
    const tracks = paths.map(path => `<div class="project-track"><strong class="project-track-label">${e(path.name)}</strong>${route(path)}</div>`).join('');
    return `<div class="project-diagram" role="group" aria-label="${e(caption)}">${tracks}</div>`;
  }
  const choices = paths.map((path, index) => {
    const choice = `${id}-${index + 1}`;
    return `<input type="radio" class="project-choice sr-only" name="${id}" id="${choice}" aria-controls="${choice}-result"${index === 0 ? ' checked' : ''}><label for="${choice}">${e(path.name)}</label><div class="project-choice-panel" id="${choice}-result">${route(path)}</div>`;
  }).join('');
  return `<fieldset class="project-diagram project-switchboard"><legend>${e(caption)}</legend><div class="project-choices">${choices}</div></fieldset>`;
}

function projectLinks(project) {
  const links = [...(project.detail.references ?? [])];
  if (project.detail.website) links.unshift({title: '打开游戏', url: project.detail.website});
  if (project.presentation !== 'showcase') links.unshift({title: project.action, url: project.url});
  if (!links.length) return '';
  return `<section class="article-links project-links"><h2>项目链接</h2><ul>${links.map(link => `<li><a href="${e(link.url)}" ${external}>${e(link.title)} ↗</a></li>`).join('')}</ul></section>`;
}

function renderProjectSection(project, number, showHeading, coverVideo) {
  const { heading, paragraphs: [lead, ...notes], images = [], steps, tables = [], diagram, detailLabel, video, workflow } =
    project.detail.sections[number - 1];
  const sequence = steps ? `<ol class="slide-steps">${steps.map(step => `<li>${e(step)}</li>`).join('')}</ol>` : '';
  const notesHtml = notes.map(note => `<p class="slide-note">${e(note)}</p>`).join('');
  const tableHtml = projectTables(tables);
  const disclosure = detailLabel ? `<details class="slide-evidence"><summary>${e(detailLabel)}</summary>${notesHtml}${tableHtml}</details>` : '';
  const diagrams = diagram ? projectDiagram(diagram, `${project.id}-page-${number}`) : '';
  const footage = video && video !== coverVideo ? projectVideo(video) : '';
  const pictures = images.map(image => projectFigure(image)).join('');
  const media = diagrams + (detailLabel ? '' : tableHtml) + footage +
    (pictures ? `<div class="slide-pictures">${pictures}</div>` : '');
  const wide = workflow || footage || detailLabel || tables.length || images.length > 1;
  const title = showHeading ? `<h3>${e(heading)}</h3>` : '';
  return `<section class="project-slide${wide ? ' slide-wide' : ''}" id="section-${number}"><div class="slide-text">${title}<p class="slide-intro">${e(lead)}</p>${sequence}${detailLabel ? '' : notesHtml}</div>${workflow ? projectWorkflow(workflow) : ''}${media ? `<div class="slide-media">${media}</div>` : ''}${disclosure}</section>`;
}

function renderProject(project) {
  const { detail } = project;
  const { purpose, mediaHint, chapters } = detail.overview;
  const back = `<a class="back-link" href="../works.html#${project.id}">← 返回作品集</a>`;
  const coverVideo = selectedCoverVideo(project);
  const [width, height] = detail.coverSize ?? [1200, 706];
  const cover = coverVideo ? projectVideo(coverVideo) : projectFigure({
    src: project.image, alt: project.imageAlt, caption: project.imageNote, width, height,
  }, true);
  const evidence = mediaHint ? `<div class="project-preview${height > width ? ' is-portrait' : ''}"><p class="project-picture-guide">${e(mediaHint)}</p>${cover}</div>` : '';
  const navigation = chapters.length > 1
    ? `<nav class="project-nav" aria-label="项目章节">${chapters.map((chapter, index) =>
      `<a href="#chapter-${index + 1}">${e(chapter.title)}</a>`
    ).join('')}</nav>` : '';
  const body = chapters.map((chapter, index) =>
    `<section class="project-chapter" id="chapter-${index + 1}" aria-labelledby="chapter-title-${index + 1}"><h2 id="chapter-title-${index + 1}">${e(chapter.title)}</h2>${chapter.sections.map(number =>
      renderProjectSection(project, number, chapter.sections.length > 1, coverVideo)
    ).join('')}</section>`
  ).join('');
  const period = detail.period ? ` · ${e(detail.period)}` : '';
  return `<article class="site-panel project-slides" id="${project.id}"><div class="article-topbar">${back}</div><header class="slides-hero${evidence ? ' has-preview' : ''}"><div class="slides-intro"><p class="slides-category">${e(detail.status)}${period}</p><h1>${e(project.title)}</h1><p class="slides-lede">${e(project.description)}</p><p class="project-purpose">${e(purpose)}</p>${navigation}</div>${evidence}</header><div class="slides-body">${body}${projectLinks(project)}</div><footer class="slides-footer">${back}</footer></article>`;
}

for (const project of projects) {
  const workflowHead = project.detail.sections.some(section => section.workflow)
    ? `<link rel="stylesheet" href="../${workflowStyle}?v=${workflowStyleVersion}">` : '';
  const head = `<link rel="stylesheet" href="../assets/project-slides.css?v=${projectSlidesStyleVersion}">${workflowHead}`;
  render(projectPagePath(project), `${project.title} — CLOUD BOY`, project.description, 'works', renderProject(project), 'article', head);
}

render('journal.html', '克劳德梦见电子羊 · 手记', '云上男孩的文字动态与长文章，按发布时间排列。', 'journal', home);

for (const post of posts.filter(post => !post.learningId)) {
  const body = `<article class="site-panel article-page"><div class="article-topbar"><a class="back-link" href="../index.html#journal">← 返回手记</a><span>文章</span></div><div class="article-content"><header class="article-header"><div class="article-author"><div><strong>云上男孩 <span>@Be1Human</span></strong><p><time datetime="${e(post.publishedAt || post.date)}">${post.date.replaceAll('-', '.')}</time><span>·</span>${minutes(post)} 分钟阅读<span>·</span>${e(post.category)}${post.updatedAt?`<span>·</span>更新 ${e(post.updatedAt)}`:''}</p></div></div><h1>${e(post.title).replaceAll('：', '：<wbr>')}</h1><p class="article-lede">${e(post.summary)}</p></header>${post.image && !post.hideCover ? `<figure class="article-cover"><img src="../${post.image}" alt="${e(post.imageAlt)}" width="1200" height="600"><figcaption>${e(post.imageAlt)}</figcaption></figure>` : ''}<div class="prose">${post.sections.map((section, index) => `<section id="section-${index + 1}"><h2>${e(section.heading)}</h2>${section.body?renderRichContent(section.body):section.paragraphs.map(paragraph => `<p>${e(paragraph)}</p>`).join('')}</section>`).join('')}${post.links.length ? `<section class="article-links"><h2>继续探索</h2><ul>${post.links.map(link => `<li><a href="${e(link.url)}" ${external}>${e(link.title)} ↗</a></li>`).join('')}</ul></section>` : ''}</div><footer class="article-end"><div class="tags">${post.tags.map(tag => `<span># ${e(tag)}</span>`).join('')}</div><a class="back-link" href="../index.html#journal">← 返回手记</a></footer></div></article>`;
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
render('news.html', '科技新闻 — CLOUD BOY · 云上男孩', '从 Dot AI 热门 20 同步的每日科技精选，按日期归档，支持分类与搜索。', 'news', newsPage(latest, ''), 'website', archiveHead());
for (const edition of news.editions) render(`news/${edition.id}.html`, `${edition.date} 科技精选 — CLOUD BOY`, `${edition.date} 的 ${edition.items.length} 条科技精选，保留原作者和来源。`, 'news', newsPage(edition, '../'), 'website', archiveHead('../'));

for (const page of learningOutput.pages) render(page.path, page.title, page.summary, 'learning', page.body, page.path === 'learn.html' ? 'website' : 'article');
pages.set('assets/learning-search.json', JSON.stringify(learningOutput.searchIndex));

const rssItems = [
  ...feed.map(entry => ({title: entry.type === 'article' ? entry.title : entry.content.split('\n')[0].slice(0, 60), link: entry.permalink, date: entry.date, publishedAt: entry.publishedAt, summary: entry.type === 'article' ? entry.summary : entry.content})),
  ...news.editions.map(edition => ({title: `${edition.date} 科技精选 · ${edition.items.length} 条`, link: `news/${edition.id}.html`, date: edition.date, summary: edition.items.slice(0, 3).map(item => item.title).join('；')})),
].sort((a, b) => b.date.localeCompare(a.date));
pages.set('feed.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>克劳德梦见电子羊</title><link>${origin}</link><description>作品、创作手记与每日科技精选</description><language>zh-CN</language>${rssItems.map(item => `<item><title>${e(item.title)}</title><link>${origin}${item.link}</link><guid>${origin}${item.link}</guid><pubDate>${new Date(item.publishedAt || `${item.date}T12:00:00Z`).toUTCString()}</pubDate><description>${e(item.summary)}</description></item>`).join('')}</channel></rss>\n`);
pages.set('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...pages.keys()].filter(path => path.endsWith('.html')).map(path => `<url><loc>${origin}${path === 'index.html' ? '' : path}</loc></url>`).join('')}</urlset>\n`);

// Check local hrefs/srcs against this build or actual assets before writing any output.
for (const [path, html] of pages) {
  if (!path.endsWith('.html')) continue;
  const pageIds = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  if (new Set(pageIds).size !== pageIds.length) throw new Error(`Duplicate HTML ID: ${path}`);
  for (const match of html.matchAll(/\b(?:href|src)=(['"])(.*?)\1/g)) {
    const url = match[2];
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
  pages.set(`portfolio/${path}`, `<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>正在前往克劳德梦见电子羊</title><link rel="canonical" href="${target}"><meta name="robots" content="noindex"><script src="/assets/legacy-redirect.js?v=${redirectVersion}"></script><noscript><meta http-equiv="refresh" content="0;url=${target}"></noscript></head><body><p>博客已迁到新地址。<a href="${target}">继续阅读 →</a></p></body></html>\n`);
}
const mineClawTarget = origin + 'projects/mineclaw.html';
const mineClawRedirect = `<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>MineClaw</title><link rel="canonical" href="${mineClawTarget}"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=${mineClawTarget}"></head><body><a href="${mineClawTarget}">查看 MineClaw</a></body></html>\n`;
pages.set('projects/duomind.html', mineClawRedirect);
pages.set('portfolio/projects/duomind.html', mineClawRedirect);
for (const post of posts.filter(post => post.learningId)) {
  const target = origin + postPagePath(post);
  const redirect = `<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><title>${e(post.title)}</title><link rel="canonical" href="${target}"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=${target}"></head><body><a href="${target}">继续阅读 →</a></body></html>\n`;
  pages.set(`posts/${post.id}.html`, redirect);
  pages.set(`portfolio/posts/${post.id}.html`, redirect);
}
const performanceTarget = origin + 'projects/digital-performance.html';
const performanceRedirect = `<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>数字人表演生成</title><link rel="canonical" href="${performanceTarget}"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=${performanceTarget}"></head><body><a href="${performanceTarget}">查看数字人表演生成</a></body></html>\n`;
pages.set('posts/ue-character-performance-pipeline.html', performanceRedirect);
pages.set('portfolio/posts/ue-character-performance-pipeline.html', performanceRedirect);
// Feed readers do not execute JavaScript; keep their existing subscription live.
pages.set('portfolio/feed.xml', pages.get('feed.xml'));
pages.set('portfolio/sitemap.xml', pages.get('sitemap.xml'));
pages.set('404.html', `<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>页面未找到 — 克劳德梦见电子羊</title><meta name="robots" content="noindex"><script src="/assets/legacy-redirect.js?v=${redirectVersion}"></script></head><body><p>这个页面暂时没有找到。<a href="${origin}">返回博客主页 →</a></p></body></html>\n`);

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
