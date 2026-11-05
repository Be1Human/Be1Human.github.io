import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: node scripts/publish-site.mjs [--message "Publish message"]\nBuild, check, commit and push approved public site changes to Be1Human/Be1Human.github.io main. Never force-push; deployment verification is separate.');
  process.exit(0);
}
let message = 'Publish interactive portfolio and complete news archive';
if (args.length) {
  if (args.length !== 2 || args[0] !== '--message' || !args[1].trim()) {
    console.error(JSON.stringify({status: 'failed', message: 'Use --help or --message "Publish message".'}));
    process.exit(1);
  }
  message = args[1].trim();
}

function run(command, commandArgs, {capture = false, input, label = command} = {}) {
  try {
    return execFileSync(command, commandArgs, {cwd: root, encoding: 'utf8', input,
      stdio: capture ? ['pipe', 'pipe', 'pipe'] : [input === undefined ? 'inherit' : 'pipe', 'inherit', 'inherit'],
      maxBuffer: 16 * 1024 * 1024});
  } catch (error) {
    // Child output is never copied into errors, especially remote/credential output.
    throw new Error(`${label} failed${Number.isInteger(error.status) ? ` (exit ${error.status})` : ''}.`);
  }
}
const git = (...gitArgs) => run('git', gitArgs, {capture: true, label: `git ${gitArgs[0]}`}).trim();
const splitNul = value => value.split('\0').filter(Boolean);
const badPart = /(?:^|[._-])(?:private|secrets?|credentials?|api[-_]?keys?|keys?|tokens?)(?:[._-]|$)/i;
const textFile = /\.(?:html|css|js|mjs|cjs|json|xml|md|txt|svg|ya?ml|toml|ini|conf)$/i;
const strongSecret = /-----BEGIN (?:[A-Z ]* )?PRIVATE KEY-----|\bsk-(?:cp-|proj-)?[A-Za-z0-9_-]{24,}\b|\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}\b|\bAKIA[A-Z0-9]{16}\b|\bxox[baprs]-[A-Za-z0-9-]{20,}\b/;

function allowedPath(path) {
  if (!path || /[\x00-\x1f\\]/.test(path) || path.startsWith('/') || /^[A-Za-z]:/.test(path)) return false;
  const parts = path.split('/');
  if (parts.some(p => !p || p === '.' || p === '..' || /^\.env(?:\.|$)/i.test(p)
    || /^(?:production|site|logs?)$/i.test(p) || /\.(?:log|pem|key|p12|pfx)$/i.test(p) || badPart.test(p))) return false;
  if (parts.length === 1) return ['.nojekyll', '.gitattributes', '.gitignore', 'AGENTS.md'].includes(path) || /\.(?:html|css|js|json|xml|md)$/i.test(path);
  return /^(?:assets|src|scripts|tests|docs)\//.test(path) || /^data\/.+\.json$/i.test(path)
    || /^(?:portfolio\/)?(?:posts|projects|news)\/[a-z0-9-]+\.html$/.test(path)
    || /^portfolio\/(?:index|works|journal|news)\.html$/.test(path)
    || /^portfolio\/(?:feed|sitemap)\.xml$/.test(path);
}

