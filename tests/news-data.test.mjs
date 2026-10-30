import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeEdition, buildArchive, httpsUrl, validateEditionId } from '../scripts/news-data.mjs';

const fixture = () => ({date: '2026-10-29', label: '一期精选', comment: 'PRIVATE EDITION DRAFT', items: [{title: '<script>alert(1)</script>', summary: '公开资讯摘要', category: '科技动态', author: '原作者', url: 'https://example.com/original', comment: 'PRIVATE QUOTE DRAFT', verificationNotes: 'PRIVATE NOTES', reviewStatus: 'pending', sources: [{title: '官方资料', url: 'https://example.com/docs', secret: 'PRIVATE SOURCE FIELD'}], media: []}]});

test('publishing uses an allowlist and does not leak quote drafts or research metadata', () => {
  const edition = normalizeEdition(fixture(), '2026-10-29');
  assert(!JSON.stringify(edition).includes('PRIVATE'));
  assert.equal(edition.items[0].summary, '公开资讯摘要');
  assert.deepEqual(Object.keys(edition.items[0].sources[0]), ['title', 'url']);
});
test('rejects script URLs and embedded credentials', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,evil', 'http://example.com', 'https://user:password@example.com']) assert.throws(() => httpsUrl(url));
});
test('rejects path traversal, impossible dates and mismatched edition contents', () => {
  for (const id of ['../../secret', '2026-02-31', '2026-13-01', '2026-10-29/../../private']) assert.throws(() => validateEditionId(id));
  assert.throws(() => normalizeEdition(fixture(), '2026-10-28'));
});
test('preserves same-day evening editions as distinct archive entries', () => {
  assert.equal(normalizeEdition(fixture(), '2026-10-29-evening').id, '2026-10-29-evening');
});
test('incomplete or duplicate source items fail without silently losing news', () => {
  const raw = fixture(); raw.items.push({...raw.items[0]});
  assert.throws(() => normalizeEdition(raw, raw.date));
  assert.throws(() => normalizeEdition({...fixture(), items: []}, '2026-10-29'));
});
test('unchanged imports are idempotent and preserve the successful sync timestamp', () => {
  const edition = normalizeEdition(fixture(), '2026-10-29');
  const previous = buildArchive([edition], null, 'a'.repeat(40), '2026-10-30T08:00:00Z');
  const next = buildArchive([edition], previous, 'b'.repeat(40), '2026-10-31T08:00:00Z');
  assert.equal(next, previous);
});
test('unexpected archive shrinkage retains the previous archive', () => {
  const older = normalizeEdition({...fixture(), date: '2026-10-28'}, '2026-10-28');
  const latest = normalizeEdition(fixture(), '2026-10-29');
  const previous = buildArchive([older, latest], null, 'a'.repeat(40));
  assert.throws(() => buildArchive([latest], previous, 'b'.repeat(40)));
  assert.equal(previous.editions.length, 2);
});
test('the real public archive contains only public fields and every issue has an output page', async () => {
  const archive = JSON.parse(await readFile(new URL('../data/news.json', import.meta.url)));
  assert(archive.editions.length > 0);
  for (const edition of archive.editions) {
    const html = await readFile(new URL(`../news/${edition.id}.html`, import.meta.url), 'utf8');
    for (const item of edition.items) {
      assert(!Object.hasOwn(item, 'comment'));
      assert(!Object.hasOwn(item, 'verificationNotes'));
      assert(html.includes(`id="item-${item.id}"`));
    }
  }
});
