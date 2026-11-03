(() => {
  const images = [...document.querySelectorAll('[data-project-image]')];
  if (!images.length) return;
  const viewer = document.createElement('dialog');
  viewer.className = 'project-gallery-viewer';
  viewer.setAttribute('aria-label', '项目图片大图');
  viewer.innerHTML = '<header><span data-gallery-count></span><button type="button" data-gallery-close aria-label="关闭大图">关闭 ×</button></header><figure><img data-gallery-image alt=""><figcaption data-gallery-caption></figcaption></figure><nav aria-label="图片切换"><button type="button" data-gallery-prev>← 上一张</button><button type="button" data-gallery-next>下一张 →</button></nav>';
  document.body.append(viewer);
  const image = viewer.querySelector('[data-gallery-image]');
  let current = 0, trigger, previousOverflow;
  function show(index) {
    current = (index + images.length) % images.length;
    image.src = images[current].href;
    image.alt = images[current].querySelector('img').alt;
    viewer.querySelector('[data-gallery-caption]').textContent = images[current].dataset.caption;
    viewer.querySelector('[data-gallery-count]').textContent = `${String(current + 1).padStart(2, '0')} / ${images.length}`;
  }
  for (const link of images) link.addEventListener('click', event => {
    event.preventDefault(); trigger = link; show(images.indexOf(link));
    previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    viewer.showModal(); viewer.querySelector('[data-gallery-close]').focus();
  });
  viewer.querySelector('[data-gallery-close]').onclick = () => viewer.close();
  viewer.querySelector('[data-gallery-prev]').onclick = () => show(current - 1);
  viewer.querySelector('[data-gallery-next]').onclick = () => show(current + 1);
  viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); show(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  viewer.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow; image.removeAttribute('src'); trigger?.focus({preventScroll:true});
  });
})();
