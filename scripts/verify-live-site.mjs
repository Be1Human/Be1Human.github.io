import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {retiredSitePaths} from './retired-site-paths.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const arg=name=>process.argv[process.argv.indexOf(name)+1];
const attempts=process.argv.includes('--attempts')?Number(arg('--attempts')):1;
const interval=process.argv.includes('--interval')?Number(arg('--interval')):15;
if(!Number.isInteger(attempts)||attempts<1||attempts>40||interval<1||interval>60)throw Error('Invalid verification retry limits');
const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const content=JSON.parse(await readFile(resolve(root,'content-local.json'),'utf8'));
const manifest=JSON.parse(await readFile(resolve(root,'video-manifest.json'),'utf8'));
const archive=JSON.parse(await readFile(resolve(root,'assets/news/archive.json'),'utf8'));
const project=content.projects.find(p=>p.id==='haimian-deep-space');
const posts=JSON.parse(await readFile(resolve(root,'data/posts.json'),'utf8'));
const illustratedProjects=JSON.parse(await readFile(resolve(root,'data/projects.json'),'utf8'))
 .filter(project=>project.presentation==='showcase'&&project.detail.coverSize)
 .map(project=>project.url);
const learningIds=JSON.parse(await readFile(resolve(root,'assets/learning-search.json'),'utf8')).map(a=>a.id);
let paths=['index.html','app.js','style.css','assets/site.css','assets/sheep.svg','journal.html','works.html','news.html','content-local.json','video-manifest.json','assets/news/archive.json',archive.editions[0].url,'posts/jev-co-creation.html','assets/journal/jev-co-creation.svg',project.image,'learn.html','assets/learn-directory.css','assets/learn-directory.js','assets/learn.css','assets/learn.js','assets/reading.css','assets/reading.js','assets/attention.js','assets/learning-search.json',...learningIds.map(id=>'learn/'+id+'.html'),...posts.map(entry=>'posts/'+entry.id+'.html')];
const visualAssets=new Set();
for(const path of [...learningIds.map(id=>'learn/'+id+'.html'),...posts.map(post=>'posts/'+post.id+'.html'),...illustratedProjects]){
 const html=await readFile(resolve(root,path),'utf8');
 for(const match of html.matchAll(/<(?:img|video)\b[^>]*>/g)){
  for(const attr of match[0].matchAll(/\b(?:src|poster)=['"]\.\.\/(assets\/[^'"]+)['"]/g))visualAssets.add(attr[1]);
 }
}
paths=[...new Set([...paths,'sitemap.xml','assets/app.js','assets/project-slides.css','projects/duomind.html','portfolio/projects/duomind.html',...illustratedProjects,...visualAssets,...posts.map(post=>post.image).filter(Boolean)])];
const hash=b=>createHash('sha256').update(b).digest('hex');
const expected=new Map(await Promise.all(paths.map(async path=>[path,hash(execFileSync('git',['show',commit+':'+path],{cwd:root,maxBuffer:16*1024*1024}))])));
let failures=[];
for(let attempt=1;attempt<=attempts;attempt++){
 failures=[];
 await Promise.all([...paths, ...retiredSitePaths].map(async path=>{
  try{
   const response=await fetch('https://be1human.github.io/'+path+'?deploy='+commit,{cache:'no-store',signal:AbortSignal.timeout(20000)});
   if(retiredSitePaths.has(path)){
    if(response.status!==404)throw Error('expected 404, got HTTP '+response.status);
   }else{
    if(!response.ok)throw Error('HTTP '+response.status);
    if(hash(Buffer.from(await response.arrayBuffer()))!==expected.get(path))throw Error('not the expected release');
   }
  }catch(error){failures.push({path,error:error.message})}
 }));
 console.log(JSON.stringify({phase:'live-files',commit,attempt,checked:paths.length,retired:retiredSitePaths.size,failures}));
 if(!failures.length)break;
 if(attempt<attempts)await new Promise(resolve=>setTimeout(resolve,interval*1000));
}
if(failures.length)throw Error('Live release has not passed exact file verification');
const media=[...new Set(Object.values(manifest).flatMap(v=>[v.url,v.reverse]).filter(Boolean))];
for(let start=0;start<media.length;start+=5){
 await Promise.all(media.slice(start,start+5).map(async path=>{
  const response=await fetch('https://be1human.github.io/'+path+'?deploy='+commit,{method:'HEAD',signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('Video unavailable: '+path+' HTTP '+response.status);
 }));
}
console.log(JSON.stringify({status:'live-verified',commit,exactPublicFiles:paths.length,videoFiles:media.length,journal:content.journal.length,newsEditions:archive.editions.length,newsItems:archive.totalItems,newest:archive.newest,url:'https://be1human.github.io/'}));
