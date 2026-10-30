import { readFile, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { buildArchive, normalizeEdition, validateEditionId, SOURCE_PROJECT } from './news-data.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/sync-news.mjs /absolute/path/to/verified-source-checkout');
const checkout = resolve(source);
const manifest = JSON.parse(await readFile(resolve(checkout, '.openai/hosting.json'), 'utf8'));
if (manifest.project_id !== SOURCE_PROJECT) throw new Error('The source checkout is not the authorized daily-news Site');
const git = (...args) => execFileSync('git', ['-C', checkout, ...args], {encoding: 'utf8'}).trim();
if (git('status', '--porcelain')) throw new Error('Use an unmodified source checkout');
const revision = git('rev-parse', 'HEAD');
const index = JSON.parse(await readFile(resolve(checkout, 'dist/data/editions.json'), 'utf8'));
if (!Array.isArray(index.editions) || !index.editions.length) throw new Error('No source editions found');
const ids = new Set();
const editions = [];
for (const entry of index.editions) {
  validateEditionId(entry.date);
  if (ids.has(entry.date)) throw new Error('Duplicate edition');
  ids.add(entry.date);
  const raw = JSON.parse(await readFile(resolve(checkout, `dist/data/${entry.date}.json`), 'utf8'));
  editions.push(normalizeEdition(raw, entry.date));
}
const target = resolve(root, 'data/news.json');
let previous;
try { previous = JSON.parse(await readFile(target, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const archive = buildArchive(editions, previous, revision);
if (archive === previous) console.log('News unchanged; no write needed.');
else {
  await writeFile(`${target}.tmp`, JSON.stringify(archive, null, 2) + '\n');
  await rename(`${target}.tmp`, target);
  console.log(`Imported ${editions.length} editions / ${editions.reduce((sum, edition) => sum + edition.items.length, 0)} news items. Quote drafts excluded.`);
}
