import { httpsUrl } from './news-data.mjs';

export const projectCategories = {all: '全部作品', games: '游戏项目', visuals: '视觉与设计', tools: 'AI 与工具', experiments: '研究与实验'};
export const projectGroups = {agent: 'Agent 项目', other: '其他作品'};
export const projectPagePath = project => `projects/${project.id}.html`;
const imagePath = /^assets\/images\/(?:[\w-]+\/)*[\w.-]+\.(?:webp|png|jpe?g|svg)$/;

export function validateProject(project, source) {
  if (!/^[a-z0-9-]+$/.test(project.id) || !projectCategories[project.category] || project.category === 'all') throw new Error('Invalid project');
  if (project.group !== undefined && !Object.hasOwn(projectGroups, project.group)) throw new Error('Invalid project group');
  if (project.categories !== undefined && (!Array.isArray(project.categories) ||
      !project.categories.includes(project.category) ||
      project.categories.some(category => category === 'all' || !Object.hasOwn(projectCategories, category)))) {
    throw new Error('Invalid project categories');
  }
  for (const key of ['title', 'description', 'imageAlt', 'imageNote', 'kind', 'action', 'label']) {
    if (typeof project[key] !== 'string' || !project[key].trim()) throw new Error(`Missing project ${key}`);
  }
  if (!imagePath.test(project.image)) throw new Error('Invalid local image');
  if (!Array.isArray(project.tags) || !project.tags.length || project.tags.some(tag => typeof tag !== 'string' || !tag.trim())) throw new Error('Invalid project tags');
  if (!source || source.projectId !== project.id) throw new Error('Missing project evidence');

  if (project.presentation === 'showcase') {
    // Only an authored overview is published for a project whose source stays private.
    const allowed = new Set(['id', 'title', 'name', 'kind', 'category', 'categories', 'group', 'label', 'description', 'image', 'imageAlt', 'imageNote', 'tags', 'url', 'action', 'documentation', 'presentation', 'detail']);
    if (Object.keys(project).some(key => !allowed.has(key))) throw new Error('Unexpected field in project showcase');
    if (project.url !== projectPagePath(project) || project.documentation !== projectPagePath(project)) throw new Error('Showcase must link to its local overview');
    const evidenceKeys = new Set(['projectId', 'reviewMode', 'descriptionBasis', 'productRuntimeTestedInThisReview']);
    if (source.reviewMode !== 'owner-authorized-showcase' || Object.keys(source).some(key => !evidenceKeys.has(key))) throw new Error('Private source evidence must remain outside the public data');
    const detail = project.detail;
    if (!detail || !detail.status || !/^\d{4}(?:–\d{4})?$/.test(detail.period) || !Array.isArray(detail.sections) || !detail.sections.length) throw new Error('Incomplete project overview');
    if (Object.keys(detail).some(key => !['status', 'period', 'sections', 'coverSize', 'layout', 'website'].includes(key))) throw new Error('Unexpected field in project overview');
    if (detail.layout !== undefined && detail.layout !== 'slides') throw new Error('Invalid project overview layout');
    if (detail.website !== undefined) httpsUrl(detail.website);
    const validSize = (width, height) => [width, height].every(value => Number.isInteger(value) && value > 0);
    if (detail.coverSize !== undefined &&
        (!Array.isArray(detail.coverSize) || detail.coverSize.length !== 2 || !validSize(...detail.coverSize))) {
      throw new Error('Invalid project cover dimensions');
    }
    for (const section of detail.sections) {
      if (Object.keys(section).some(key => !['heading', 'paragraphs', 'images', 'video', 'workflow'].includes(key)) || !section.heading || !Array.isArray(section.paragraphs) || !section.paragraphs.length || section.paragraphs.some(p => typeof p !== 'string' || !p.trim())) throw new Error('Invalid project overview section');
      const { workflow } = section;
      const stepFields = ['title', 'tool', 'output'];
      if (workflow !== undefined && (
        !Array.isArray(workflow) || workflow.length < 2 || workflow.some(step =>
          !step || Object.keys(step).some(key => !stepFields.includes(key)) ||
          stepFields.some(key => typeof step[key] !== 'string' || !step[key].trim())
        )
      )) throw new Error('Invalid project workflow');
      const video = section.video;
      if (video !== undefined && (
        !video || Object.keys(video).some(key => !['src', 'poster', 'caption', 'width', 'height'].includes(key)) ||
        !/^assets\/project-media\/[\w-]+\.mp4$/.test(video.src) ||
        !/^assets\/images\/[\w-]+\.(?:webp|png|jpe?g)$/.test(video.poster) ||
        !validSize(video.width, video.height) ||
        typeof video.caption !== 'string' || !video.caption.trim()
      )) throw new Error('Invalid project video');
      if (section.images === undefined) continue;
      if (!Array.isArray(section.images) || section.images.some(image =>
        !image || Object.keys(image).some(key => !['src', 'alt', 'caption', 'width', 'height'].includes(key)) ||
        !imagePath.test(image.src) ||
        !validSize(image.width, image.height) ||
        [image.alt, image.caption].some(value => typeof value !== 'string' || !value.trim())
      )) throw new Error('Invalid project screenshot');
    }
  } else {
    if (project.presentation !== undefined) throw new Error('Invalid project presentation');
    for (const field of ['url', 'documentation', 'repository']) httpsUrl(project[field]);
    if (!project.documentation.startsWith(`${project.repository}/blob/${source.revision}/`) || !source.documents?.some(doc => doc.url === project.documentation)) throw new Error('Project documentation does not match its recorded source');
  }
  return project;
}
