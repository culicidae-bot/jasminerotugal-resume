import { formatDate } from './format.js';
import {
  RESUME_SOFT_LIMITS,
  isResumeSelected,
  selectResume,
  sortByPriority,
} from './prioritize.js';
import { isPublicEligibility } from './public-sections.js';

export const RESUME_PUBLIC_URL_PATH = 'portfolio/resume.pdf';

const ACHIEVEMENT_TYPES = ['Achievement', 'Award'];
const SKILL_CATEGORY_ORDER = [
  'technical',
  'networking',
  'cybersecurity',
  'programming & development',
  'programming and development',
  'professional',
];

const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/g;
const MAX_LENGTHS = { summary: 600, line: 220, bullet: 200 };

function clean(value, max = MAX_LENGTHS.line) {
  if (typeof value !== 'string') return '';
  const text = value.replace(CONTROL_CHARACTERS, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function cleanLines(value, max = MAX_LENGTHS.bullet) {
  if (!Array.isArray(value)) return [];
  return value.map((line) => clean(line, max)).filter(Boolean);
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPublicRecord(record) {
  return record && typeof record === 'object' && Object.values(record).some((value) =>
    typeof value === 'string' ? value.trim().length > 0 : Array.isArray(value) ? value.length > 0 : Boolean(value),
  );
}

function skillCategoryRank(category) {
  const normalized = String(category || '').trim().toLowerCase();
  const index = SKILL_CATEGORY_ORDER.indexOf(normalized);
  return index === -1 ? SKILL_CATEGORY_ORDER.length : index;
}

function skillItem(skill) {
  const name = clean(skill?.name, 120);
  if (!name) return null;
  const label = hasText(skill?.label) ? clean(skill.label, 60) : null;
  const proficiency = Number.isFinite(Number(skill?.proficiency)) && String(skill?.proficiency).trim() !== ''
    ? `${Math.min(100, Math.max(0, Number(skill.proficiency)))}/100`
    : null;
  return proficiency || label ? `${name} — ${[label, proficiency && `${proficiency}`].filter(Boolean).join(', ')}` : name;
}

function skillGroups(skills) {
  const groups = new Map();
  for (const skill of Array.isArray(skills) ? skills : []) {
    const name = clean(skill?.name, 120);
    if (!name) continue;
    const category = hasText(skill?.category) ? clean(skill.category, 60) : 'Skills';
    groups.set(category, [...(groups.get(category) || []), name]);
  }

  return [...groups]
    .map(([category, names]) => {
      const unique = [...new Set(names)];
      return { category, items: unique };
    })
    .sort((a, b) => skillCategoryRank(a.category) - skillCategoryRank(b.category) || a.category.localeCompare(b.category));
}

function experienceEntries(experience) {
  const order = [
    ['work', 'Work'],
    ['internship', 'Internship / OJT'],
    ['volunteer', 'Volunteer'],
    ['academic', 'Academic & cybersecurity activities'],
  ];
  const entries = [];
  for (const [key, groupLabel] of order) {
    const list = (Array.isArray(experience?.[key]) ? experience[key] : [])
      .filter(isResumeSelected)
      .sort((a, b) => (Number.isFinite(Number(a?.priority)) ? Number(a.priority) : 1000) - (Number.isFinite(Number(b?.priority)) ? Number(b.priority) : 1000));
    for (const item of list) {
      if (!isPublicRecord(item)) continue;
      const role = clean(item.role, 120);
      const organization = clean(item.organization, 140);
      const heading = [role, organization].filter(Boolean).join(' · ');
      if (!heading) continue;
      entries.push({
        group: groupLabel,
        heading,
        period: clean(item.period, 80),
        summary: clean(item.summary, 240),
        bullets: cleanLines(item.accomplishments?.length ? item.accomplishments : item.responsibilities),
      });
    }
  }
  return entries;
}

function projectEntries(projects) {
  const entries = [];
  for (const project of selectResume(projects, RESUME_SOFT_LIMITS.projects)) {
    if (!isPublicRecord(project)) continue;
    const title = clean(project.title, 140);
    if (!title) continue;
    const technologies = cleanLines(project.technologies, 80);
    entries.push({
      heading: title,
      role: clean(project.role, 100),
      summary: clean(project.summary ?? project.purpose ?? '', 260),
      technologies,
      bullets: cleanLines(project.features).slice(0, 4),
      featured: Boolean(project.featured),
    });
  }
  return entries.sort((a, b) => Number(b.featured) - Number(a.featured));
}

function recordEntries(records, { title, issuerKey = 'issuer', dateKey = 'dateEarned' } = {}) {
  const entries = [];
  for (const record of Array.isArray(records) ? records : []) {
    if (!isPublicRecord(record)) continue;
    const name = clean(record[title], 160);
    if (!name) continue;
    const date = clean(formatDate(record[dateKey]), 40);
    entries.push({
      heading: name,
      issuer: clean(record[issuerKey], 140),
      date,
    });
  }
  return entries;
}

/**
 * Compute the ordered list of resume sections for the given PUBLISHED
 * portfolio content. Empty sections and records without renderable text
 * are excluded. Returns plain data for testability.
 */
function defaultOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return '';
}

export function planResumeSections(content, { origin = defaultOrigin() } = {}) {
  if (!content || typeof content !== 'object') return [];

  const sections = [];
  const name = clean(content.hero?.name, 120);
  const headline = clean(content.hero?.title, 160);
  const email = hasText(content.contact?.email) ? clean(content.contact.email, 120) : '';
  const github = hasText(content.contact?.github) ? clean(content.contact.github, 120) : '';
  const linkedin = hasText(content.contact?.linkedin) ? clean(content.contact.linkedin, 120) : '';
  if (name) sections.push({ id: 'header', name, headline, contact: [email, github, linkedin].filter(Boolean) });

  const summary = clean(
    [content.about?.introduction, content.about?.careerObjective].filter(hasText).join(' '),
    MAX_LENGTHS.summary,
  );
  if (summary) sections.push({ id: 'summary', title: 'Profile', text: summary });

  const education = [];
  for (const level of ['tertiary', 'secondary', 'elementary']) {
    const entry = content.education?.[level];
    if (!isPublicRecord(entry)) continue;
    const institution = clean(entry.institution, 180);
    if (!institution) continue;
    education.push({
      group: clean(entry.level, 30) || level,
      heading: institution,
      line: [clean(entry.course, 160), clean(entry.yearGraduated, 60)].filter(Boolean).join(' · '),
      achievement: clean(entry.achievement, 160),
    });
  }
  if (education.length) sections.push({ id: 'education', title: 'Education', entries: education });

  const skillTotal = Array.isArray(content.skills) ? content.skills.length : 0;
  const selectedSkills = selectResume(content.skills, RESUME_SOFT_LIMITS.skills);
  const groups = skillGroups(selectedSkills);
  if (groups.length) sections.push({ id: 'skills', title: 'Technical and professional skills', groups });

  const experience = experienceEntries(content.experience);
  if (experience.length) sections.push({ id: 'experience', title: 'Experience', entries: experience });

  const projects = projectEntries(content.projects);
  if (projects.length) sections.push({ id: 'projects', title: 'Projects', entries: projects });

  const records = Array.isArray(content.certificates) ? content.certificates : [];
  const eligible = records.filter(isResumeSelected);
  const includedCerts = selectResume(
    eligible.filter((record) => !ACHIEVEMENT_TYPES.includes(record?.type)),
    RESUME_SOFT_LIMITS.certificates,
  );
  const includedAchievements = selectResume(
    eligible.filter((record) => ACHIEVEMENT_TYPES.includes(record?.type)),
    RESUME_SOFT_LIMITS.achievements,
  );
  const achievements = recordEntries(includedAchievements, { title: 'title' });
  const certificates = recordEntries(includedCerts, { title: 'title' });
  if (certificates.length) sections.push({ id: 'certificates', title: 'Certificates', entries: certificates });
  if (achievements.length) sections.push({ id: 'achievements', title: 'Achievements', entries: achievements });

  const eligibility = recordEntries(
    (Array.isArray(content.eligibility) ? content.eligibility : [])
      .filter(isPublicEligibility)
      .filter(isResumeSelected),
    { title: 'title', dateKey: 'dateConferred' },
  );
  if (eligibility.length) sections.push({ id: 'eligibility', title: 'Eligibility and certifications', entries: eligibility });

  const projectTotal = Array.isArray(content.projects) ? content.projects.filter(isResumeSelected).length : 0;
  const projectsIncluded = sections.find((section) => section.id === 'projects')?.entries.length ?? 0;
  const certTotal = eligible.length;
  const certsIncluded = certificates.length + achievements.length;
  const omitted = (skillTotal - selectedSkills.length > 0 ? 1 : 0)
    + (projectTotal - projectsIncluded > 0 ? 1 : 0)
    + (certTotal - certsIncluded > 0 ? 1 : 0);

  const siteOrigin = origin;

  if (omitted > 0) {
    const line = 'Additional certifications and projects are available in my online portfolio.'
      + (siteOrigin ? ` ${siteOrigin}` : '');
    sections.push({ id: 'more', title: 'More', text: line });
  }

  if (sections.length === 0) {
    sections.push({
      id: 'summary',
      title: 'Resume',
      text: siteOrigin
        ? `Details are available in my online portfolio at ${siteOrigin}.`
        : 'Details are available in my online portfolio.',
    });
  }

  return sections;
}

const COLORS = {
  ink: [0.09, 0.14, 0.22],
  accent: [0.14, 0.34, 0.65],
  muted: [0.27, 0.34, 0.42],
  rule: [0.14, 0.34, 0.65],
};

function rgb(color) {
  const { rgb: makeRgb } = rgbCache;
  return makeRgb(color[0], color[1], color[2]);
}

// Resolved lazily inside buildResumePdf to keep planResumeSections importable in tests.
let rgbCache = { rgb: null };

async function loadPdfLib() {
  const { PDFDocument, StandardFonts, rgb: makeRgb } = await import('pdf-lib');
  rgbCache = { rgb: makeRgb };
  return { PDFDocument, StandardFonts };
}

function wrapText(text, font, size, maxWidth) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

export async function buildResumePdf(content, options = {}) {
  const { PDFDocument, StandardFonts } = await loadPdfLib();
  const sections = planResumeSections(content, options);

  const pdf = await PDFDocument.create();
  pdf.setTitle(`${clean(content?.hero?.name, 120) || 'Resume'} — Resume`);
  pdf.setAuthor(clean(content?.hero?.name, 120) || 'Portfolio owner');
  pdf.setSubject('Resume');
  pdf.setProducer('portfolio');

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612; // US Letter
  const pageHeight = 792;
  const margin = 54;
  const contentWidth = pageWidth - margin * 2;
  const bottom = 54;

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const ensureRoom = (needed) => {
    if (y - needed < bottom) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  const drawText = (text, { font, size, color, x = margin, lineHeight = size + 3.5 }) => {
    ensureRoom(lineHeight);
    page.drawText(text, { x, y: y - size, size, font, color: rgb(color) });
    y -= lineHeight;
  };

  const drawRule = (color = COLORS.rule, thickness = 1.1) => {
    ensureRoom(6);
    page.drawLine({
      start: { x: margin, y: y - 3 },
      end: { x: margin + contentWidth, y: y - 3 },
      thickness,
      color: rgb(color),
    });
    y -= 8;
  };

  const sectionHeading = (title) => {
    ensureRoom(48);
    y -= 6;
    drawText(title.toUpperCase(), { font: bold, size: 9.5, color: COLORS.accent, lineHeight: 12 });
    drawRule();
  };

  for (const section of sections) {
    if (section.id === 'header') {
      drawText(section.name, { font: bold, size: 21, color: COLORS.ink, lineHeight: 26 });
      if (section.headline) drawText(section.headline, { font: regular, size: 10, color: COLORS.accent, lineHeight: 15 });
      if (section.contact.length) drawText(section.contact.join('  ·  '), { font: regular, size: 7.5, color: COLORS.muted, lineHeight: 14 });
      drawRule(COLORS.accent, 1.4);
      continue;
    }

    sectionHeading(section.title);

    if (section.id === 'summary' || section.id === 'more') {
      const size = section.id === 'more' ? 8.5 : 9.5;
      const color = section.id === 'more' ? COLORS.muted : COLORS.ink;
      for (const line of wrapText(section.text, regular, size, contentWidth)) {
        drawText(line, { font: regular, size, color, lineHeight: 13 });
      }
      continue;
    }

    if (section.id === 'education') {
      for (const entry of section.entries) {
        drawText(`${entry.group}: ${entry.heading}`, { font: bold, size: 9, color: COLORS.ink, lineHeight: 12.5 });
        if (entry.line) drawText(entry.line, { font: regular, size: 8.5, color: COLORS.muted, lineHeight: 12 });
        if (entry.achievement) drawText(entry.achievement, { font: regular, size: 8.5, color: COLORS.ink, lineHeight: 12 });
        y -= 2;
      }
      continue;
    }

    if (section.id === 'skills') {
      for (const group of section.groups) {
        drawText(group.category, { font: bold, size: 8.5, color: COLORS.ink, lineHeight: 12 });
        for (const line of wrapText(group.items.join('  ·  '), regular, 8.5, contentWidth)) {
          drawText(line, { font: regular, size: 8.5, color: COLORS.muted, lineHeight: 11.5 });
        }
        y -= 2;
      }
      continue;
    }

    if (section.id === 'experience' || section.id === 'projects') {
      for (const entry of section.entries) {
        const heading = entry.period ? `${entry.heading}  ·  ${entry.period}` : entry.heading;
        drawText(heading, { font: bold, size: 9, color: COLORS.ink, lineHeight: 12.5 });
        if (entry.role && section.id === 'projects') {
          drawText(entry.role, { font: regular, size: 8, color: COLORS.accent, lineHeight: 11 });
        }
        if (entry.summary) {
          for (const line of wrapText(entry.summary, regular, 8.5, contentWidth)) {
            drawText(line, { font: regular, size: 8.5, color: COLORS.ink, lineHeight: 12 });
          }
        }
        if (entry.technologies?.length) {
          drawText(`Technologies: ${entry.technologies.join(', ')}`, { font: regular, size: 8, color: COLORS.muted, lineHeight: 11.5 });
        }
        for (const bullet of entry.bullets) {
          for (const [index, line] of wrapText(bullet, regular, 8.5, contentWidth - 12).entries()) {
            const prefix = index === 0 ? '•  ' : '   ';
            drawText(`${prefix}${line}`, { font: regular, size: 8.5, color: COLORS.ink, lineHeight: 12 });
          }
        }
        y -= 2;
      }
      continue;
    }

    // certificates / achievements / eligibility
    for (const entry of section.entries) {
      const line = [entry.heading, entry.issuer, entry.date].filter(Boolean).join('  ·  ');
      for (const [index, wrapped] of wrapText(line, regular, 8.5, contentWidth).entries()) {
        drawText(wrapped, { font: index === 0 ? bold : regular, size: 8.5, color: COLORS.ink, lineHeight: 12 });
      }
      y -= 1;
    }
  }

  const pageCount = pdf.getPageCount();
  if (pageCount > 1) {
    const pages = pdf.getPages();
    for (const [index, footerPage] of pages.entries()) {
      footerPage.drawText(`Page ${index + 1} of ${pageCount}`, {
        x: margin,
        y: 24,
        size: 7.5,
        font: regular,
        color: rgb(COLORS.muted),
      });
    }
  }

  return pdf.save();
}

/** Page count of the PDF that would be produced for the given content. */
export async function getResumePageCount(content, options = {}) {
  const bytes = await buildResumePdf(content, options);
  const { PDFDocument } = await import('pdf-lib');
  const document = await PDFDocument.load(bytes);
  return document.getPageCount();
}