function changedPaths() {
  const records = splitNul(run('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], {capture: true, label: 'git status'}));
  const paths = new Set();
  for (let i = 0; i < records.length; i++) {
    const status = records[i].slice(0, 2);
    if (status.includes('U') || ['AA', 'DD'].includes(status)) throw new Error('Resolve existing merge conflicts before publishing.');
    if (status.includes('D')) throw new Error('Release contains deletions; preserve them for separate review.');
    paths.add(records[i].slice(3));
    if (/[RC]/.test(status)) paths.add(records[++i]);
  }
  if (git('diff', 'HEAD', '--name-only', '--diff-filter=D')) throw new Error('Release contains deletions; preserve them for separate review.');
  const changed = [...paths].sort();
  if (changed.some(path => !allowedPath(path))) throw new Error('Release contains a path outside the approved public site directories.');
  return changed;
}

async function checkChangedFiles(paths) {
  // Inspect only changed public text files, never credentials, unrelated trees,
  // full Git history, images, videos or a machine-wide content scan.
  for (const path of paths) {
    let info;
    try { info = await lstat(resolve(root, path)); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    if (info.isSymbolicLink() || !info.isFile()) throw new Error('Only regular public files can be published.');
    if (textFile.test(path) && strongSecret.test(await readFile(resolve(root, path), 'utf8'))) {
      throw new Error('A changed public text file contains a strong credential/private-key pattern. Remove it before publishing.');
    }
  }
}

async function versionRuntime() {
  const versions = new Map();
  for (const path of ['app.js', 'style.css']) {
    versions.set(path, 'release-' + createHash('sha256').update(await readFile(resolve(root, path))).digest('hex').slice(0, 12));
  }
  const pages = [];
  for (const path of ['index.html', 'src/experience/index.html']) {
    const before = await readFile(resolve(root, path), 'utf8');
    const found = new Set();
    const after = before.replace(/((?:src|href)=["'])(?:\.\/)?(app\.js|style\.css)(?:\?[^"']*)?(["'])/g, (_, attr, asset, quote) => {
      found.add(asset);
      return `${attr}${asset}?v=${versions.get(asset)}${quote}`;
    });
    if (found.size !== versions.size) throw new Error('The approved homepage must reference both app.js and style.css.');
    pages.push({path, before, after});
  }
  for (const page of pages) if (page.after !== page.before) await writeFile(resolve(root, page.path), page.after);
}

let commit;
try {
  if (git('branch', '--show-current') !== 'main') throw new Error('Publish from the main branch only.');
  const remote = git('remote', 'get-url', 'origin');
  if (!['https://github.com/Be1Human/Be1Human.github.io.git', 'git@github.com:Be1Human/Be1Human.github.io.git'].includes(remote)) throw new Error('Unexpected publication repository.');
  run('git', ['fetch', 'origin', 'main'], {label: 'git fetch'});
  const [ahead, behind] = git('rev-list', '--left-right', '--count', 'HEAD...origin/main').split(/\s+/).map(Number);
  if (ahead || behind) throw new Error('Local and remote main must match before release. Preserve unpublished commits or remote changes; no reset, merge or force-push was attempted.');
  let changed = changedPaths();
  commit = git('rev-parse', 'HEAD');
  if (!changed.length) {
    console.log(JSON.stringify({status: 'unchanged', commit}));
    process.exit(0);
  }
  await checkChangedFiles(changed);
  let npmCLI = process.env.npm_execpath;
  if (!npmCLI) {
    const nodeDir = dirname(process.execPath);
    const candidates = [resolve(nodeDir, 'node_modules/npm/bin/npm-cli.js'), resolve(nodeDir, '../lib/node_modules/npm/bin/npm-cli.js')];
    for (const path of candidates) {
      try { await lstat(path); npmCLI = path; break; }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }
  if (!npmCLI) throw new Error('Run through npm so npm_execpath identifies npm-cli.js.');
  await versionRuntime();
  run(process.execPath, [npmCLI, 'run', 'build'], {label: 'npm run build'});
  run(process.execPath, [npmCLI, 'run', 'check'], {label: 'npm run check'});
  run('git', ['diff', '--check'], {label: 'git diff --check'});
  run('git', ['diff', '--cached', '--check'], {label: 'git diff --cached --check'});
  changed = changedPaths();
  await checkChangedFiles(changed);
  if (!changed.length) {
    console.log(JSON.stringify({status: 'unchanged', commit}));
    process.exit(0);
  }
  run('git', ['--literal-pathspecs', 'add', '--pathspec-from-file=-', '--pathspec-file-nul'], {input: changed.join('\0')+'\0', label: 'git add approved paths'});
  if (!git('diff', '--cached', '--name-only')) {
    console.log(JSON.stringify({status: 'unchanged', commit}));
    process.exit(0);
  }
  run('git', ['commit', '-m', message], {label: 'git commit'});
  commit = git('rev-parse', 'HEAD');
  run('git', ['push', 'origin', 'main'], {label: 'git push'});
  const published = git('ls-remote', 'origin', 'refs/heads/main').split(/\s+/)[0];
  if (published !== commit) throw new Error('Remote main does not match the release commit; deployment remains unverified.');
  console.log(JSON.stringify({status: 'pushed', commit, deployment: 'unverified'}));
} catch (error) {
  console.error(JSON.stringify({status: 'failed', ...(commit ? {commit} : {}), message: error.message}));
  process.exitCode = 1;
}
