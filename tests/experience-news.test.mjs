import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { buildExperienceNews, isExperienceNewsOutput, syncExperienceNews } from '../scripts/experience-news.mjs';

const item = (id = 'a'.repeat(16), patch = {}) => ({
  id, title: '新工具与制作流程', summary: '保留原作者的公开摘要。', category: '内容制作', author: '原作者',
  url: `https://example.com/post/${id}`, sources: [{title: '官方资料', url: 'https://example.com/docs'}],
  publishedAtISO: '2026-11-03T04:05:00.000Z', ...patch,
});
const edition = (id, items) => ({id, date: id.slice(0, 10), label: id, sourceUrl: `https://example.com/?date=${id}`, items});
const archive = editions => ({version: 1, sourceName: '每日精选', sourceUrl: 'https://example.com/', sourceRevision: 'a'.repeat(40), syncedAt: '2026-11-03T12:00:00.000Z', editions});
const parse = (outputs, path) => JSON.parse(outputs.get(path));
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'portfolio-news-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const put = async (path, content) => {
    await mkdir(dirname(join(root, path)), {recursive: true});
    await writeFile(join(root, path), typeof content === 'string' ? content : JSON.stringify(content));
  };
  return {root, put};
}

test('all editions survive conversion, evening IDs stay distinct, and the latest is the default', async t => {
  const {root} = await fixture(t);
  const source = archive([
    edition('2026-11-02', [item('c'.repeat(16))]),
    edition('2026-11-03-evening', [item('b'.repeat(16))]),
    edition('2026-11-03', [item()]),
  ]);
  const snapshot = structuredClone(source);
  const outputs = await buildExperienceNews({root, archive: source});
  const manifest = parse(outputs, 'assets/news/archive.json');
  assert.deepEqual(manifest.editions.map(e => e.id), ['2026-11-03-evening', '2026-11-03', '2026-11-02']);
  assert.equal(manifest.newest, '2026-11-03-evening');
  assert.equal(manifest.oldest, '2026-11-02');
  assert.equal(manifest.totalItems, 3);
  assert.equal(manifest.sourceRevision, source.sourceRevision);
  assert(!Object.hasOwn(manifest, 'items'), 'the index must not eagerly contain the full history');
  for (const entry of manifest.editions) {
    const result = parse(outputs, entry.url);
    assert.equal(result.id, entry.id);
    assert.equal(result.items.length, entry.count);
    assert.equal(result.items[0].publishedAt, '2026-11-03T04:05:00.000Z');
    assert.equal(result.items[0].id.length, 21);
  }
  assert.deepEqual(source, snapshot, 'conversion must not mutate authoritative data');
});

test('new posts use their original preview URL without network downloads; missing images get labelled escaped diagrams', async t => {
  const {root} = await fixture(t);
  const original = item('a'.repeat(16), {preview: {url: 'https://pbs.twimg.com/media/example.jpg', alt: '作者原图'}});
  const missing = item('b'.repeat(16), {title: '<script> & 新工具', category: '<内容>', comment: 'PRIVATE DRAFT', verificationNotes: 'PRIVATE NOTES'});
  const outputs = await buildExperienceNews({root, archive: archive([edition('2026-11-03', [original, missing])])});
  const [first, second] = parse(outputs, 'assets/news/editions/2026-11-03.json').items;
  assert.equal(first.image, original.preview.url);
  assert.equal(first.imageKind, 'original');
  assert.equal(first.imageAlt, '作者原图');
  assert.equal(second.imageKind, 'diagram');
  assert.match(second.imageAlt, /非原帖图片/);
  const svg = outputs.get(second.image);
  assert(svg.includes('主题示意图 · 非原帖图片'));
  assert(svg.includes('&lt;script&gt; &amp; 新工具'));
  assert(!svg.includes('<script>'));
  assert(!JSON.stringify([...outputs]).includes('PRIVATE'));
});

