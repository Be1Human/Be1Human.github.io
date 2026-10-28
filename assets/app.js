const filters = document.querySelector('.filters');
const cards = [...document.querySelectorAll('.project-card')];
const counter = document.querySelector('.work-count');
const allowed = new Set(['all', ...cards.map((card) => card.dataset.category)]);

if (filters && counter) {
  function applyFilter(category) {
    const selected = allowed.has(category) ? category : 'all';
    let visible = 0;
    for (const card of cards) {
      const show = selected === 'all' || card.dataset.category === selected;
      card.hidden = !show;
      if (show) visible += 1;
    }
    for (const button of filters.querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(button.dataset.filter === selected));
    }
    counter.textContent = selected === 'all' ? `共 ${visible} 件作品` : `显示 ${visible} / ${cards.length} 件作品`;
  }

  filters.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-filter]');
    if (!button) return;
    const category = button.dataset.filter;
    const url = new URL(window.location.href);
    if (category === 'all') url.searchParams.delete('category');
    else url.searchParams.set('category', category);
    window.history.replaceState(null, '', url);
    applyFilter(category);
  });

  window.addEventListener('popstate', () => {
    applyFilter(new URL(window.location.href).searchParams.get('category') || 'all');
  });
  applyFilter(new URL(window.location.href).searchParams.get('category') || 'all');
  filters.hidden = false;
}
