import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {readLearning, validateLearning, learningPages} from '../scripts/learning.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('the learning collection has complete lessons, original examples and resolvable citations',async()=>{
 const articles=await readLearning(root);
 assert.equal(articles.length,13);
 for(const article of articles){
  const text=article.sections.map(s=>s.body).join('');
  assert.ok(text.replace(/<[^>]+>/g,'').length>1000,`${article.id}: detailed lesson required`);
  assert.ok(/教学|练习|实践|示例/.test(text),article.id);
  assert.ok(!/待补充|TODO|lorem ipsum/i.test(text),article.id);
  const html=await read(`learn/${article.id}.html`);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length,article.id);
  for(const [,id] of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(id),`${article.id} missing #${id}`);
  assert.equal((html.match(/<h1[\s>]/g)||[]).length,1);
  assert.ok(html.includes('href="../learn.html" aria-current="page"'));
  assert.ok(html.includes(`rel="canonical" href="https://be1human.github.io/learn/${article.id}.html"`));
 }
 const bad=structuredClone(articles);bad[0].sections[0].body+='<a href="#missing-source">[99]</a>';
 assert.throws(()=>validateLearning(bad),/Missing learning anchor/);
 const unsafe=structuredClone(articles);unsafe[0].sections[0].body+='<script>alert(1)</script>';
 assert.throws(()=>validateLearning(unsafe),/Unsafe/);
});

test('all learning pages are discoverable without JavaScript and searchable with the full content index',async()=>{
 const articles=await readLearning(root);const result=learningPages(articles);
 const home=await read('learn.html');const sitemap=await read('sitemap.xml');
 const search=JSON.parse(await read('assets/learning-search.json'));
 assert.equal(search.length,articles.length);
 for(const a of articles){
  assert.ok(home.includes(`href="learn/${a.id}.html"`),a.id);
  assert.ok(sitemap.includes(`/learn/${a.id}.html`),a.id);
  assert.ok(search.find(s=>s.id===a.id).text.includes(a.sections[0].title));
 }
 assert.equal(result.pages.length,14);
 assert.ok((await read('index.html')).includes('href="#learning">Agent 学习'));
 const evaluation=articles.find(a=>a.id==='agent-evaluation');
 assert.ok(evaluation.sources.some(s=>s.url==='https://aclanthology.org/2026.findings-acl.1330/'));
 assert.ok(evaluation.sources.some(s=>s.url==='https://aclanthology.org/2026.findings-emnlp.1162/'));
});
