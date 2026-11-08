import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
const read = p => readFile(new URL('../'+p, import.meta.url), 'utf8');

test('the generated homepage preserves the approved experience and its runtime assets', async () => {
  const html=await read('index.html');
  const template=await read('src/experience/index.html');
  const normalized=html.replace(/<!--HOME_NAV_START-->[\s\S]*?<!--HOME_NAV_END-->/,'<!--SITE_NAVIGATION-->').replace(/(assets\/(?:learn|reading)\.(?:css|js))\?v=[a-f0-9]+/g,'$1');
  assert.equal(normalized,template);
  assert(!html.includes('id="learning"'));
  assert(!html.includes('id="index"'));
  assert(!html.includes('id="deck"'));
  assert(html.includes('href="learn.html">Agent 学习'));
  assert(!html.includes('src="assets/learn.js'));
  assert(!html.includes('href="assets/learn.css'));
  assert(html.includes('克劳德梦见电子羊'));
  for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    if (/^https?:/.test(match[1])) continue;
    await access(new URL('../'+match[1].split('?')[0],import.meta.url));
  }
  const videos=JSON.parse(await read('video-manifest.json'));
  for(const v of Object.values(videos)) for(const path of [v.url,v.reverse]) await access(new URL('../'+path,import.meta.url));
});

test('finishing the opening stays on the homepage', async () => {
  const app=await read('app.js');
  const pump=app.match(/async function pumpHomeScroll\(\)\{[\s\S]*?\n\}/)[0];
  for(const initialStep of [1,2]) {
    const state={route:'home',routeVersion:1,routeTransitioning:false,transitioning:false,homeScrollRunning:false,heroStep:initialStep,heroTarget:2,document:{hidden:false},motionEnabled:true,startHomeIdle(){},go(){assert.fail('The opening must not navigate to another page')}};
    state.stepHero=async()=>{state.heroStep=2};
    await runInNewContext(pump+';pumpHomeScroll()',state);
    assert.equal(state.route,'home');
    assert.equal(state.heroStep,2);
  }
});

test('existing shared status and article anchors still reach the reading timeline', async () => {
  const app=await read('app.js');
  for(const hash of ['#status-blog-launch','#article-meet-mineclaw']) {
    let destination;
    runInNewContext(app,{location:{hash,search:'?from=feed',replace:v=>destination=v}});
    assert.equal(destination,'journal.html?from=feed'+hash);
  }
});
