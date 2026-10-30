import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('old page URLs preserve deep paths, filters and anchors on the same root domain', async () => {
  const script = await read('assets/legacy-redirect.js');
  for (const [path, expected] of [
    ['/portfolio/', '/'],
    ['/portfolio', '/'],
    ['/portfolio/index.html#status-blog-launch', '/#status-blog-launch'],
    ['/portfolio/works.html?category=tools&q=AgentMem#agentmem', '/works.html?category=tools&q=AgentMem#agentmem'],
    ['/portfolio/news.html?date=2026-10-30', '/news.html?date=2026-10-30'],
    ['/portfolio/news/2026-10-13-evening.html#item-1', '/news/2026-10-13-evening.html#item-1'],
    ['/portfolio/projects/duomind.html', '/projects/duomind.html'],
  ]) {
    const old = new URL(path, 'https://be1human.github.io');
    let destination;
    runInNewContext(script, {URL, location: {pathname: old.pathname, search: old.search, hash: old.hash, replace: value => { destination = value; }}});
    assert.equal(destination, `https://be1human.github.io${expected}`);
  }
  for (const path of ['/works.html', '/portfolio-other/news.html']) {
    runInNewContext(script, {URL, location: {pathname: path, replace: () => assert.fail('A current URL must not redirect')}});
  }
  let destination;
  runInNewContext(script, {URL, location: {pathname: '/portfolio//example.com', search: '', hash: '', replace: value => { destination = value; }}});
  assert.equal(new URL(destination).origin, 'https://be1human.github.io');
});

test('all current pages have matching legacy aliases and root canonical URLs', async () => {
  const sitemap = await read('sitemap.xml');
  assert.ok(!sitemap.includes('/portfolio/'));
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  for (const url of urls) {
    const path = new URL(url).pathname.slice(1) || 'index.html';
    const html = await read(path);
    assert.ok(html.includes(`<link rel="canonical" href="${url}">`), path);
    assert.ok(!html.includes('https://be1human.github.io/portfolio/'), path);
    const alias = await read(`portfolio/${path}`);
    assert.ok(alias.includes(`<link rel="canonical" href="${url}">`), path);
    assert.ok(alias.includes('/assets/legacy-redirect.js?v='), path);
    assert.ok(alias.includes('<noscript><meta http-equiv="refresh"'), path);
  }
  assert.equal(await read('portfolio/feed.xml'), await read('feed.xml'));
  assert.equal(await read('portfolio/sitemap.xml'), sitemap);
});
