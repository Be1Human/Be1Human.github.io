import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { httpsUrl, textValue, validateEditionId } from './news-data.mjs';

const localRoot = fileURLToPath(new URL('../', import.meta.url));
const json = value => JSON.stringify(value, null, 2) + '\n';
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;'}[char]));

async function optionalJSON(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

function safeImagePath(path) {
  return typeof path === 'string' && /^assets\/news\/[a-zA-Z0-9._/-]+$/.test(path) && !path.split('/').includes('..');
}

async function localImageExists(root, path) {
  if (!safeImagePath(path)) return false;
  try { await access(resolve(root, path)); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

function diagram(item) {
  const lines = [];
  let line = '', units = 0;
  for (const char of item.title) {
    const width = char.codePointAt(0) < 128 ? 1 : 2;
    if (units + width > 47) { lines.push(line); line = ''; units = 0; }
    line += char; units += width;
  }
  if (line) lines.push(line);
  const title = lines.slice(0, 4).map((text, i) => `<text x="78" y="${300+i*66}" fill="#e9dfcd" font-size="42" font-weight="600">${escape(text)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750">
<rect width="1200" height="750" fill="#172e39"/>
<g fill="none" stroke="#8bccce" opacity=".16"><path d="M0 140H1200M0 610H1200M65 0V750M1135 0V750"/><rect x="1020" y="205" width="72" height="72"/><path d="M1020 241H1092M1056 205V277"/></g>
<g font-family="'Noto Sans SC','Microsoft YaHei',sans-serif">
<text x="78" y="83" fill="#8bccce" font-size="20" letter-spacing="4">CLOUD BOY / CONCEPT NOTES</text>
<rect x="78" y="184" width="9" height="38" fill="#ff918b"/>
<text x="110" y="213" fill="#b39acb" font-size="25">${escape(item.category)}</text>
${title}
<text x="78" y="672" fill="#8bccce" font-size="21">主题示意图 · 非原帖图片</text>
<text x="78" y="708" fill="#8bccce" font-family="monospace" font-size="15">${escape(item.id.toUpperCase())}</text>
</g></svg>\n`;
}

// Only these derived files may be added by the existing automatic news publisher.
export function isExperienceNewsOutput(path) {
  return path === 'assets/news/archive.json'
    || /^assets\/news\/editions\/\d{4}-\d{2}-\d{2}(?:-[a-z0-9-]+)?\.json$/.test(path)
    || /^assets\/news\/item-[a-f0-9]{16}-diagram\.svg$/.test(path);
}

// The public data/news.json is authoritative. Cached images are presentation
// assets only: never reuse their older titles, summaries, dates or source links.
export async function buildExperienceNews({root = localRoot, archive} = {}) {
  archive ||= JSON.parse(await readFile(resolve(root, 'data/news.json'), 'utf8'));
  if (!Array.isArray(archive.editions) || !archive.editions.length) throw new Error('Empty public news archive');
  const editions = [...archive.editions].sort((a, b) => b.id.localeCompare(a.id));
  const ids = new Set();
  for (const edition of editions) {
    validateEditionId(edition.id);
    if (ids.has(edition.id)) throw new Error('Duplicate experience news edition');
    ids.add(edition.id);
    if (edition.date !== edition.id.slice(0, 10) || !edition.items?.length) throw new Error('Invalid experience news edition');
  }

  const previous = await optionalJSON(resolve(root, 'assets/news/archive.json'));
  const snapshot = await optionalJSON(resolve(root, 'content-local.json'));
  const cached = new Map((snapshot?.news?.items || []).map(n => [n.source, n]));
  // Resolve filenames from validated IDs rather than trusting a prior manifest's URLs.
  for (const entry of previous?.editions || []) {
    validateEditionId(entry.id);
    const edition = await optionalJSON(resolve(root, `assets/news/editions/${entry.id}.json`));
    for (const item of edition?.items || []) cached.set(item.source, item);
  }

  const outputs = new Map();
  const manifest = {
    version: 1, sourceName: archive.sourceName, sourceUrl: httpsUrl(archive.sourceUrl),
    sourceRevision: archive.sourceRevision, syncedAt: archive.syncedAt,
    sourceSha256: createHash('sha256').update(json(archive)).digest('hex'),
    newest: editions[0].id, oldest: editions.at(-1).id,
    totalItems: editions.reduce((sum, edition) => sum + edition.items.length, 0), editions: [],
  };
  for (const edition of editions) {
    const seen = new Set();
    const items = [];
    for (const raw of edition.items) {
      const id = raw.id?.replace(/^item-/, '');
      if (!/^[a-f0-9]{16}$/.test(id)) throw new Error('Invalid experience news item ID');
      const source = httpsUrl(raw.url);
      if (seen.has(source)) throw new Error('Duplicate original post in experience news edition');
      seen.add(source);
      const item = {
        id: `item-${id}`, title: textValue(raw.title, 'news title', 300),
        summary: textValue(raw.summary, 'news summary'), category: raw.category || '科技动态',
        author: raw.author || '', publishedAt: raw.publishedAtISO || null, source,
        relatedLinks: (raw.sources || []).filter(s => s.url !== source).map(s => ({label: s.title || '来源资料', url: httpsUrl(s.url)})),
      };
      const prior = cached.get(source);
      const priorIsCurrent = prior?.imageKind !== 'diagram' || (prior.title === item.title && prior.category === item.category);
      if (priorIsCurrent && await localImageExists(root, prior?.image)) {
        Object.assign(item, {image: prior.image, imageAlt: prior.imageKind === 'diagram' ? (prior.imageAlt || item.title) : (raw.preview?.alt || item.title), imageKind: prior.imageKind === 'diagram' ? 'diagram' : 'original'});
        if (prior.originalImage) item.originalImage = httpsUrl(prior.originalImage);
      } else if (await localImageExists(root, `assets/news/${item.id}.webp`)) {
        Object.assign(item, {image: `assets/news/${item.id}.webp`, imageAlt: raw.preview?.alt || item.title, imageKind: 'original'});
        if (raw.preview?.url) item.originalImage = httpsUrl(raw.preview.url);
      } else if (raw.preview?.url) {
        Object.assign(item, {image: httpsUrl(raw.preview.url), imageAlt: raw.preview.alt || item.title, imageKind: 'original'});
      } else {
        Object.assign(item, {image: `assets/news/${item.id}-diagram.svg`, imageAlt: item.title+'：主题示意图，非原帖图片', imageKind: 'diagram'});
        outputs.set(item.image, diagram(item));
      }
      items.push(item);
    }
    const url = `assets/news/editions/${edition.id}.json`;
    outputs.set(url, json({id: edition.id, date: edition.date, label: edition.label || edition.date, source: httpsUrl(edition.sourceUrl || archive.sourceUrl), items}));
    manifest.editions.push({id: edition.id, date: edition.date, label: edition.label || edition.date, count: items.length, url});
  }
  outputs.set('assets/news/archive.json', json(manifest));
  return outputs;
}

export async function syncExperienceNews({root = localRoot, archive, check = false} = {}) {
  const outputs = await buildExperienceNews({root, archive});
  let written = 0;
  for (const [path, content] of outputs) {
    const target = resolve(root, path);
    let current;
    try { current = await readFile(target, 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (current === content) continue;
    if (check) throw new Error(`Generated experience news is stale: ${path}`);
    await mkdir(dirname(target), {recursive: true});
    await writeFile(target, content);
    written++;
  }
  return {files: outputs.size, written};
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await syncExperienceNews({check: process.argv.includes('--check')});
  console.log(`Experience news: ${result.files} derived files, ${result.written} updated.`);
}
