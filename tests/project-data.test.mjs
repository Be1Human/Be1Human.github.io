import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateProject, projectPagePath } from '../scripts/project-data.mjs';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const projects = JSON.parse(await read('data/projects.json'));
const evidence = JSON.parse(await read('data/content-sources.json'));
const showcase = projects.find(project => project.presentation === 'showcase');
const source = evidence.projects.find(entry => entry.projectId === showcase.id);

test('project overviews cannot publish private repository links, configuration or raw source metadata', () => {
  assert.equal(validateProject(showcase, source), showcase);
  for (const patch of [
    {repository: 'https://github.com/example/private'},
    {token: 'not-a-real-credential'},
    {url: 'https://github.com/example/private'},
    {documentation: '../../internal.md'},
    {detail: {...showcase.detail, config: {password: 'sample'}}},
  ]) assert.throws(() => validateProject({...showcase, ...patch}, source));
  for (const patch of [{repository: 'private'}, {revision: 'private-commit'}, {documents: []}, {token: 'sample'}]) {
    assert.throws(() => validateProject(showcase, {...source, ...patch}));
  }
});

test('every showcased project opens a complete local overview and can return to its portfolio entry', async () => {
  const works = await read('works.html');
  const sitemap = await read('sitemap.xml');
  for (const project of projects.filter(project => project.presentation === 'showcase')) {
    const path = projectPagePath(project);
    const html = await read(path);
    assert.ok(works.includes(`id="${project.id}"`));
    assert.ok(works.includes(`href="${path}"`));
    assert.ok(sitemap.includes(`/portfolio/${path}`));
    assert.ok(html.includes(`href="../works.html#${project.id}"`));
    assert.ok(html.includes(project.detail.status));
    assert.ok(html.includes(project.detail.sections[0].paragraphs[0]));
    assert.ok(html.includes('项目示意图 · 非运行截图'));
    assert.ok(!/github\.com\/Be1Human\//.test(html), `${path}: private source link must not be exposed`);
    assert.ok(!html.includes('.qa/project-review'));
  }
});
