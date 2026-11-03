import { httpsUrl } from './news-data.mjs';

export const projectCategories = {all: '全部作品', games: '游戏项目', visuals: '视觉与设计', tools: 'AI 与工具', experiments: '研究与实验'};
export const projectPagePath = project => `projects/${project.id}.html`;

export function validateProject(project, source) {
  if (!/^[a-z0-9-]+$/.test(project.id) || !projectCategories[project.category] || project.category === 'all') throw new Error('Invalid project');
  for (const key of ['title', 'description', 'imageAlt', 'imageNote', 'kind', 'action', 'label']) {
    if (typeof project[key] !== 'string' || !project[key].trim()) throw new Error(`Missing project ${key}`);
  }
  if (!/^assets\/images\/[\w.-]+$/.test(project.image)) throw new Error('Invalid local image');
  if (!Array.isArray(project.tags) || !project.tags.length || project.tags.some(tag => typeof tag !== 'string' || !tag.trim())) throw new Error('Invalid project tags');
  if (!source || source.projectId !== project.id) throw new Error('Missing project evidence');

  if (project.presentation === 'showcase') {
    // Only an authored overview is published for a project whose source stays private.
    const allowed = new Set(['id', 'title', 'name', 'kind', 'category', 'label', 'description', 'image', 'imageAlt', 'imageNote', 'tags', 'url', 'action', 'documentation', 'presentation', 'detail']);
    if (Object.keys(project).some(key => !allowed.has(key))) throw new Error('Unexpected field in project showcase');
    if (project.url !== projectPagePath(project) || project.documentation !== projectPagePath(project)) throw new Error('Showcase must link to its local overview');
    const evidenceKeys = new Set(['projectId', 'reviewMode', 'descriptionBasis', 'productRuntimeTestedInThisReview']);
    if (source.reviewMode !== 'owner-authorized-showcase' || Object.keys(source).some(key => !evidenceKeys.has(key))) throw new Error('Private source evidence must remain outside the public data');
    const detail = project.detail;
    if (!detail || !detail.status || !/^\d{4}(?:–\d{4})?$/.test(detail.period) || !Array.isArray(detail.sections) || !detail.sections.length) throw new Error('Incomplete project overview');
    if (Object.keys(detail).some(key => !['status', 'period', 'sections'].includes(key))) throw new Error('Unexpected field in project overview');
    for (const section of detail.sections) {
      if (Object.keys(section).some(key => !['heading', 'paragraphs'].includes(key)) || !section.heading || !Array.isArray(section.paragraphs) || !section.paragraphs.length || section.paragraphs.some(p => typeof p !== 'string' || !p.trim())) throw new Error('Invalid project overview section');
    }
  } else {
    if (project.presentation !== undefined) throw new Error('Invalid project presentation');
    for (const field of ['url', 'documentation', 'repository']) httpsUrl(project[field]);
    if (!project.documentation.startsWith(`${project.repository}/blob/${source.revision}/`) || !source.documents?.some(doc => doc.url === project.documentation)) throw new Error('Project documentation does not match its recorded source');
  }
  return project;
}
