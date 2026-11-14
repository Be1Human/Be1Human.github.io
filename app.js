(()=>{'use strict';
// Preserve old learning bookmarks without embedding the Wiki in the homepage.
if(/^#(?:learning|index)$/.test(location.hash)){location.replace('learn.html'+location.search);return}
// Preserve existing public RSS and article/status links.
if(/^#(?:status-|article-)/.test(location.hash)){location.replace('journal.html'+location.search+location.hash);return}
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validURL=u=>/^https:\/\//.test(u||'')?u:'#';
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),small=matchMedia('(max-width: 700px)');
let preferred;try{preferred=localStorage.getItem('cloudboy-motion')}catch{}
let motionEnabled=preferred===null||preferred===undefined?!reduced.matches&&!navigator.connection?.saveData:preferred==='on';
let route='home',data=null,filmIndex=0,filter='all',heroStep=0,journeyStep=0,transitioning=false,transitionToken=0,returnFocus=null,videoManifest={},readerStack=[],wheelTotal=0,wheelTimer=0,cancelPlayback=null;
let activeScene='home',routeVersion=0,sequenceVersion=0,routeTransitioning=false,autoRunning=false,requestedRoute='home';
const entryAnimations=new Set();
let idleCleanup=null;
const manifestReady=fetch('video-manifest.json').then(r=>r.ok?r.json():{}).then(m=>videoManifest=m).catch(()=>{});
const heroStates=['home','half','screens'],heroClips=['home-half','half-screens'];
const heroLastStep=heroStates.length-1;
const journeyStates=['entry','panels','near','street','arrival','symbol'],journeyClips=['entry-panels','panels-near','near-street','street-arrival','arrival-symbol'];
const renderedViews=new Set();
function populateView(){if(data){if(route==='news')renderNews();else if(!renderedViews.has(route)){if(route==='works'){renderProjects();renderFilm()}if(route==='journal')renderJournal();renderedViews.add(route)}}document.querySelectorAll('#'+route+' img[data-src]').forEach(im=>{im.src=im.dataset.src;delete im.dataset.src})}
const routes=['home','about','works','journal','news','journey','contact'];
const labels={home:'首页',about:'关于',works:'作品',journal:'创作手记',news:'科技新闻',journey:'创作世界',contact:'联系'};
const imageCache=new Map();
function imageReady(name){const path='assets/'+name+'.webp';if(!imageCache.has(path)){const p=new Promise(resolve=>{let im=new Image();im.onload=()=>resolve(path);im.onerror=()=>resolve(null);im.src=path;});imageCache.set(path,p);if(imageCache.size>4)imageCache.delete(imageCache.keys().next().value);}return imageCache.get(path)}
function setPoster(name){activeScene=name;$('scene').src='assets/'+name+'.webp';$('scene').dataset.frame=name}
function releaseVideo(){idleCleanup?.();idleCleanup=null;const v=$('motion');v.pause();v.loop=false;v.classList.remove('playing');v.removeAttribute('src');v.load()}
function cancelMotion(){transitionToken++;cancelPlayback?.();transitioning=false;document.body.classList.remove('is-transitioning');releaseVideo()}
function updateMotion(){motionEnabled=motionEnabled&&!reduced.matches;document.body.classList.toggle('motion-off',!motionEnabled);$('motion-toggle').setAttribute('aria-pressed',String(motionEnabled));$('motion-toggle').querySelector('span').textContent=motionEnabled?'开':'关';if(!motionEnabled){stopAuto();cancelMotion();if(routeTransitioning)go(requestedRoute,{instant:true})}}
updateMotion();$('motion-toggle').addEventListener('click',()=>{motionEnabled=!motionEnabled;try{localStorage.setItem('cloudboy-motion',motionEnabled?'on':'off')}catch{}updateMotion();if(motionEnabled)requestAnimationFrame(syncHomeScroll)});reduced.addEventListener('change',()=>{updateMotion();if(motionEnabled)requestAnimationFrame(syncHomeScroll)});
async function moveScene(from,to,clip,reverse=false,rate=1.8){
 if(transitioning)return false;transitioning=true;const token=++transitionToken;document.body.classList.add('is-transitioning');
 const target=await imageReady(to);if(token!==transitionToken)return false;if(!target){transitioning=false;document.body.classList.remove('is-transitioning');return false}
 const video=videoManifest[clip],v=$('motion');
 if(motionEnabled&&video?.status==='ready'&&(reverse?video.reverse:video.url)){
  setPoster(from);v.src=reverse?video.reverse:video.url;v.muted=true;v.defaultMuted=true;v.loop=false;v.playbackRate=rate;v.dataset.clip=clip;v.dataset.direction=reverse?'reverse':'forward';v.dataset.state='loading';
  await new Promise(resolve=>{let finished=false;const cleanup=()=>{if(finished)return;finished=true;cancelPlayback=null;clearTimeout(timer);v.removeEventListener('ended',done);v.removeEventListener('error',done);v.removeEventListener('playing',playing);resolve()};cancelPlayback=cleanup;const done=()=>{v.dataset.state=v.error?'error':'ended';cleanup()};const playing=()=>{if(token===transitionToken){v.classList.add('playing');v.dataset.state='playing'}};const timer=setTimeout(cleanup,14000);v.addEventListener('ended',done,{once:true});v.addEventListener('error',done,{once:true});v.addEventListener('playing',playing,{once:true});v.play().catch(()=>{v.dataset.state='blocked';$('motion-retry').hidden=false;cleanup()});});
  if(token!==transitionToken)return false;setPoster(to);releaseVideo();
 }else{
  // Static keyframe transition is the explicit fallback; it is not generated character motion.
  const anim=motionEnabled?$('scene').animate([{opacity:1,transform:'scale(1)'},{opacity:.15,transform:reverse?'scale(.98)':'scale(1.025)'}],{duration:180,fill:'forwards',easing:'ease-in'}):null;
  if(anim)await anim.finished.catch(()=>{});if(token!==transitionToken){anim?.cancel();return false}setPoster(to);anim?.cancel();if(motionEnabled)$('scene').animate([{opacity:.2},{opacity:1}],{duration:220});
 }
 if(token!==transitionToken)return false;transitioning=false;document.body.classList.remove('is-transitioning');return true;
}
function updateHero(){document.querySelectorAll('#hero-dots button').forEach((b,i)=>{b.classList.toggle('active',i===heroStep);b.setAttribute('aria-current',String(i===heroStep))});$('scene-label').textContent=String(heroStep+1).padStart(2,'0')+' / '+['THE BEGINNING','CLOSER','THROUGH THE SCREEN'][heroStep];$('hero-next').hidden=heroStep===heroLastStep;$('hero-next').innerHTML='下一幕 <span>↓</span>'}
for(let i=0;i<heroStates.length;i++){const b=document.createElement('button');b.setAttribute('aria-label','开场镜头 '+(i+1));b.addEventListener('click',()=>scrollToHero(i));$('hero-dots').append(b)}updateHero();
async function stepHero(delta){if(transitioning)return;if(heroStep+delta>heroLastStep)return;const n=Math.max(0,heroStep+delta);if(n===heroStep)return;const ok=await moveScene(heroStates[heroStep],heroStates[n],heroClips[Math.min(heroStep,n)],delta<0,2.4);if(ok&&route==='home'){heroStep=n;updateHero()}}
$('hero-next').addEventListener('click',()=>scrollToHero(Math.min(heroLastStep,heroStep+1)));
let heroTarget=0,homeScrollRunning=false,scrollTick=0;
function startHomeIdle(){
 const clip=videoManifest['home-idle'],v=$('motion');
 if(route!=='home'||routeTransitioning||transitioning||homeScrollRunning||document.hidden||!motionEnabled||heroStep!==0||heroTarget!==0||clip?.status!=='ready')return;
 if(idleCleanup&&v.loop&&v.getAttribute('src')===clip.url)return;
 releaseVideo();const token=transitionToken;
 v.src=clip.url;v.muted=true;v.defaultMuted=true;v.loop=true;v.playbackRate=1;v.dataset.clip='home-idle';v.dataset.direction='forward';v.dataset.state='loading';
 const playing=()=>{if(token===transitionToken&&v.loop){v.classList.add('playing');v.dataset.state='playing';$('motion-retry').hidden=true}};
 const failed=()=>{if(token!==transitionToken||!v.loop)return;v.dataset.state='blocked';releaseVideo();$('motion-retry').hidden=false};
 v.addEventListener('playing',playing);v.addEventListener('error',failed);
 idleCleanup=()=>{v.removeEventListener('playing',playing);v.removeEventListener('error',failed)};
 v.play().catch(failed);
}
function scrollToHero(step){if(route!=='home'||routeTransitioning)return;const el=$('home-opening'),range=Math.max(1,el.offsetHeight-innerHeight);window.scrollTo({top:el.getBoundingClientRect().top+scrollY+range*Math.max(0,Math.min(heroLastStep,step))/Math.max(1,heroLastStep),behavior:motionEnabled?'smooth':'instant'})}
function syncHomeScroll(){
 if(route!=='home'||routeTransitioning||document.hidden)return;
 const el=$('home-opening'),progress=Math.max(0,Math.min(1,-el.getBoundingClientRect().top/Math.max(1,el.offsetHeight-innerHeight)));
 heroTarget=Math.round(progress*heroLastStep);
 if(!motionEnabled){heroStep=heroTarget;setPoster(heroStates[heroStep]);updateHero();return}
 if(heroStep===0&&heroTarget===0){startHomeIdle();return}
 if(idleCleanup)releaseVideo();
 pumpHomeScroll();
}
async function pumpHomeScroll(){
 if(homeScrollRunning||transitioning||routeTransitioning||route!=='home')return;
 homeScrollRunning=true;const version=routeVersion;
 try{while(version===routeVersion&&route==='home'&&!routeTransitioning&&!document.hidden&&motionEnabled&&heroStep!==heroTarget){const before=heroStep;await stepHero(Math.sign(heroTarget-heroStep));if(before===heroStep)break}}
 finally{homeScrollRunning=false;if(version===routeVersion)startHomeIdle();else if(route==='home')requestAnimationFrame(syncHomeScroll)}
}
window.addEventListener('scroll',()=>{if(scrollTick)return;scrollTick=requestAnimationFrame(()=>{scrollTick=0;syncHomeScroll()})},{passive:true});
window.addEventListener('resize',()=>{if(route==='home')syncHomeScroll()});
const routeScenes={home:{frame:'home',start:'home',clip:'home-idle'},about:{frame:'panels',start:'entry',clip:'entry-panels'},journal:{frame:'symbol',start:'arrival',clip:'arrival-symbol'},works:{frame:'near',start:'panels',clip:'panels-near'},news:{frame:'street',start:'near',clip:'near-street'},journey:{frame:'entry',start:'entry'},contact:{frame:'symbol',start:'arrival',clip:'arrival-symbol'}};
const chapterEnglish={home:'WELCOME BACK',about:'MEET THE CREATOR',journal:'BEHIND THE IDEAS',works:'SELECTED WORKS',news:'SIGNALS FROM OUTSIDE',journey:'ENTER THE WORLD',contact:'STAY CURIOUS'};
function stopAuto(){sequenceVersion++;autoRunning=false;document.body.classList.remove('auto-touring');if($('tour-toggle'))$('tour-toggle').textContent='自动漫游 →'}
function animate(el,frames,options={}){if(!el||!motionEnabled)return Promise.resolve();const a=el.animate(frames,{duration:650,easing:'cubic-bezier(.16,1,.3,1)',...options});entryAnimations.add(a);return a.finished.catch(()=>{}).finally(()=>{entryAnimations.delete(a);a.cancel()})}
function stagger(selector,frames,{delay=65,duration=650}={}){document.querySelectorAll(selector).forEach((el,i)=>animate(el,frames,{duration,delay:Math.min(i,8)*delay,fill:'backwards'}))}
function enterView(next){
 document.body.dataset.entrance=next;
 if(!motionEnabled)return;
 const rise=[{opacity:0,transform:'translateY(55px)'},{opacity:1,transform:'translateY(0)'}];
 animate($(next+'-title')||document.querySelector('#'+next+' h1'),[{opacity:0,clipPath:'inset(0 0 100% 0)',transform:'translateY(35px)'},{opacity:1,clipPath:'inset(0 0 0 0)',transform:'none'}],{duration:850});
 if(next==='home'){stagger('.hero-copy>.eyebrow,.hero-copy>.hero-sub,.hero-actions',rise,{delay:140});animate(document.querySelector('.hero-copy'),rise)}
 if(next==='about'){animate(document.querySelector('.portrait-card'),[{opacity:0,transform:'perspective(1100px) translateX(170px) rotateY(-48deg) rotate(8deg)'},{opacity:1,transform:'rotate(3deg)'}],{duration:1000});stagger('.profile-facts>div,.fields>a',rise);}
 if(next==='works'){dealWorks();stagger('.project-card',rise,{delay:55});}
 if(next==='journal')stagger('.journal-card',[{opacity:0,transform:'perspective(1200px) translateX(140px) rotateY(-24deg)'},{opacity:1,transform:'none'}],{delay:140,duration:950});
 if(next==='news')stagger('.news-item',[{opacity:0,clipPath:'inset(0 100% 0 0)',transform:'translateX(45px)'},{opacity:1,clipPath:'inset(0 0 0 0)',transform:'none'}],{delay:65,duration:700});
 if(next==='contact'){animate(document.querySelector('.contact-panel'),[{opacity:0,transform:'perspective(1200px) translateY(100px) rotateX(18deg) scale(.8)'},{opacity:1,transform:'none'}],{duration:900});stagger('.contact-panel>a',rise,{delay:90});}
}
function cameraPath(from,to){const edges=[];for(const [id,v] of Object.entries(videoManifest)){if(v.from===v.to)continue;edges.push({from:v.from,to:v.to,id,reverse:false},{from:v.to,to:v.from,id,reverse:true})}const queue=[[from,[]]],seen=new Set([from]);while(queue.length){const [node,path]=queue.shift();if(node===to)return path;for(const edge of edges.filter(e=>e.from===node)){if(!seen.has(edge.to)){seen.add(edge.to);queue.push([edge.to,[...path,edge]])}}}return null}
async function portalTo(frame,version){
 await imageReady(frame);if(version!==routeVersion)return false;
 const curtain=$('scene-curtain');
 if(motionEnabled){curtain.hidden=false;await animate(curtain,[{transform:'translateX(-110%) skewX(-12deg)'},{transform:'translateX(0) skewX(0)'}],{duration:270,fill:'forwards',easing:'cubic-bezier(.65,0,.35,1)'});if(version!==routeVersion)return false;}
 setPoster(frame);
 if(motionEnabled)await animate(curtain,[{transform:'translateX(0)'},{transform:'translateX(110%) skewX(-12deg)'}],{duration:300,fill:'forwards',easing:'cubic-bezier(.65,0,.35,1)'});
 if(version===routeVersion)curtain.hidden=true;return version===routeVersion;
}
function mountRoute(next){
 route=next;document.body.dataset.route=next;document.querySelectorAll('.view').forEach(v=>{v.hidden=v.id!==next;v.classList.remove('departing');v.classList.toggle('active',v.id===next)});
 document.querySelectorAll('.topbar nav a').forEach(a=>{a.classList.toggle('active',a.hash==='#'+next);a.setAttribute('aria-current',a.hash==='#'+next?'page':'false')});
 if(next==='home'){heroStep=0;updateHero()}if(next==='journey'){journeyStep=Math.max(0,journeyStates.indexOf(activeScene));updateJourney()}
 if(next==='home')heroTarget=heroStep;
  window.scrollTo({top:0,behavior:'instant'});document.title=labels[next]+' · 克劳德梦见电子羊';$('footer-hint').textContent=next==='home'?'下滑推进 · 上滑倒回':next==='journey'?'正在穿梭创作世界 · 可随时暂停':'';$('announcement').textContent=labels[next];populateView();if(next==='works')requestAnimationFrame(updateFilm);
}
async function go(next,{boot=false,instant=next!=='journey'}={}){
 if(!routes.includes(next))next='home';requestedRoute=next;const version=++routeVersion;stopAuto();cancelMotion();entryAnimations.forEach(a=>a.cancel());entryAnimations.clear();$('scene-curtain').hidden=true;
 routeTransitioning=true;document.body.classList.toggle('is-routing',next!=='home'&&!instant);document.body.dataset.destination=next;$('transition-name').textContent=labels[next];$('transition-en').textContent=chapterEnglish[next];document.querySelector('#'+route)?.classList.add('departing');
 await manifestReady;if(version!==routeVersion)return;
 const config=routeScenes[next];
 if(!motionEnabled||instant){setPoster(config.frame)}
 else if(next==='home'){setPoster('home')}
 else{
   let path=cameraPath(activeScene,config.frame);
   if(!path||path.length>2||(boot&&path.length===0)){
     if(!await portalTo(config.start,version))return;
     path=config.clip?[{from:config.start,to:config.frame,id:config.clip,reverse:false}]:[];
   }
   for(const edge of path){if(version!==routeVersion)return;await moveScene(edge.from,edge.to,edge.id,edge.reverse,2.4)}
   if(version!==routeVersion)return;
   if(activeScene!==config.frame)setPoster(config.frame);
 }
 mountRoute(next);routeTransitioning=false;document.body.classList.remove('is-routing');enterView(next);
 if(next==='home')requestAnimationFrame(syncHomeScroll);
 if(motionEnabled&&!instant&&next==='journey')runJourney();
}
async function runJourney(){const seq=++sequenceVersion;autoRunning=true;document.body.classList.add('auto-touring');$('tour-toggle').textContent='暂停漫游 Ⅱ';while(journeyStep<5&&seq===sequenceVersion&&route==='journey'&&!routeTransitioning&&motionEnabled){const before=journeyStep;await stepJourney(1);if(before===journeyStep)break}if(seq===sequenceVersion){autoRunning=false;document.body.classList.remove('auto-touring');$('tour-toggle').textContent=journeyStep===5?'重新漫游 ↺':'自动漫游 →'}}
window.addEventListener('hashchange',()=>go(location.hash.slice(1)));
document.addEventListener('click',e=>{
 const a=e.target.closest('a[href^="#"]');if(!a||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
 const target=a.hash.slice(1);if(!routes.includes(target))return;
 e.preventDefault();if(location.hash!==a.hash)history.pushState(null,'',a.hash);go(target);
});
$('cinema-skip').onclick=()=>go(requestedRoute,{instant:true});
$('motion-retry').onclick=()=>{$('motion-retry').hidden=true;if(route==='home')syncHomeScroll();else go(route,{boot:true})};
$('tour-toggle').onclick=()=>{if(autoRunning){stopAuto();cancelMotion();setPoster(journeyStates[journeyStep])}else if(journeyStep===5){journeyStep=0;go('journey',{boot:true})}else runJourney()};
go(location.hash.slice(1)||'home',{boot:true});
document.querySelectorAll('[data-filter-link]').forEach(a=>a.addEventListener('click',()=>{filter=a.dataset.filterLink;if(data)renderProjects()}));
const categories=[['all','全部'],['games','游戏'],['tools','AI 工具'],['visual','视觉'],['experiments','硬件 / 实验']];
function categoryMatch(p){if(filter==='all'||(p.categories||[p.category]).includes(filter))return true;const text=(p.category+' '+p.categoryLabel+' '+p.tags.join(' ')).toLowerCase();if(filter==='visual')return /visual|视觉|壁纸|shader/.test(text);if(filter==='tools')return /tool|工具|workflow|效率/.test(text);return p.category===filter}
function renderProjects(){if(!data)return;$('filters').innerHTML=categories.map(([id,name])=>`<button data-filter="${id}" class="${filter===id?'active':''}" aria-pressed="${filter===id}">${name}</button>`).join('');const projects=data.projects.filter(categoryMatch);$('project-count').textContent=String(projects.length).padStart(2,'0');$('project-grid').innerHTML=projects.map(p=>`<button class="project-card" data-project="${esc(p.id)}"><span class="cover"><img src="${esc(p.image)}" alt="${esc(p.imageAlt)}" loading="lazy" decoding="async" width="640" height="400"></span><span class="meta">${esc(p.categoryLabel)} / ${esc(p.tags.slice(0,2).join(' · '))}</span><h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p><span class="open">打开项目 ↗</span></button>`).join('')}
$('filters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(b){filter=b.dataset.filter;renderProjects()}});
function renderFilm(){const featured=data.projects.slice(0,6),suits=['◆','♠','✦','♥','♣','♦'];$('film-strip').innerHTML=featured.map((p,i)=>`<button class="work-card" data-film="${i}" aria-label="查看 ${esc(p.title)}"><span class="card-corner">${String(i+1).padStart(2,'0')}<b>${suits[i]}</b></span><span class="card-edition">CLOUD BOY<br>SELECTED / 2026</span><img src="${esc(p.image)}" alt="${esc(p.imageAlt)}" width="640" height="400" decoding="async"><span class="card-copy"><small>${esc(p.categoryLabel)}</small><strong>${esc(p.title)}</strong></span><span class="card-bottom">EXPLORE PROJECT <b>↗</b></span><span class="card-corner mirrored">${String(i+1).padStart(2,'0')}<b>${suits[i]}</b></span></button>`).join('');updateFilm()}
function updateFilm(){if(!data)return;const featured=data.projects.slice(0,6),p=featured[filmIndex];$('film-title').textContent=p.title;$('film-category').textContent=p.categoryLabel+' / '+p.tags.slice(0,2).join(' · ');$('film-count').textContent=String(filmIndex+1).padStart(2,'0')+' / '+featured.length;const width=document.querySelector('.film-window').clientWidth,spacing=small.matches?24:Math.max(36,Math.min(154,(width-650)/6));document.querySelectorAll('.work-card').forEach((card,i)=>{let d=i-filmIndex;if(d>2)d-=6;if(d< -3)d+=6;const active=d===0,y=active?-65:Math.pow(Math.abs(d),1.55)*17,angle=d*11;card.style.setProperty('--card-x',d*spacing+'px');card.style.setProperty('--card-y',y+'px');card.style.setProperty('--card-angle',angle+'deg');card.style.setProperty('--card-scale',active?'1.08':'.94');card.style.setProperty('--card-z',active?'20':String(10-Math.abs(d)));card.classList.toggle('active',active);card.setAttribute('aria-pressed',String(active));card.style.setProperty('--card-pose',`translate3d(${d*spacing}px,${y}px,0) rotate(${angle}deg) scale(${active?1.08:.94})`);})}
function dealWorks(){if(!data||route!=='works')return;updateFilm();const cards=[...document.querySelectorAll('.work-card')];cards.forEach((card,i)=>{card.getAnimations().forEach(a=>a.cancel());const final=card.style.getPropertyValue('--card-pose');animate(card,[{opacity:0,transform:`translate3d(${i*2}px,160px,-180px) rotate(-9deg) scale(.72)`,offset:0},{opacity:1,transform:`translate3d(${i*3}px,30px,0) rotate(-9deg) scale(.85)`,offset:.28},{opacity:1,transform:final,offset:1}],{duration:1150,delay:i*85,fill:'backwards',easing:'cubic-bezier(.16,1,.3,1)'})})}
function turnFilm(d){if(!data)return;filmIndex=(filmIndex+d+Math.min(6,data.projects.length))%Math.min(6,data.projects.length);updateFilm()}
$('film-prev').onclick=()=>turnFilm(-1);$('film-next').onclick=()=>turnFilm(1);$('film-open').onclick=()=>data&&openReader('project',data.projects[filmIndex].id);$('film-strip').onclick=e=>{const b=e.target.closest('[data-film]');if(!b)return;const n=Number(b.dataset.film);if(n===filmIndex)openReader('project',data.projects[n].id);else{filmIndex=n;updateFilm()}};small.addEventListener('change',updateFilm);window.addEventListener('resize',()=>{if(route==='works')updateFilm()});
$('film-redeal').onclick=dealWorks;
$('film-strip').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();turnFilm(e.key==='ArrowRight'?1:-1);document.querySelector('.work-card.active')?.focus({preventScroll:true})});
function renderJournal(){$('timeline').innerHTML=data.journal.map(j=>`<button class="journal-card" data-journal="${esc(j.id)}"><div><time datetime="${j.date}">${j.date.replaceAll('-',' / ')}</time><h2>${esc(j.title)}</h2><p>${esc(j.summary)}</p><span class="text-link">翻开这篇手记 ↗</span></div><img class="${j.imageFit==='contain'?'contained':''}" src="${esc(j.image)}" alt="${esc(j.imageAlt)}" width="600" height="400" loading="lazy" decoding="async"></button>`).join('')}
let newsArchive=null,newsArchiveReady=null,newsEditionId='',newsLoadToken=0;
const newsEditionCache=new Map();
const newsClock=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
function paintNewsItems(items){
 $('news-list').innerHTML=items.map((n,i)=>{
  const date=new Date(n.publishedAt),valid=n.publishedAt&&!Number.isNaN(date.getTime()),stamp=valid?newsClock.format(date):'时间未提供';
  return `<article class="news-item"><div class="news-card-meta"><span class="news-category"><b>${String(i+1).padStart(2,'0')}</b>${esc(n.category)}</span><time ${valid?`datetime="${esc(n.publishedAt)}"`:''}>${esc(stamp)}</time></div><a class="news-cover" href="${esc(validURL(n.source))}" target="_blank" rel="noopener" aria-label="查看 ${esc(n.title)} 的原帖"><img src="${esc(n.image)}" alt="${esc(n.imageAlt||n.title)}" width="1200" height="750" loading="${i<2?'eager':'lazy'}" decoding="async"><span class="news-image-kind">${n.imageKind==='diagram'?'主题示意':'原帖配图'} <b>↗</b></span></a><div class="news-copy"><h2><a href="${esc(validURL(n.source))}" target="_blank" rel="noopener">${esc(n.title)}</a></h2><details class="news-summary"><summary><span class="news-excerpt">${esc(n.summary)}</span><span class="news-summary-action"><span class="when-closed">展开摘要 +</span><span class="when-open">收起摘要 −</span></span></summary><p>${esc(n.summary)}</p></details><div class="news-card-bottom"><small>${esc(n.author)}</small><a href="${esc(validURL(n.source))}" target="_blank" rel="noopener">阅读原帖 ↗</a></div></div></article>`
 }).join('');
}
function requestedNewsEdition(){const id=new URLSearchParams(location.search).get('newsDate');return newsArchive.editions.some(e=>e.id===id)?id:newsArchive.newest}
function newsEditionLabel(entry){return entry.date.replaceAll('-','.')+(entry.id.endsWith('-evening')?' 晚间':'')}
function newsControls(id){
 const i=newsArchive.editions.findIndex(e=>e.id===id);
 $('news-edition').value=id;$('news-older').disabled=i===newsArchive.editions.length-1;$('news-newer').disabled=i===0;$('news-latest').disabled=i===0;
}
async function showNewsEdition(id,{remember=false}={}){
 const entry=newsArchive.editions.find(e=>e.id===id);if(!entry)return;
 const token=++newsLoadToken;newsEditionId=id;newsControls(id);
 if(remember){const url=new URL(location.href);url.searchParams.set('newsDate',id);history.pushState(null,'',url)}
 $('news-error').hidden=true;$('news-list').setAttribute('aria-busy','true');$('news-list').replaceChildren();$('news-date').textContent='正在载入 '+newsEditionLabel(entry)+' 期…';
 try{
  if(!newsEditionCache.has(id)){
   newsEditionCache.set(id,fetch(entry.url+'?v='+newsArchive.sourceRevision).then(r=>{if(!r.ok)throw Error('news edition');return r.json()}).then(edition=>{if(edition.id!==id||!Array.isArray(edition.items)||edition.items.length!==entry.count)throw Error('news edition mismatch');return edition}));
   if(newsEditionCache.size>4)newsEditionCache.delete(newsEditionCache.keys().next().value);
  }
  const edition=await newsEditionCache.get(id);if(token!==newsLoadToken||route!=='news')return;
  paintNewsItems(edition.items);$('news-list').setAttribute('aria-busy','false');$('news-date').textContent=newsEditionLabel(entry)+' 期 / '+edition.items.length+' 条精选 · 原帖发布时间为 UTC+8';
  $('announcement').textContent='已显示 '+newsEditionLabel(entry)+' 期新闻，共 '+edition.items.length+' 条';
  if(route==='news'&&!routeTransitioning)stagger('.news-item',[{opacity:0,transform:'translateY(24px)'},{opacity:1,transform:'none'}],{delay:45,duration:500});
 }catch{
  newsEditionCache.delete(id);if(token!==newsLoadToken)return;
  $('news-list').setAttribute('aria-busy','false');$('news-date').textContent=newsEditionLabel(entry)+' 期未能载入';$('news-error').hidden=false;
 }
}
async function renderNews(){
 try{
  if(!newsArchiveReady)newsArchiveReady=fetch('assets/news/archive.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('news archive');return r.json()}).then(archive=>{if(!archive.editions?.length)throw Error('empty news archive');return archive}).catch(error=>{newsArchiveReady=null;throw error});
  newsArchive=await newsArchiveReady;
  $('news-archive-summary').textContent=newsArchive.oldest+' — '+newsArchive.newest+' · '+newsArchive.editions.length+' 期 / '+newsArchive.totalItems+' 条';
  $('news-edition').innerHTML=newsArchive.editions.map(e=>`<option value="${esc(e.id)}">${esc(newsEditionLabel(e))} · ${e.count} 条</option>`).join('');$('news-archive-nav').hidden=false;
  await showNewsEdition(requestedNewsEdition());
 }catch{
  $('news-archive-summary').textContent='历史归档暂时未能载入';$('news-date').textContent='离线快照：'+data.news.date+' 期 / '+data.news.items.length+' 条';paintNewsItems(data.news.items);$('news-error').hidden=false;
 }
}
let newsRefreshAt=0;
async function refreshNewsArchive(){
 if(route!=='news'||document.hidden||Date.now()-newsRefreshAt<60000)return;
 newsRefreshAt=Date.now();
 try{
  const response=await fetch('assets/news/archive.json?check='+Math.floor(Date.now()/300000),{cache:'no-store'});
  if(!response.ok)return;const fresh=await response.json();
  if(!fresh.editions?.length||fresh.sourceRevision===newsArchive?.sourceRevision)return;
  newsArchiveReady=Promise.resolve(fresh);await renderNews();
 }catch{/* Keep the last verified edition available during an outage. */}
}
setInterval(refreshNewsArchive,300000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshNewsArchive()});
$('news-edition').addEventListener('change',e=>showNewsEdition(e.target.value,{remember:true}));
$('news-older').onclick=()=>{const i=newsArchive.editions.findIndex(e=>e.id===newsEditionId);if(i>=0&&i<newsArchive.editions.length-1)showNewsEdition(newsArchive.editions[i+1].id,{remember:true})};
$('news-newer').onclick=()=>{const i=newsArchive.editions.findIndex(e=>e.id===newsEditionId);if(i>0)showNewsEdition(newsArchive.editions[i-1].id,{remember:true})};
$('news-latest').onclick=()=>newsArchive&&showNewsEdition(newsArchive.newest,{remember:true});
$('news-retry').onclick=()=>newsArchive?showNewsEdition(newsEditionId):renderNews();
window.addEventListener('popstate',()=>{if(newsArchive&&route==='news'&&location.hash==='#news')showNewsEdition(requestedNewsEdition())});
const reader=$('reader');
function readerImage(im){return `<figure class="reader-figure ${im.width/im.height>1.45?'wide':''}"><button class="reader-image-button" data-reader-image="${esc(im.src)}" data-caption="${esc(im.caption||im.alt)}" aria-label="放大查看：${esc(im.alt)}"><img src="${esc(im.src)}" alt="${esc(im.alt)}" width="${im.width||900}" height="${im.height||600}" loading="lazy" decoding="async"><span>查看大图 ↗</span></button><figcaption>${esc(im.caption||im.alt)}</figcaption></figure>`}
function readerContent(type,id){
 let item=type==='journal'?data.journal.find(x=>x.id===id):data.projects.find(x=>x.id===id);if(!item)return false;
 if(type==='project'&&id===data.featuredProject.id)item={...item,...data.featuredProject};
 const sections=item.sections||[],hasGallery=sections.some(s=>s.images?.length),official=(item.links||[]).find(l=>l.url==='https://dsgame.archerpeng.com/');
 const relatedJournal=type==='project'?({mineclaw:'meet-mineclaw','wallpaper-workshop':'a-train-through-the-clouds'})[id]:null;
 reader.classList.toggle('has-project-gallery',hasGallery);$('reader-type').textContent=type==='journal'?'JOURNAL / 创作手记':'PROJECT ARCHIVE / 项目档案';
 $('reader-body').innerHTML=`<p class="reader-meta">${esc(item.date||item.categoryLabel||'CLOUD BOY')} / ${esc(item.tags?.join(' · ')||'')}</p><h1 id="reader-title">${esc(item.title)}</h1><p>${esc(item.summary)}</p>${official?`<a class="project-official" href="${esc(official.url)}" target="_blank" rel="noopener">进入深空官网 <span>↗</span></a>`:''}${item.hideCover?'':hasGallery?readerImage({src:item.image,alt:item.imageAlt||item.title,caption:item.imageNote,width:item.imageWidth,height:item.imageHeight}):`<img class="reader-cover ${item.imageFit==='contain'?'contained':''}" src="${esc(item.image)}" alt="${esc(item.imageAlt||item.title)}" width="900" height="550" decoding="async"><small>${esc(item.imageNote||'')}</small>`}${sections.map(s=>`<section><h2>${esc(s.title)}</h2>${s.body||s.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}${s.images?.length?`<div class="reader-gallery">${s.images.map(readerImage).join('')}</div>`:''}${s.links?.length?`<div class="reader-section-links">${s.links.map(l=>`<a href="${esc(validURL(l.url))}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join('')}</div>`:''}</section>`).join('')}<div class="reader-links"><a href="${esc(validURL(item.source))}" target="_blank" rel="noopener">${esc(item.sourceLabel||(type==='journal'?'阅读原文':'查看项目完整记录'))} ↗</a>${(item.links||[]).filter(l=>l.url!==item.source).map(l=>`<a href="${esc(validURL(l.url))}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join('')}</div>${relatedJournal?'<div class="related"><button class="text-link" data-journal="'+relatedJournal+'">翻开创作手记 ↗</button></div>':''}`;
 reader.style.setProperty('--reader-depth',Math.min(readerStack.length,3));$('reader-back').hidden=readerStack.length<2;reader.scrollTop=0;return true;
}
const projectLightbox=document.createElement('dialog');projectLightbox.id='project-lightbox';projectLightbox.setAttribute('aria-label','项目图片大图');
projectLightbox.innerHTML='<div class="lightbox-toolbar"><span id="lightbox-count"></span><button id="lightbox-close" aria-label="关闭大图">关闭 ×</button></div><figure><img id="lightbox-image" alt=""><figcaption id="lightbox-caption"></figcaption></figure><div class="lightbox-controls"><button id="lightbox-prev" aria-label="上一张图片">← 上一张</button><button id="lightbox-next" aria-label="下一张图片">下一张 →</button></div>';
document.body.append(projectLightbox);let lightboxIndex=0,lightboxItems=[],lightboxTrigger=null;
function showProjectImage(index){lightboxIndex=(index+lightboxItems.length)%lightboxItems.length;const b=lightboxItems[lightboxIndex];$('lightbox-image').src=b.dataset.readerImage;$('lightbox-image').alt=b.querySelector('img').alt;$('lightbox-caption').textContent=b.dataset.caption;$('lightbox-count').textContent=String(lightboxIndex+1).padStart(2,'0')+' / '+lightboxItems.length}
$('reader-body').addEventListener('click',e=>{const b=e.target.closest('[data-reader-image]');if(!b)return;lightboxItems=[...$('reader-body').querySelectorAll('[data-reader-image]')];lightboxTrigger=b;showProjectImage(lightboxItems.indexOf(b));projectLightbox.showModal();$('lightbox-close').focus()});
$('lightbox-close').onclick=()=>projectLightbox.close();$('lightbox-prev').onclick=()=>showProjectImage(lightboxIndex-1);$('lightbox-next').onclick=()=>showProjectImage(lightboxIndex+1);
projectLightbox.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();e.stopPropagation();showProjectImage(lightboxIndex+(e.key==='ArrowRight'?1:-1))}});
projectLightbox.addEventListener('cancel',e=>{e.preventDefault();e.stopPropagation();projectLightbox.close()});projectLightbox.addEventListener('close',()=>{lightboxTrigger?.focus({preventScroll:true});$('lightbox-image').removeAttribute('src')});
function openReader(type,id){if(!data)return;if(!reader.open){returnFocus=document.activeElement;readerStack=[]}readerStack.push({type,id});if(!readerContent(type,id))return;if(!reader.open){reader.showModal();document.body.style.overflow='hidden';$('reader-close').focus();animate(reader,[{opacity:0,transform:'perspective(1200px) translateY(140px) rotateX(18deg) scale(.75)'},{opacity:1,transform:'none'}],{duration:700})}else if(motionEnabled)$('reader-body').animate([{opacity:0,transform:'perspective(1200px) translateX(100px) rotateY(-18deg)'},{opacity:1,transform:'none'}],{duration:650,easing:'cubic-bezier(.16,1,.3,1)'})}
document.addEventListener('click',e=>{const p=e.target.closest('[data-project]'),j=e.target.closest('[data-journal]');if(p)openReader('project',p.dataset.project);else if(j)openReader('journal',j.dataset.journal)});
async function closeReader(){if(reader.dataset.closing)return;reader.dataset.closing='true';await animate(reader,[{opacity:1,transform:'none'},{opacity:0,transform:'perspective(1200px) translateY(100px) rotateX(12deg) scale(.86)'}],{duration:220,easing:'ease-in'});reader.close();delete reader.dataset.closing}reader.addEventListener('cancel',e=>{e.preventDefault();closeReader()});$('reader-close').onclick=closeReader;$('reader-back').onclick=()=>{readerStack.pop();const v=readerStack.at(-1);if(v){readerContent(v.type,v.id);animate($('reader-body'),[{opacity:0,transform:'perspective(1200px) translateX(-70px) rotateY(12deg)'},{opacity:1,transform:'none'}],{duration:500})}};reader.addEventListener('close',()=>{document.body.style.overflow='';readerStack=[];returnFocus?.focus({preventScroll:true})});reader.addEventListener('click',e=>{if(e.target===reader){const r=reader.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeReader()}});
function updateJourney(){$('journey-count').textContent=String(journeyStep+1).padStart(2,'0')+' / 06';$('journey-next').textContent=journeyStep===5?'继续聊聊 ↗':'继续穿梭 →';$('journey-back').textContent=journeyStep===0?'← 返回作品':'← 上一幕';$('journey-title').innerHTML=journeyStep>=4?'让想法，成为<br><em>可玩的世界。</em>':'想法，<br>有自己的<em>世界。</em>';}
// Keep journey controls outside the movie so they remain interactive on every frame.
async function stepJourney(delta){if(transitioning)return;if(journeyStep+delta<0){location.hash='works';return}if(journeyStep+delta>5){location.hash='contact';return}const n=journeyStep+delta;const ok=await moveScene(journeyStates[journeyStep],journeyStates[n],journeyClips[Math.min(journeyStep,n)],delta<0);if(ok&&route==='journey'){journeyStep=n;updateJourney()}}
$('journey-start').onclick=()=>{journeyStep=0;location.hash='journey'};$('journey-next').onclick=()=>{stopAuto();stepJourney(1)};$('journey-back').onclick=()=>{stopAuto();stepJourney(-1)};
window.addEventListener('wheel',e=>{if(routeTransitioning||reader.open||route!=='journey'||small.matches||!motionEnabled)return;if(Math.abs(e.deltaY)<Math.abs(e.deltaX))return;e.preventDefault();stopAuto();if(transitioning)return;wheelTotal+=e.deltaY;clearTimeout(wheelTimer);wheelTimer=setTimeout(()=>wheelTotal=0,150);if(Math.abs(wheelTotal)>65){const d=Math.sign(wheelTotal);wheelTotal=0;stepJourney(d)}},{passive:false});
document.addEventListener('keydown',e=>{if(routeTransitioning||reader.open||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,textarea,select'))return;if(e.key==='Escape'&&route==='journey'){location.hash='works';return}if(['ArrowDown','ArrowUp'].includes(e.key)&&route==='journey'){e.preventDefault();stopAuto();const d=e.key==='ArrowDown'?1:-1;stepJourney(d)}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopAuto();cancelMotion();if(routeTransitioning)go(requestedRoute,{instant:true});else setPoster(activeScene)}else if(route==='home')syncHomeScroll()});
fetch('content-local.json?v=jev-journal-19',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('content');return r.json()}).then(d=>{data=d;populateView();if(!routeTransitioning&&['works','journal','news'].includes(route))enterView(route)}).catch(()=>{$('content-error').hidden=false});
})();
