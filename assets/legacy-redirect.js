(() => {
  const prefix = '/portfolio';
  if (location.pathname !== prefix && !location.pathname.startsWith(`${prefix}/`)) return;
  const target = new URL('https://be1human.github.io/');
  const path = location.pathname.slice(prefix.length);
  target.pathname = !path || path === '/' || path === '/index.html' ? '/' : path;
  target.search = location.search;
  target.hash = location.hash;
  location.replace(target.href);
})();
