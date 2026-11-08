import Prism from './vendor/prism.cjs';

const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const decodeHTML=value=>value.replace(/&(?:amp|lt|gt|quot|#39|apos);/g,entity=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'",'&apos;':"'"}[entity]));
const aliases={js:'javascript',ts:'typescript',py:'python',sh:'bash',shell:'bash',pseudocode:'python',text:'plain',plaintext:'plain'};
const names={python:'Python',javascript:'JavaScript',typescript:'TypeScript',json:'JSON',bash:'Shell',pseudocode:'概念伪代码',plain:'执行记录',http:'HTTP'};

export function renderRichContent(html) {
  let output=html.replace(/<pre\b[^>]*>\s*<code\b([^>]*)>([\s\S]*?)<\/code>\s*<\/pre>/gi,(_,attributes,encoded)=>{
    const requested=attributes.match(/(?:language|lang)-([a-z0-9+-]+)/i)?.[1]?.toLowerCase()||'plain';
    const language=aliases[requested]||requested;
    const text=decodeHTML(encoded).replaceAll('\r\n','\n').replace(/^\n|\n$/g,'');
    const highlighted=Prism.languages[language]?Prism.highlight(text,Prism.languages[language],language):escapeHTML(text);
    const lines=text.split('\n').length;
    return `<div class="code-frame"><div class="code-toolbar"><span>${escapeHTML(names[requested]||names[language]||requested)}</span><small>${lines} 行</small><button type="button" data-copy-code aria-label="复制代码">复制</button></div><pre><code class="language-${escapeHTML(requested)}">${highlighted}</code></pre></div>`;
  });
  output=output.replace(/<figure([^>]*)>([\s\S]*?)<\/figure>/gi,(_,attributes,body)=>{
    if(!/class=['"][^'"]*learn-figure/.test(attributes))return `<figure${attributes}>${body}</figure>`;
    if (/<a\b[^>]*>\s*<img\b/i.test(body)) {
      const enhanced=body.replace(/<a\b([^>]*)>(\s*<img\b[^>]*>)([\s\S]*?)<\/a>/i,(_,attrs,img,tail)=>{
        const linked=attrs.replace(/class=(['"])(.*?)\1/i,(_,quote,classes)=>`class=${quote}${classes} figure-open${quote}`);
        const finalAttrs=/class=['"]/.test(linked)?linked:`${linked} class="figure-open"`;
        return `<a${finalAttrs}>${img}${tail}<span class="figure-zoom-hint">放大查看 ↗</span></a>`;
      });
      return `<figure${attributes}>${enhanced}</figure>`;
    }
    const source=body.match(/<img\b[^>]*\bsrc=['"]([^'"]+)['"]/i)?.[1];
    if(!source)return `<figure${attributes}>${body}</figure>`;
    return `<figure${attributes}>${body.replace(/<img\b[^>]*>/i,img=>`<a class="figure-open" href="${escapeHTML(source)}" target="_blank" rel="noopener noreferrer" aria-label="放大查看图解">${img}<span class="figure-zoom-hint">放大查看 ↗</span></a>`)}</figure>`;
  });
  return output;
}

export function validateRichAssets(html) {
  return [...html.matchAll(/<img\b[^>]*\bsrc=['"]([^'"]+)['"]/g)].map(match=>match[1]);
}
