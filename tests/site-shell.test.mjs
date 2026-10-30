import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('every public route shares the site navigation, identity, footer and stylesheet', async () => {
  const posts = JSON.parse(await read('data/posts.json'));
  const news = JSON.parse(await read('data/news.json'));
  const routes = [
    ['index.html', 'index.html'], ['journal.html', 'index.html'],
    ['works.html', 'works.html'], ['news.html', 'news.html'],
    ...posts.map(post => [`posts/${post.id}.html`, 'index.html']),
    ...news.editions.map(edition => [`news/${edition.id}.html`, 'news.html']),
  ];
  const home = await read('index.html');
  const extract = (html, tag, name) => html.match(new RegExp(`<${tag} class="${name}">[\\s\\S]*?</${tag}>`))?.[0];
  const normalize = html => html.replaceAll('../', '').replaceAll(' aria-current="page"', '');
  const expectedHeader = normalize(extract(home, 'header', 'blog-header'));
  const expectedFooter = normalize(extract(home, 'footer', 'blog-footer'));
  const stylesheet = home.match(/href="(assets\/styles\.css\?v=[a-f0-9]+)"/)[1];
  for (const [route, active] of routes) {
    const html = await read(route);
    const base = route.includes('/') ? '../' : '';
    const header = extract(html, 'header', 'blog-header');
    assert.ok(header, `${route}: shared header missing`);
    assert.equal(normalize(header), expectedHeader, `${route}: navigation or identity diverged`);
    assert.equal(normalize(extract(html, 'footer', 'blog-footer')), expectedFooter, `${route}: footer diverged`);
    assert.ok(header.includes(`href="${base}${active}" aria-current="page"`), `${route}: incorrect navigation selection`);
    assert.ok(html.includes(`href="${base}${stylesheet}"`), `${route}: wrong stylesheet version or relative URL`);
    assert.equal([...html.matchAll(/<h1[\s>]/g)].length, 1, `${route}: one page title required`);
  }
});
