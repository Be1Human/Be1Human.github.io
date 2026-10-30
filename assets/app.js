for (const root of document.querySelectorAll('[data-filterable]')) {
  const cards = [...root.querySelectorAll('[data-filter-item]')];
  const buttons = [...root.querySelectorAll('[data-filter]')];
  const input = root.querySelector('[data-search-input]');
  const counter = root.querySelector('[data-count]');
  const empty = root.querySelector('[data-empty]');
  const allowed = new Set(buttons.map(button => button.dataset.filter));
  let selected = 'all';
  function filter() {
    const query = input.value.trim().normalize('NFKC').toLocaleLowerCase();
    let visible = 0;
    for (const card of cards) {
      const show = (selected === 'all' || card.dataset.category === selected) && card.dataset.search.normalize('NFKC').toLocaleLowerCase().includes(query);
      card.hidden = !show;
      if (show) visible++;
    }
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.filter === selected));
    for (const section of root.querySelectorAll('[data-filter-section]')) section.hidden = ![...section.querySelectorAll('[data-filter-item]')].some(card => !card.hidden);
    counter.textContent = selected === 'all' && !query ? `共 ${visible} ${counter.dataset.noun}` : `找到 ${visible} / ${cards.length} ${counter.dataset.noun}`;
    empty.hidden = visible !== 0;
  }
  function loadState() {
    const params = new URL(location.href).searchParams;
    selected = allowed.has(params.get('category')) ? params.get('category') : 'all';
    input.value = params.get('q') || '';
    filter();
  }
  function saveState() {
    const url = new URL(location.href);
    if (selected === 'all') url.searchParams.delete('category'); else url.searchParams.set('category', selected);
    if (input.value.trim()) url.searchParams.set('q', input.value.trim()); else url.searchParams.delete('q');
    history.replaceState(null, '', url);
    filter();
  }
  for (const button of buttons) button.addEventListener('click', () => { selected = button.dataset.filter; saveState(); });
  input.addEventListener('input', saveState);
  root.querySelector('[data-clear]').addEventListener('click', () => { selected = 'all'; input.value = ''; saveState(); input.focus(); });
  window.addEventListener('popstate', loadState);
  root.querySelector('[data-controls]').hidden = false;
  loadState();
}
const editionSelect = document.querySelector('[data-edition-select]');
if (editionSelect) {
  editionSelect.addEventListener('change', () => { window.location.assign(editionSelect.value); });
  // Support the same shareable date parameter as the original Dot reader.
  const requestedDate = new URL(location.href).searchParams.get('date');
  if (requestedDate) {
    const selected = [...editionSelect.options].find(option => option.value.endsWith(`/${requestedDate}.html`));
    if (selected) {
      const target = new URL(selected.value, location.href);
      target.search = location.search;
      target.searchParams.delete('date');
      target.hash = location.hash;
      if (target.href !== location.href) window.location.replace(target.href);
    }
  }
}
for (const image of document.querySelectorAll('.news-preview img')) {
  const fallback = () => image.parentElement.classList.add('media-unavailable');
  image.addEventListener('error', fallback);
  if (image.complete && image.naturalWidth === 0) fallback();
}
// Keep incoming links from the original one-page portfolio useful.
if (document.body.dataset.page === 'home') {
  const id = location.hash.slice(1);
  const legacy = new Set(['works', 'mineclaw', 'wallpaper-workshop', 'titan-town', 'hades-study', 'network-diary', 'animation-workflow', 'clawpm']);
  if (legacy.has(id)) location.replace(`works.html#${encodeURIComponent(id)}`);
}