test('local cached originals and diagrams are retained while corrected public summaries take effect', async t => {
  const {root, put} = await fixture(t);
  await put('assets/news/editions/2026-11-02.json', {items: [
    {source: item().url, title: '旧标题', summary: '旧摘要', image: 'assets/news/cached.webp', imageKind: 'original'},
    {source: item('b'.repeat(16)).url, title: item().title, category: item().category, image: 'assets/news/old-diagram.svg', imageKind: 'diagram'},
  ]});
  await put('assets/news/archive.json', {editions: [{id: '2026-11-02'}]});
  await put('assets/news/cached.webp', 'original-image-bytes');
  await put('assets/news/old-diagram.svg', '<svg>approved diagram</svg>');
  const outputs = await buildExperienceNews({root, archive: archive([edition('2026-11-03', [item(), item('b'.repeat(16))])])});
  const [first, second] = parse(outputs, 'assets/news/editions/2026-11-03.json').items;
  assert.equal(first.image, 'assets/news/cached.webp');
  assert.equal(first.title, item().title);
  assert.equal(first.summary, item().summary);
  assert.equal(first.imageAlt, item().title);
  assert.equal(second.image, 'assets/news/old-diagram.svg');
  assert(!outputs.has('assets/news/cached.webp'));
  assert(!outputs.has('assets/news/old-diagram.svg'));
  assert.equal(await readFile(join(root, first.image), 'utf8'), 'original-image-bytes');
});

test('sync changes only derived news outputs, preserving Jev, the interactive homepage, and article data', async t => {
  const {root, put} = await fixture(t);
  const preserved = {
    'content-local.json': JSON.stringify({journal: [{id: 'jev-co-creation', title: '人与 AI 共创', sections: [{paragraphs:['我自己的 Jev 阅读笔记']}]}], news: {items: []}}),
    'data/posts.json': '[{"id":"jev-co-creation","title":"已有文章"}]',
    'index.html': '<h1>在彼此的思考里生长。</h1>',
    'src/experience/index.html': '<h1>在彼此的思考里生长。</h1>',
    'app.js': 'approved interactive runtime',
    'style.css': 'approved visual style',
  };
  for (const [path, content] of Object.entries(preserved)) await put(path, content);
  const data = archive([edition('2026-11-03', [item()])]);
  const first = await syncExperienceNews({root, archive: data});
  assert(first.written > 0);
  const second = await syncExperienceNews({root, archive: data});
  assert.equal(second.written, 0, 'unchanged sync must not rewrite files');
  await syncExperienceNews({root, archive: data, check: true});
  for (const [path, content] of Object.entries(preserved)) assert.equal(await readFile(join(root, path), 'utf8'), content, path);
  assert.deepEqual((await readdir(join(root, 'assets/news/editions'))), ['2026-11-03.json']);
  await put('assets/news/editions/2026-11-03.json', '{}');
  await assert.rejects(syncExperienceNews({root, archive: data, check: true}), /stale/);
});

test('corrections to a diagram title regenerate its visible text, not stale cached text', async t => {
  const {root} = await fixture(t);
  const data = archive([edition('2026-11-03', [item()])]);
  await syncExperienceNews({root, archive: data});
  data.editions[0].items[0].title = '更正后的新闻标题';
  await syncExperienceNews({root, archive: data});
  const output = JSON.parse(await readFile(join(root, 'assets/news/editions/2026-11-03.json'), 'utf8'));
  assert((await readFile(join(root, output.items[0].image), 'utf8')).includes('更正后的新闻标题'));
});

test('automatic publisher accepts derived news files without allowing unrelated content changes', () => {
  for (const path of ['assets/news/archive.json', 'assets/news/editions/2026-11-03.json', 'assets/news/editions/2026-10-13-evening.json', 'assets/news/item-'+ 'a'.repeat(16)+'-diagram.svg']) assert(isExperienceNewsOutput(path), path);
  for (const path of ['content-local.json', 'app.js', 'index.html', 'assets/news/../../private.json', 'assets/news/editions/../../private.json', 'assets/news/secret.json', 'assets/news/any.svg', 'assets/news/item-'+ 'a'.repeat(16)+'.webp']) assert(!isExperienceNewsOutput(path), path);
});
