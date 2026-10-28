import { readFile, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const projects = JSON.parse(await readFile(resolve(root, 'data/projects.json'), 'utf8'));
const source = await readFile(resolve(root, 'src/index.template.html'), 'utf8');
const categories = { all: '全部作品', games: '游戏实验', visuals: '动态视觉', tools: 'AI 与工具' };
const ids = new Set();
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const newWindow = '<span class="sr-only">（新窗口）</span>';
const external = 'target="_blank" rel="noopener noreferrer"';
if (!Array.isArray(projects) || !projects.length) throw new Error('作品列表不能为空。');
for (const project of projects) {
  for (const field of ['id', 'title', 'name', 'category', 'label', 'description', 'image', 'imageAlt', 'imageNote', 'url', 'action', 'repository']) {
    if (typeof project[field] !== 'string' || !project[field].trim()) throw new Error(`作品缺少 ${field}。`);
  }
  if (ids.has(project.id)) throw new Error(`重复作品 ID：${project.id}`);
  ids.add(project.id);
  if (!Object.hasOwn(categories, project.category) || project.category === 'all') throw new Error(`无效分类：${project.category}`);
  if (!Array.isArray(project.tags) || !project.tags.length || project.tags.some((tag) => typeof tag !== 'string' || !tag.trim())) throw new Error(`无效标签：${project.id}`);
  if (!/^assets\/images\/[\w.-]+$/.test(project.image)) throw new Error(`无效本地图片：${project.image}`);
  await access(resolve(root, project.image));
  for (const field of ['url', 'repository']) {
    const url = new URL(project[field]);
    if (url.protocol !== 'https:' || !['github.com', 'be1human.github.io'].includes(url.hostname)) throw new Error(`请检查作品链接：${url}`);
  }
}
const filters = Object.entries(categories).map(([id, name]) => {
  const count = id === 'all' ? projects.length : projects.filter((project) => project.category === id).length;
  return `<button class="filter" type="button" data-filter="${id}" aria-pressed="${id === 'all'}">${name}<span>${String(count).padStart(2, '0')}</span></button>`;
}).join('\n');
const cards = projects.map((project, index) => {
  const p = Object.fromEntries(Object.entries(project).map(([key, value]) => [key, typeof value === 'string' ? escape(value) : value]));
  return `<article class="project-card" data-category="${p.category}" data-project="${p.id}"${p.artwork ? ` data-artwork="${p.artwork}"` : ''}>
        <a class="project-image-link" href="${p.url}" ${external} aria-label="${p.name}：${p.action}（新窗口）">
          <img class="project-image" src="${p.image}" width="1200" height="706" alt="${p.imageAlt}" loading="lazy" decoding="async">
          ${project.artwork === 'clawpm' ? '<span class="clawpm-art-title" aria-hidden="true">ClawPM</span><span class="clawpm-art-subtitle" aria-hidden="true">IDEAS → TASKS → DONE</span>' : ''}
          <span class="image-note">${p.imageNote}</span><span class="project-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
        </a>
        <div class="project-meta"><span class="project-category">${p.label}</span><span class="project-name">${p.name}</span></div>
        <h3><a href="${p.url}" ${external}>${p.title}${newWindow}</a></h3>
        <p class="project-description">${p.description}</p>
        <div class="project-bottom"><div class="project-tags" aria-label="技术与关键词">${project.tags.map((tag) => `<span>${escape(tag)}</span>`).join('')}</div>
        <div class="project-links"><a href="${p.repository}" class="source-link" ${external}>源码${newWindow}</a><a href="${p.url}" ${external}>${p.action} <span aria-hidden="true">↗</span>${newWindow}</a></div></div>
      </article>`;
}).join('\n');
let html = source.replace('{{FILTERS}}', filters).replace('{{PROJECTS}}', cards).replaceAll('{{TOTAL}}', String(projects.length)).replaceAll('{{YEAR}}', '2026').replace(/[\t ]+$/gm, '');
if (/\{\{[A-Z]+\}\}/.test(html)) throw new Error('页面含未替换的模板变量。');
if (process.argv.includes('--check')) {
  const current = await readFile(resolve(root, 'index.html'), 'utf8');
  if (current !== html) throw new Error('index.html 与作品数据不一致。请先运行 npm run build。');
  console.log(`检查通过：${projects.length} 个作品，${Object.keys(categories).length - 1} 个分类，本地配图和发布页面完整。`);
} else {
  await writeFile(resolve(root, 'index.html'), html);
  console.log(`已生成 index.html：${projects.length} 个作品。`);
}
