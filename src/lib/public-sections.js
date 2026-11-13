import { isTodo } from './format.js';
import { isSafeHttpUrl, isSafeImagePath, mailtoSafeAddress } from './urls.js';

function hasText(value) {
  return typeof value === 'string' && value.trim() !== '' && !isTodo(value);
}

function hasHeroContent(content) {
  const hero = content?.hero;
  if (!hero) return false;
  return (
    ['eyebrow', 'name', 'title', 'focus'].some((key) => hasText(hero[key])) ||
    isSafeImagePath(hero.portrait?.src) ||
    isSafeImagePath(hero.cover?.src)
  );
}

function hasAboutContent(content) {
  const about = content?.about;
  if (!about) return false;
  return (
    ['introduction', 'careerObjective', 'educationSummary'].some((key) => hasText(about[key])) ||
    (Array.isArray(about.interests) && about.interests.some(hasText)) ||
    isSafeImagePath(about.image?.src)
  );
}

function hasContactContent(content) {
  const contact = content?.contact;
  if (!contact) return false;
  return Boolean(
    mailtoSafeAddress(contact.email) ||
      isSafeHttpUrl(contact.github) ||
      isSafeHttpUrl(contact.linkedin),
  );
}

export function getSkillProficiency(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(100, Math.max(0, numeric)) : null;
}

export function isUsableProjectScreenshot(image) {
  return Boolean(
    image &&
      typeof image === 'object' &&
      isSafeImagePath(image.src) &&
      hasText(image.alt) &&
      Number.isFinite(image.width) &&
      image.width > 0 &&
      Number.isFinite(image.height) &&
      image.height > 0,
  );
}

export function countPublicProjectScreenshots(project) {
  if (!Array.isArray(project?.screenshots)) return 0;
  return project.screenshots.filter(isUsableProjectScreenshot).length;
}

function hasProjectScreenshots(project) {
  return countPublicProjectScreenshots(project) >= 2;
}

export function isPublicCertificate(certificate) {
  return hasText(certificate?.title) && hasText(certificate?.issuer);
}

const INCOMPLETE_ELIGIBILITY_STATUSES = new Set([
  'in progress',
  'in-progress',
  'planned',
  'pending',
  'not yet attained',
  'not yet completed',
]);

/**
 * Eligibility records are shown as attained only when they are not marked
 * as planned or in progress. Legacy records without a status are treated as
 * completed so existing published content is not silently hidden.
 */
export function isPublicEligibility(record) {
  if (!hasText(record?.title)) return false;
  const status = typeof record?.status === 'string' ? record.status.trim().toLowerCase() : '';
  return !INCOMPLETE_ELIGIBILITY_STATUSES.has(status);
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
  if (id === 'hero') return hasHeroContent(content);
  if (id === 'about') return hasAboutContent(content);
  if (id === 'contact') return hasContactContent(content);
  if (id === 'skills') {
    return Array.isArray(content.skills) && content.skills.some((item) => hasText(item?.name));
  }
  if (id === 'certificates') {
    return Array.isArray(content.certificates) && content.certificates.some(isPublicCertificate);
  }
  if (id === 'eligibility') {
    return Array.isArray(content.eligibility) && content.eligibility.some(isPublicEligibility);
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
