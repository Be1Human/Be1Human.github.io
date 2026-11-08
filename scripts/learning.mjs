import {renderRichContent} from './rich-content.mjs';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const categories = [
  {title:'核心机制', caption:'注意力、推理与行动控制', ids:['softmax-attention','react','agent-loop','supervisor-verify-eval','tool-calling','workflows-vs-agents']},
  {title:'上下文与协作', caption:'让信息、记忆与工具各就其位', ids:['context-engineering','agent-memory','agentic-rag','planning-and-reflection','multi-agent','mcp']},
  {title:'评测与进阶', caption:'用可观察的结果检验能力', ids:['agent-evaluation','test-time-compute','agent-observability']},
];
export const learningOrder = categories.flatMap(category=>category.ids);
const e = value => String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plain = value => value.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const label = {'softmax-attention':'Softmax 与 Attention',react:'ReAct 框架', 'agent-loop':'Agent Loop', 'supervisor-verify-eval':'Supervisor · Verify · Eval', 'tool-calling':'工具与函数调用', 'workflows-vs-agents':'Workflow 与 Agent', 'context-engineering':'上下文工程', 'agent-memory':'Agent 记忆', 'agentic-rag':'Agentic RAG', 'planning-and-reflection':'规划与反思', 'multi-agent':'多 Agent 协作', mcp:'MCP 协议', 'agent-evaluation':'Agent 评测综述', 'test-time-compute':'推理时计算', 'agent-observability':'可观测性与追踪'};

export function validateLearning(articles) {
  if (!articles.length || new Set(articles.map(a=>a.id)).size !== articles.length) throw Error('Learning articles must have unique IDs');
  for (const article of articles) {
    if (!learningOrder.includes(article.id) || !article.title || !article.summary || !article.eyebrow || !categories.some(c=>c.title===article.category) || !/^\d{4}-\d{2}-\d{2}$/.test(article.updated)) throw Error(`Invalid learning article: ${article.id}`);
    if (article.sections.length < 4 || article.sources.length < 3) throw Error(`Incomplete learning article: ${article.id}`);
    const ids = article.sections.map(s=>s.id).concat(article.sources.map(s=>s.id), ['references']);
    if (ids.some(id=>!/^[a-z0-9-]+$/.test(id)) || new Set(ids).size!==ids.length) throw Error(`Invalid section/source ID: ${article.id}`);
    for (const section of article.sections) {
      if (!section.title || !section.body || /<(?:script|iframe|object|embed|form)\b|\bon\w+\s*=|javascript:/i.test(section.body)) throw Error(`Unsafe or empty learning section: ${article.id}/${section.id}`);
      for (const [,id] of section.body.matchAll(/href=['"]#([^'"]+)['"]/g)) if (!ids.includes(id)) throw Error(`Missing learning anchor: ${article.id}#${id}`);
    }
    for (const source of article.sources) if (new URL(source.url).protocol !== 'https:') throw Error(`Learning source must be HTTPS: ${article.id}`);
  }
}

export async function readLearning(root) {
  const lists = await Promise.all(['foundations','frontier','evaluation','comparisons','attention'].map(name=>readFile(resolve(root,`data/learning/${name}.json`),'utf8').then(JSON.parse)));
  const articles = lists.flat().sort((a,b)=>learningOrder.indexOf(a.id)-learningOrder.indexOf(b.id));
  validateLearning(articles);
  if (articles.length !== learningOrder.length) throw Error('The first learning collection is incomplete');
  return articles;
}

