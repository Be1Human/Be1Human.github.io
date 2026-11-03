import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
const read = p => readFile(new URL('../'+p, import.meta.url), 'utf8');

test('the generated homepage preserves the approved experience and its runtime assets', async () => {
  const html=await read('index.html');
  assert.equal(html,await read('src/experience/index.html'));
  assert(html.includes('克劳德梦见电子羊'));
  for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    if (/^https?:/.test(match[1])) continue;
    await access(new URL('../'+match[1].split('?')[0],import.meta.url));
  }
  const videos=JSON.parse(await read('video-manifest.json'));
  for(const v of Object.values(videos)) for(const path of [v.url,v.reverse]) await access(new URL('../'+path,import.meta.url));
});

test('existing shared status and article anchors still reach the reading timeline', async () => {
  const app=await read('app.js');
  for(const hash of ['#status-blog-launch','#article-meet-mineclaw']) {
    let destination;
    runInNewContext(app,{location:{hash,search:'?from=feed',replace:v=>destination=v}});
    assert.equal(destination,'journal.html?from=feed'+hash);
  }
});
