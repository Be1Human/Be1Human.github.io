import { createHash } from 'node:crypto';
export const SOURCE_URL = 'https://ai-hot20-daily.next-ace-help.chatgpt.site';
export const SOURCE_PROJECT = 'appgprj_6acdd345a22c819182154b950d3994f3';
export const EDITION_ID = /^\d{4}-\d{2}-\d{2}(?:-[a-z0-9-]+)?$/;
export function textValue(value, name, max = 6000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`Invalid ${name}`);
  return value.trim();
}
export function httpsUrl(value) {
  const url = new URL(textValue(value, 'URL', 4000));
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Only credential-free HTTPS links are allowed');
  return url.href;
}
export function validateEditionId(id) {
  if (!EDITION_ID.test(id) || Number.isNaN(Date.parse(id.slice(0, 10))) || new Date(id.slice(0, 10)).toISOString().slice(0, 10) !== id.slice(0, 10)) throw new Error(`Invalid edition date: ${id}`);
  return id;
}
// Explicit allowlist: quote drafts, comments, private research and source credentials never cross this boundary.
export function normalizeEdition(raw, id) {
  validateEditionId(id);
  if (raw.date !== id && raw.date !== id.slice(0, 10)) throw new Error(`Edition date mismatch: ${id}`);
  if (!Array.isArray(raw.items) || !raw.items.length || raw.items.length > 100) throw new Error(`Invalid item count: ${id}`);
  const seen = new Set();
  const items = raw.items.map((item, index) => {
    const url = httpsUrl(item.url);
    if (seen.has(url)) throw new Error(`Duplicate original link in ${id}`);
    seen.add(url);
    const result = {
      id: createHash('sha256').update(url).digest('hex').slice(0, 16), rank: index + 1,
      title: textValue(item.title, 'title', 300), summary: textValue(item.summary, 'summary'),
      category: typeof item.category === 'string' && item.category.trim() ? item.category.trim() : '科技动态',
      author: typeof item.author === 'string' ? item.author.trim() : '', url,
      sources: (item.sources || []).map(source => ({title: textValue(source.title || '来源资料', 'source title', 300), url: httpsUrl(source.url)})),
    };
    for (const field of ['publishedAtISO', 'observedAt']) {
      if (item[field] && !Number.isNaN(Date.parse(item[field]))) result[field] = new Date(item[field]).toISOString();
    }
    const media = Array.isArray(item.media) ? item.media.find(m => m.thumbnail && /^https:\/\/pbs\.twimg\.com\//.test(m.thumbnail)) : null;
    if (media) result.preview = {url: httpsUrl(media.thumbnail), alt: typeof media.alt === 'string' ? media.alt : item.title, type: media.type === 'video' ? 'video' : 'image'};
    return result;
  });
  return {id, date: id.slice(0, 10), label: textValue(raw.label || id, 'edition label', 300), sourceUrl: `${SOURCE_URL}/?date=${encodeURIComponent(id)}`, items};
}
export function buildArchive(editions, previous, revision, now = new Date().toISOString()) {
  if (!/^[0-9a-f]{40}$/.test(revision)) throw new Error('A verified source revision is required');
  editions.sort((a, b) => b.id.localeCompare(a.id));
  const next = {version: 1, sourceName: 'AI 热门 20 · 每日精选', sourceUrl: SOURCE_URL, sourceRevision: revision, syncedAt: now, editions};
  if (previous && JSON.stringify(previous.editions) === JSON.stringify(editions)) return previous;
  if (previous?.editions?.some(old => !editions.some(current => current.id === old.id))) throw new Error('Source lost an archived edition; keeping the existing archive');
  return next;
}
