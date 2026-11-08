// Preserve old bookmarks while keeping one learning directory.
const destination = new URL('index.html', location.href);
destination.search = location.search;
destination.hash = 'learning';
location.replace(destination.href);