export function learningPages(articles) {
  const byId = new Map(articles.map(a=>[a.id,a]));
  const pathFor = id => id ? `learn/${id}.html` : 'learn.html';
  const sidebar = (current, base) => `<a class="learn-home${current?'':' current'}" href="${base}learn.html"${current?'':' aria-current="page"'}><span class="learn-book" aria-hidden="true">A</span><span>Agent 学习<small>原理 · 论文 · 实践</small></span></a><button class="learn-search-trigger" type="button" data-learn-search hidden><span aria-hidden="true">⌕</span>搜索文章与概念<kbd>Ctrl K</kbd></button><nav class="learn-tree" aria-label="学习章节">${categories.map((group,i)=>`<details open><summary><span>${String(i+1).padStart(2,'0')}</span>${group.title}</summary><div>${group.ids.map(id=>`<a href="${base}${pathFor(id)}"${current===id?' aria-current="page"':''}>${e(label[id])}${['react','agent-loop','agent-evaluation'].includes(id)?'<i aria-label="首期重点">•</i>':''}</a>`).join('')}</div></details>`).join('')}</nav><div class="learn-sidebar-end"><span>第一期 · ${articles.length} 篇</span><a href="${base}index.html">← 返回个人博客</a></div>`;
  const toc = article => article ? article.sections.map(s=>`<a href="#${s.id}">${e(s.title)}</a>`).join('')+'<a href="#references">参考资料</a>' : '<a href="#start">从这里开始</a>'+categories.map((c,i)=>`<a href="#group-${i+1}">${c.title}</a>`).join('');
  const search = base => `<dialog class="learn-search-dialog" id="learn-search-dialog" aria-labelledby="learn-search-title"><div class="learn-search-head"><label id="learn-search-title" for="learn-query">搜索 Agent 学习</label><button type="button" data-search-close aria-label="关闭搜索">Esc ×</button></div><div class="learn-search-field"><span aria-hidden="true">⌕</span><input id="learn-query" type="search" placeholder="试试 ReAct、记忆、评测…" autocomplete="off"><kbd>↵</kbd></div><p class="learn-search-count" aria-live="polite">输入关键词，搜索 ${articles.length} 篇文章</p><div class="learn-search-results">${articles.map(a=>`<a href="${base}${pathFor(a.id)}" data-search-result="${a.id}"><small>${a.category}</small><strong>${e(a.title)} <span aria-hidden="true">↗</span></strong><p>${e(a.summary)}</p></a>`).join('')}</div><p class="learn-search-empty" hidden>没有找到相关内容，试试其他关键词。</p></dialog>`;
  function shell(current, article, content) {
    const base = current ? '../' : '';
    return `<div class="learn-progress" aria-hidden="true"><span></span></div><div class="learn-layout"><aside class="learn-sidebar">${sidebar(current,base)}</aside><div class="learn-main-wrap"><details class="learn-mobile-menu"><summary>☰ 学习目录<span>${current?e(label[current]):'学习指南'}</span></summary>${sidebar(current,base)}</details><article class="learn-main" data-learning-article><div class="learn-breadcrumb"><a href="${base}learn.html">Agent 学习</a><span>/</span><span>${article?article.category:'学习指南'}</span></div>${content}</article><footer class="learn-footnote"><span>云上男孩 · Agent Learning</span></footer></div><aside class="learn-toc"><p>本页目录</p><nav aria-label="页内目录">${toc(article)}</nav><a class="learn-top" href="#top">返回顶部 ↑</a><div class="learn-toc-note">${article?`${e(article.level)} · 约 ${article.minutes} 分钟<br>更新于 ${article.updated.replaceAll('-','.')}`:'从原理出发<br>用实践验证'}</div></aside></div>${search(base)}`;
  }
  const tocMobile = article => `<details class="learn-mobile-toc"><summary>本页目录</summary><nav aria-label="移动端页内目录">${toc(article)}</nav></details>`;
  const cards = ids => ids.map(id=>{const a=byId.get(id);return `<a class="learn-topic" href="learn/${id}.html"><div><span>${e(a.eyebrow)}</span><span>${e(a.level)} · ${a.minutes} 分钟</span></div><h3>${e(label[id])}<span aria-hidden="true">↗</span></h3><p>${e(a.summary)}</p></a>`}).join('');
  const featured = articles.filter(article=>article.featured).map(article=>`<a class="learn-featured" href="learn/${article.id}.html"><span>调度 · 验证 · 评测</span><h2>${e(label[article.id])}<b aria-hidden="true">↗</b></h2><p>${e(article.summary)}</p><small>调度方向 · 执行验证 · 系统评测</small></a>`).join('');
  const overview = `<header class="learn-intro"><p class="learn-eyebrow">CLOUD BOY / AGENT LEARNING</p><h1>Agent 学习</h1><p class="learn-lede">从注意力计算到 Agent 运行机制。各篇按主题展开原理，配合公式、流程图、代码与论文资料。</p><div class="learn-meta"><span>第一期</span><span>${articles.length} 篇笔记</span><time datetime="2026-11-08">2026.11.08 更新</time></div></header><div class="learn-overview-graph" aria-label="Agent 核心链路：目标进入上下文，模型决策调用工具，观察返回上下文；评测贯穿执行"><div class="learn-graph-top"><span>理解一条完整的行动链</span><span class="learn-live-dot">LEARNING MAP</span></div><div class="learn-map-flow"><div><small>01 / CONTEXT</small><strong>目标与上下文</strong><span>任务 · 记忆 · 检索</span></div><b aria-hidden="true">→</b><div><small>02 / REASON</small><strong>模型决策</strong><span>规划 · 选择 · 停止</span></div><b aria-hidden="true">→</b><div><small>03 / ACT</small><strong>工具与环境</strong><span>执行 · 观察 · 校验</span></div></div><div class="learn-map-feedback"><span>↶ 观察结果，更新下一步</span><span>评测与追踪贯穿全程 ↗</span></div></div><section class="learn-section" id="start"><div class="learn-section-title"><span>START HERE</span><h2>三条主线</h2></div><div class="learn-start-list">${[['react','01','推理、行动与观察如何交错'],['agent-loop','02','状态如何更新，任务何时停止'],['agent-evaluation','03','任务、判据与重复运行指标']].map(([id,note,caption])=>`<a href="learn/${id}.html"><span class="learn-start-number">${note}</span><div><h3>${e(label[id])}</h3><p>${caption}</p></div><span aria-hidden="true">→</span></a>`).join('')}</div></section>${featured}${categories.map((group,i)=>`<section class="learn-section" id="group-${i+1}"><div class="learn-section-title"><span>0${i+1} / ${group.ids.length} ARTICLES</span><h2>${group.title}</h2><p>${group.caption}</p></div><div class="learn-topic-grid">${cards(group.ids)}</div></section>`).join('')}`;
  const pages = [{path:'learn.html',title:'Agent 学习 — 克劳德梦见电子羊',summary:'一份持续更新的 Agent 学习 Wiki：ReAct、Agent Loop、ACL 评测综述，以及上下文工程、记忆、MCP 等前沿概念。',body:shell(null,null,overview)}];
  for (const [index,article] of articles.entries()) {
    const related = article.id==='softmax-attention' ? ['context-engineering','react','test-time-compute'] : article.id==='supervisor-verify-eval' ? ['agent-loop','agent-evaluation','agent-observability'] : article.id==='react' ? ['agent-loop','tool-calling','planning-and-reflection'] : article.id==='agent-evaluation' ? ['supervisor-verify-eval','agent-observability','test-time-compute'] : [articles[(index+1)%articles.length].id,articles[(index+3)%articles.length].id];
    const content = `<header class="learn-intro"><p class="learn-eyebrow">${e(article.eyebrow)}</p><h1>${e(article.title)}</h1><p class="learn-lede">${e(article.summary)}</p><div class="learn-meta"><span>${e(article.level)}</span><span>约 ${article.minutes} 分钟</span><time datetime="${article.updated}">更新于 ${article.updated.replaceAll('-','.')}</time></div></header>${tocMobile(article)}<div class="learn-prose">${article.sections.map(section=>`<section id="${section.id}"><h2>${e(section.title)}<a class="learn-anchor" href="#${section.id}" aria-label="链接到${e(section.title)}">#</a></h2>${renderRichContent(section.body)}</section>`).join('')}<section id="references"><h2>参考资料</h2><p class="learn-source-note">论文、官方文档与案例依据。</p><ol class="learn-references">${article.sources.map((s,i)=>`<li id="${s.id}"><span>[${i+1}]</span><div><a href="${e(s.url)}" target="_blank" rel="noopener noreferrer">${e(s.title)} ↗</a>${s.note?`<p>${e(s.note)}</p>`:''}</div></li>`).join('')}</ol></section></div><section class="learn-related"><h2>关联阅读</h2><div>${related.map(id=>`<a href="${id}.html">${e(label[id])}<span>→</span></a>`).join('')}</div></section><nav class="learn-pagination" aria-label="文章前后导航">${index?`<a href="${articles[index-1].id}.html"><small>← 上一篇</small><strong>${e(label[articles[index-1].id])}</strong></a>`:'<a href="../learn.html"><small>← 返回</small><strong>学习指南</strong></a>'}${index<articles.length-1?`<a href="${articles[index+1].id}.html"><small>下一篇 →</small><strong>${e(label[articles[index+1].id])}</strong></a>`:'<a href="../learn.html"><small>继续探索 →</small><strong>全部文章</strong></a>'}</nav>`;
    pages.push({path:pathFor(article.id),title:`${article.title} — Agent 学习`,summary:article.summary,body:shell(article.id,article,content)});
  }
  const searchIndex = articles.map(a=>({id:a.id,title:a.title,summary:a.summary,category:a.category,text:plain(a.sections.map(s=>s.title+' '+s.body).join(' '))}));
  return {pages, searchIndex};
}
