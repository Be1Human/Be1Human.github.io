const viewer=document.createElement('dialog');
viewer.id='reading-figure-viewer';
viewer.setAttribute('aria-label','查看图解');
viewer.innerHTML='<div class="figure-viewer-toolbar"><span>图解</span><button type="button" data-figure-scale>原尺寸</button><a target="_blank" rel="noopener noreferrer" data-original-figure>打开原图 ↗</a><button type="button" data-figure-close aria-label="关闭图解">关闭 ×</button></div><div class="figure-viewer-scroll"><img alt=""></div><p class="figure-viewer-caption"></p>';
document.body.append(viewer);
let figureTrigger;
viewer.querySelector('[data-figure-close]').addEventListener('click',()=>viewer.close());
viewer.querySelector('[data-figure-scale]').addEventListener('click',event=>{const zoomed=viewer.classList.toggle('is-zoomed');event.currentTarget.textContent=zoomed?'适合窗口':'原尺寸';});
viewer.addEventListener('close',()=>{viewer.classList.remove('is-zoomed');viewer.querySelector('[data-figure-scale]').textContent='原尺寸';figureTrigger?.focus({preventScroll:true});});
viewer.addEventListener('click',event=>{if(event.target===viewer){const r=viewer.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)viewer.close();}});
document.addEventListener('click',async event=>{
  const copy=event.target.closest('[data-copy-code]');
  if(copy){
    const code=copy.closest('.code-frame').querySelector('code');
    try{await navigator.clipboard.writeText(code.textContent);copy.textContent='已复制';}catch{copy.textContent='请手动选择';}
    setTimeout(()=>copy.textContent='复制',1600);
    return;
  }
  const link=event.target.closest('a.figure-open');
  if(!link||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();figureTrigger=link;
  const image=link.querySelector('img'),target=viewer.querySelector('img');
  target.src=image.currentSrc||image.src;target.alt=image.alt;
  viewer.querySelector('[data-original-figure]').href=link.href;
  viewer.querySelector('.figure-viewer-caption').textContent=link.closest('figure').querySelector('figcaption')?.textContent||image.alt;
  viewer.showModal();
});
