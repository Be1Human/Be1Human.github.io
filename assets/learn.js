const dialog = document.querySelector('#learn-search-dialog');
const input = document.querySelector('#learn-query');
const results = [...document.querySelectorAll('[data-search-result]')];
const base = document.body.dataset.learningBase;
let searchIndex;
let indexPromise;
let queryVersion = 0;
let opener;
let rankedResults = results;
async function filterSearch() {
  const version = ++queryVersion;
  const query = input.value.trim().toLocaleLowerCase();
  let failure = false;
  if (!searchIndex) {
    try {
      indexPromise ||= fetch(`${base}assets/learning-search.json`, {cache:'no-cache'}).then(response=>{
        if (!response.ok) throw Error('Search unavailable');
        return response.json();
      }).catch(error=>{indexPromise=undefined;throw error;});
      searchIndex = await indexPromise;
    } catch { failure = true; }
  }
  if (version !== queryVersion) return false;
  const tokens = query.split(/\s+/).filter(Boolean);
  let count = 0;
  const ranked = [];
  for (const result of results) {
    const article = searchIndex?.find(a=>a.id===result.dataset.searchResult);
    const haystack = article ? `${article.title} ${article.summary} ${article.category} ${article.text}` : result.textContent;
    const match = tokens.every(token=>haystack.toLocaleLowerCase().includes(token));
    result.hidden = !match;
    if (match) {
      count++;
      const title=(article?.title||result.querySelector('strong').textContent).toLocaleLowerCase();
      const summary=(article?.summary||'').toLocaleLowerCase();
      ranked.push({result,score:tokens.reduce((score,token)=>score+(title.includes(token)?10:0)+(summary.includes(token)?3:0),0)});
    }
  }
  ranked.sort((a,b)=>b.score-a.score);
  rankedResults=ranked.map(item=>item.result);
  for(const result of rankedResults)document.querySelector('.learn-search-results').append(result);
  document.querySelector('.learn-search-count').textContent = `${query?`找到 ${count} 篇文章`:`全部 ${count} 篇文章`}${failure?' · 正文索引暂不可用，已搜索标题与摘要':''}`;
  document.querySelector('.learn-search-empty').hidden = count>0;
  return true;
}
function openSearch(trigger) {if(dialog.closest('[hidden]'))return;opener=trigger;dialog.showModal();input.focus();filterSearch();}
for (const trigger of document.querySelectorAll('[data-learn-search]')) {
  trigger.hidden = false;
  trigger.addEventListener('click',()=>{
    openSearch(trigger);
  });
}
document.querySelector('[data-search-close]').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>opener?.focus());
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
input.addEventListener('input',filterSearch);
input.addEventListener('keydown',async event=>{if(event.key==='Enter'){event.preventDefault();if(await filterSearch()){const first=rankedResults[0];if(first)location.assign(first.href);}}});
document.addEventListener('keydown',event=>{if(dialog.closest('[hidden]'))return;if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();if(dialog.open)dialog.close();else openSearch(document.activeElement);}});

const article=document.querySelector('[data-learning-article]');
const progress=document.querySelector('.learn-progress span');
let scheduled=false;
function updateProgress(){const rect=article.getBoundingClientRect();const max=Math.max(1,article.scrollHeight-window.innerHeight+100);progress.style.width=`${Math.max(0,Math.min(100,-rect.top/max*100))}%`;updateToc();scheduled=false;}
window.addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(updateProgress);}},{passive:true});
const tocLinks=[...document.querySelectorAll('.learn-toc nav a')];
function updateToc(){let selected=tocLinks[0];for(const link of tocLinks){if(document.getElementById(link.hash.slice(1))?.getBoundingClientRect().top<=155)selected=link;}for(const link of tocLinks){const active=link===selected;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');}}
window.addEventListener('resize',updateProgress); updateProgress();
for(const pre of article.querySelectorAll('pre')){
  const button=document.createElement('button');button.type='button';button.className='learn-copy';button.textContent='复制';button.setAttribute('aria-label','复制代码');
  button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(pre.querySelector('code')?.textContent||pre.textContent.replace(button.textContent,''));button.textContent='已复制';}catch{button.textContent='请手动选择';}setTimeout(()=>button.textContent='复制',1800);});
  pre.append(button);
}
for(const button of document.querySelectorAll('[data-demo-step]'))button.addEventListener('click',()=>{for(const tab of document.querySelectorAll('[data-demo-step]'))tab.setAttribute('aria-pressed',String(tab===button));for(const panel of document.querySelectorAll('[data-demo-panel]'))panel.hidden=panel.dataset.demoPanel!==button.dataset.demoStep;});
