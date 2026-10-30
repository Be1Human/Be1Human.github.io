import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildFeed, validateUpdate, renderStatusText } from '../scripts/blog-feed.mjs';

test('statuses and articles share one chronological feed, including same-day posts', () => {
  const posts = [{id:'article',date:'2026-10-30',publishedAt:'2026-10-30T17:00:00Z'}, {id:'legacy',date:'2026-10-30',inFeed:false}];
  const updates = [{id:'older',date:'2026-10-29',content:'older'}, {id:'newer',date:'2026-10-30',publishedAt:'2026-10-30T18:00:00Z',content:'newer'}];
  const result = buildFeed(posts, updates);
  assert.deepEqual(result.map(entry => entry.id), ['newer','article','older']);
  assert.equal(result[0].permalink, 'index.html#status-newer');
  assert.equal(result[1].permalink, 'posts/article.html');
  assert.equal(posts.length, 2);
});
test('update dates, duplicate identifiers and invalid content fail before publication', () => {
  const update = {id:'hello',date:'2026-10-30',content:'A note'};
  assert.throws(() => buildFeed([], [update, update]));
  for (const patch of [{id:'../../private'}, {date:'2026-02-31'}, {content:' '}, {publishedAt:'2026-10-31T18:00:00Z'}, {image:'../../secret',imageAlt:'private'}]) assert.throws(() => validateUpdate({...update,...patch}));
  assert.equal(validateUpdate({...update,publishedAt:'2026-10-31T01:00:00Z'}).date, '2026-10-30');
});
test('a status remains full text with line breaks and escaped HTML', () => {
  const text = '第一行\n第二行\n\n<script>alert("x")</script> & 最后一段';
  assert.equal(renderStatusText(text), '<p>第一行<br>第二行</p><p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; 最后一段</p>');
  assert(renderStatusText('全文'.repeat(1000)).includes('全文'.repeat(1000)));
});
test('the published homepage shows a status and article previews with working full articles', async () => {
  const index = await readFile(new URL('../index.html',import.meta.url),'utf8');
  const posts = JSON.parse(await readFile(new URL('../data/posts.json',import.meta.url),'utf8'));
  const updates = JSON.parse(await readFile(new URL('../data/updates.json',import.meta.url),'utf8'));
  for (const update of updates) {
    assert(index.includes(`id="status-${update.id}"`));
    assert(index.includes(renderStatusText(update.content)));
  }
  for (const post of posts.filter(post => post.inFeed !== false)) {
    assert(index.includes(`href="posts/${post.id}.html"`));
    const article = await readFile(new URL(`../posts/${post.id}.html`,import.meta.url),'utf8');
    assert(article.includes(post.sections[0].paragraphs[0]));
    assert(!index.includes(post.sections[0].paragraphs[0]));
  }
  assert(!index.includes('blog-entry--featured'));
  assert(!index.includes('id="article-a-new-home-for-ideas"'));
});
