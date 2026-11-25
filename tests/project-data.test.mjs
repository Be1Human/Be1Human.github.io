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
    {group: 'unknown'},
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
    assert.ok(sitemap.includes(`https://be1human.github.io/${path}`));
    assert.ok(html.includes(`href="../works.html#${project.id}"`));
    assert.ok(html.includes(project.detail.status));
    assert.ok(html.includes(project.detail.sections[0].paragraphs[0]));
    assert.ok(html.includes(project.imageNote));
    for (const section of project.detail.sections) {
      for (const image of section.images ?? []) {
        assert.ok(html.includes(`href="../${image.src}"`));
        assert.ok(html.includes(`src="../${image.src}"`));
      }
      if (section.video) {
        assert.ok(html.includes(`src="../${section.video.src}"`));
        assert.ok(html.includes(`poster="../${section.video.poster}"`));
        assert.ok(html.includes('preload="none"'));
      }
    }
    assert.ok(!/github\.com\/Be1Human\//.test(html), `${path}: private source link must not be exposed`);
    assert.ok(!html.includes('.qa/project-review'));
  }
});

test('personal site project lists agree on group membership', async () => {
  const experience = JSON.parse(await read('content-local.json'));
  const works = await read('works.html');
  assert.equal(experience.projects.length, projects.length);
  for (const group of ['agent', 'other']) {
    const section = works.split(`aria-labelledby="group-${group}"`)[1].split('</section>')[0];
    const expected = projects.filter(project => (project.group ?? 'other') === group).map(project => project.id).sort();
    assert.ok(expected.length > 0);
    assert.deepEqual([...section.matchAll(/<article class="project-card" id="([^"]+)"/g)].map(match => match[1]).sort(), expected);
    assert.deepEqual(experience.projects.filter(project => project.group === group).map(project => project.id).sort(), expected);
  }
});
