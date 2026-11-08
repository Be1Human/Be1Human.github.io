import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
const read = p => readFile(new URL('../'+p, import.meta.url), 'utf8');

test('the generated homepage preserves the approved experience and its runtime assets', async () => {
  const html=await read('index.html');
  const template=await read('src/experience/index.html');
  const normalized=html.replace(/<!--HOME_LEARNING_START-->[\s\S]*?<!--HOME_LEARNING_END-->/,'<!--HOME_AGENT_LEARNING-->').replace(/<!--HOME_NAV_START-->[\s\S]*?<!--HOME_NAV_END-->/,'<!--SITE_NAVIGATION-->').replace(/(assets\/(?:learn|reading)\.(?:css|js))\?v=[a-f0-9]+/g,'$1');
  assert.equal(normalized,template);
  assert(html.indexOf('id="home-opening"')<html.indexOf('id="learning"'));
  assert(!html.includes('id="index"'));
  assert(!html.includes('id="deck"'));
  assert.equal((html.match(/class="learn-topic"/g)||[]).length,0);
  const wiki=html.match(/<section class="view learning-view home-learning"[\s\S]*?<\/section>/)?.[0];
  assert(wiki?.includes('class="learn-sidebar"'));
  assert(wiki.includes('id="learning" hidden'));
  assert.match(template, /<\/section>\s*<!--HOME_AGENT_LEARNING-->/);
  assert(wiki.includes('href="learn/react.html"'));
  assert(wiki.includes('data-learn-search'));
  assert(!wiki.includes('进入学习'));
  assert(!wiki.includes('home-learning-copy'));
  assert(!html.includes('learn-overview-graph'));
  assert(html.includes('src="assets/learn.js'));
  assert(html.includes('href="assets/learn.css'));
  assert(html.includes('克劳德梦见电子羊'));
  for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    if (/^https?:/.test(match[1])) continue;
    await access(new URL('../'+match[1].split('?')[0],import.meta.url));
  }
  const videos=JSON.parse(await read('video-manifest.json'));
  for(const v of Object.values(videos)) for(const path of [v.url,v.reverse]) await access(new URL('../'+path,import.meta.url));
});

test('the opening switches to the separate Wiki only after the final clip completes', async () => {
  const app=await read('app.js');
  const finish=app.match(/function finishHomeOpening\(\)\{[\s\S]*?\n\}/)[0];
  for(const state of [
    {route:'home',heroStep:1,heroTarget:2,transitioning:false,homeScrollRunning:false},
    {route:'home',heroStep:2,heroTarget:2,transitioning:true,homeScrollRunning:false},
    {route:'works',heroStep:2,heroTarget:2,transitioning:false,homeScrollRunning:false},
    {route:'home',heroStep:2,heroTarget:2,transitioning:false,homeScrollRunning:false},
  ]) {
    let destination;
    const switched=runInNewContext(finish+';finishHomeOpening()',{
      ...state,routeTransitioning:false,heroLastStep:2,
      location:{hash:'#home'},history:{pushState(){}},go:value=>destination=value,
    });
    const ready=state.route==='home'&&state.heroStep===2&&!state.transitioning;
    assert.equal(switched,ready);
    assert.equal(destination,ready?'learning':undefined);
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
