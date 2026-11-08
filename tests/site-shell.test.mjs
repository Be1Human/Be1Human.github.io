import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('archive and article routes share navigation, identity, footer and stylesheet', async () => {
  const posts = JSON.parse(await read('data/posts.json'));
  const news = JSON.parse(await read('data/news.json'));
  const projects = JSON.parse(await read('data/projects.json'));
  const learning = JSON.parse(await read('assets/learning-search.json'));
  const routes = [
    ['journal.html', 'index.html#journal'],
    ['works.html', 'index.html#works'], ['news.html', 'index.html#news'],
    ...posts.map(post => [`posts/${post.id}.html`, 'index.html#journal']),
    ...news.editions.map(edition => [`news/${edition.id}.html`, 'index.html#news']),
    ...projects.filter(project => project.presentation === 'showcase').map(project => [project.url, 'index.html#works']),
    ...learning.map(article => [`learn/${article.id}.html`, 'learn.html']),
  ];
  const home = await read('journal.html');
  const extract = (html, tag, name) => html.match(new RegExp(`<${tag} class="${name}">[\\s\\S]*?</${tag}>`))?.[0];
  const normalize = html => html.replaceAll('../', '').replaceAll(' aria-current="page"', '');
  const expectedHeader = normalize(extract(home, 'header', 'blog-header'));
  const main = await read('index.html');
  const mainLinks = [...main.match(/<nav aria-label="主导航">([\s\S]*?)<\/nav>/)[1].matchAll(/<a href="([^"]+)"[^>]*>(.*?)<\/a>/g)];
  const readerLinks = [...expectedHeader.match(/<nav aria-label="主导航">([\s\S]*?)<\/nav>/)[1].matchAll(/<a href="([^"]+)"[^>]*>(.*?)<\/a>/g)];
  assert.deepEqual(mainLinks.map(m=>[m[1],m[2]]),readerLinks.map(m=>[m[1].replace(/^index\.html(?=#)/,''),m[2]]),'homepage and reading navigation must have the same destinations and order');
  const expectedFooter = normalize(extract(home, 'footer', 'blog-footer'));
  const stylesheet = home.match(/href="(assets\/site\.css\?v=[a-f0-9]+)"/)[1];
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

test('the retired cloud theme is removed and all reading pages use the electronic-sheep identity', async()=>{
  for(const path of ['assets/styles.css','assets/mark.svg']) await assert.rejects(access(new URL('../'+path,import.meta.url)));
  const sitemap=await read('sitemap.xml');
  for(const [,url] of sitemap.matchAll(/<loc>(.*?)<\/loc>/g)){
    const path=new URL(url).pathname.slice(1)||'index.html';
    const html=await read(path);
    assert.ok(!/assets\/(?:styles\.css|mark\.svg)/.test(html),`${path}: retired theme reference`);
    assert.ok(html.includes('克劳德梦见电子羊'),`${path}: current identity missing`);
  }
});
