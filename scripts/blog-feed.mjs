import { validateEditionId } from './news-data.mjs';

const localDate = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit'});
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));

function validateDate(entry) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) throw new Error('Invalid blog date');
  validateEditionId(entry.date);
  if (entry.publishedAt !== undefined) {
    if (typeof entry.publishedAt !== 'string' || !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(entry.publishedAt) || !Number.isFinite(Date.parse(entry.publishedAt))) throw new Error('Invalid publication timestamp');
    if (localDate.format(new Date(entry.publishedAt)) !== entry.date) throw new Error('Publication date must match Los Angeles time');
  }
}

export function validateUpdate(update) {
  if (!/^[a-z0-9-]+$/.test(update.id)) throw new Error('Invalid update ID');
  validateDate(update);
  if (typeof update.content !== 'string' || !update.content.trim() || update.content.length > 20000) throw new Error('An update needs text');
  if (update.image && (!/^assets\/images\/[\w.-]+$/.test(update.image) || typeof update.imageAlt !== 'string' || !update.imageAlt.trim())) throw new Error('Invalid update image');
  return update;
}

export function buildFeed(posts, updates) {
  const ids = new Set();
  for (const update of updates) {
    validateUpdate(update);
    if (ids.has(update.id)) throw new Error('Duplicate update ID');
    ids.add(update.id);
  }
  for (const post of posts) {
    validateDate(post);
    if (post.inFeed !== undefined && typeof post.inFeed !== 'boolean') throw new Error('inFeed must be a boolean');
  }
  const entries = [
    ...updates.map(update => ({...update, type: 'status', permalink: `index.html#status-${update.id}`})),
    ...posts.filter(post => post.inFeed !== false).map(post => ({...post, type: 'article', permalink: `posts/${post.id}.html`})),
  ];
  // Undated times retain their existing order; new posts can be ordered precisely within a day.
  return entries.sort((a, b) => b.date.localeCompare(a.date) || (b.publishedAt ? Date.parse(b.publishedAt) : 0) - (a.publishedAt ? Date.parse(a.publishedAt) : 0));
}

export function renderStatusText(content) {
  return content.trim().split(/\r?\n\s*\r?\n/).map(paragraph => `<p>${escapeHTML(paragraph).replace(/\r?\n/g, '<br>')}</p>`).join('');
}
