import { isTodo } from './format.js';
import { isSafeImagePath } from './urls.js';

function hasText(value) {
  return typeof value === 'string' && value.trim() !== '' && !isTodo(value);
}

export function getSkillProficiency(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(100, Math.max(0, numeric)) : null;
}

function hasProjectScreenshots(project) {
  if (!Array.isArray(project?.screenshots)) return false;
  const screenshots = project.screenshots.filter(
    (image) =>
      image &&
      isSafeImagePath(image.src) &&
      hasText(image.alt) &&
      Number.isFinite(image.width) &&
      image.width > 0 &&
      Number.isFinite(image.height) &&
      image.height > 0,
  );
  return screenshots.length >= 2;
}

export function isPublicCertificate(certificate) {
  return hasText(certificate?.title) && hasText(certificate?.issuer);
}

export function isPublicExperience(item) {
  return hasText(item?.role) && hasText(item?.organization);
}

export function isPublicProject(project) {
  const hasList = (value) => Array.isArray(value) && value.some(hasText);
  return (
    hasText(project?.title) &&
    hasText(project?.role) &&
    hasText(project?.purpose) &&
    hasList(project?.technologies) &&
    hasList(project?.features) &&
    hasList(project?.contributions) &&
    hasProjectScreenshots(project)
  );
}

export function hasPublicSectionContent(id, content) {
  if (!content) return false;
  if (id === 'hero' || id === 'about' || id === 'contact') return true;
  if (id === 'skills') {
    return Array.isArray(content.skills) && content.skills.some((item) => hasText(item?.name));
  }
  if (id === 'certificates') {
    return Array.isArray(content.certificates) && content.certificates.some(isPublicCertificate);
  }
  if (id === 'eligibility') {
    return Array.isArray(content.eligibility) && content.eligibility.some((item) => hasText(item?.title));
  }
  if (id === 'experience') {
    return ['work', 'internship', 'volunteer', 'academic'].some(
      (group) =>
        Array.isArray(content.experience?.[group]) &&
        content.experience[group].some(isPublicExperience),
    );
  }
  if (id === 'projects') {
    return (
      Array.isArray(content.projects) &&
      content.projects.some(isPublicProject)
    );
  }
  if (id === 'education') {
    return ['tertiary', 'secondary', 'elementary'].some((level) =>
      hasText(content.education?.[level]?.institution),
    );
  }
  if (id === 'security') {
    return Boolean(
      content.securityFocus?.profiles?.length || content.securityFocus?.writeups?.length,
    );
  }
  return false;
}

export function isPublicNavigationItem(item, content) {
  if (item?.to === '/certificates') return hasPublicSectionContent('certificates', content);
  const sectionId = typeof item?.to === 'string' ? item.to.split('#')[1] : '';
  return sectionId ? hasPublicSectionContent(sectionId, content) : true;
}
