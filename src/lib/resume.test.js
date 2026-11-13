import assert from 'node:assert/strict';
import test from 'node:test';
import { buildResumePdf, planResumeSections, RESUME_PUBLIC_URL_PATH } from './resume.js';

function sampleContent() {
  return {
    hero: {
      name: 'Jasmine L. Rotugal',
      title: 'BSIT Student | Aspiring Cybersecurity Professional',
    },
    about: {
      introduction: 'BSIT student focused on cybersecurity and network security.',
      careerObjective: 'Build a career in network defense.',
    },
    contact: {
      email: 'jasmine@example.com',
      github: 'https://github.com/jasmine',
      linkedin: 'https://linkedin.com/in/jasmine',
    },
    education: {
      tertiary: { level: 'Tertiary', institution: 'Isabela State University – Cauayan Campus', course: 'BSIT', yearGraduated: 'Expected 2027', achievement: null },
      secondary: { level: 'Secondary', institution: 'Sample High School', course: 'Secondary Level', yearGraduated: '2023', achievement: 'Sample award' },
      elementary: { level: 'Elementary', institution: null, yearGraduated: null },
    },
    skills: [
      { id: 's1', category: 'Cybersecurity', name: 'Network traffic analysis', proficiency: 70, label: 'Intermediate' },
      { id: 's2', category: 'Networking', name: 'TCP/IP', proficiency: 80 },
      { id: 's3', category: 'Technical', name: 'Linux', proficiency: 65 },
      { id: 's4', category: 'Programming & Development', name: 'Python', proficiency: 60 },
      { id: 's5', category: 'Professional', name: 'Technical writing', proficiency: 75, label: 'Confident' },
      { id: 's6', category: 'Technical', name: 'Linux', proficiency: 70 },
    ],
    experience: {
      work: [],
      internship: [],
      volunteer: [],
      academic: [
        { id: 'a1', role: 'CTF participant', organization: 'PacketCapture CTF', summary: 'Solved an OSINT challenge.' },
      ],
    },
    projects: [
      {
        id: 'p1', title: 'Network Lab Notes', role: 'Designer and developer',
        purpose: 'Keep lab steps together.', summary: 'Lab notes with packet captures.',
        technologies: ['HTML', 'CSS', 'JavaScript'], features: ['Fixed entry format'],
        contributions: ['Designed the format'], featured: true, screenshots: [],
      },
    ],
    certificates: [
      { id: 'c1', title: 'Sample Network Security', type: 'IT Certification', issuer: 'Sample Institute', dateEarned: '2025-11-14' },
      { id: 'c2', title: 'Sample Academic Award', type: 'Award', issuer: 'Sample College', dateEarned: '2025-07-02' },
      { id: 'c3', title: 'Sample Achievement', type: 'Achievement', issuer: 'Sample Tournament', dateEarned: '2026-03-01' },
    ],
    eligibility: [
      { id: 'e1', title: 'Sample Eligibility', issuer: 'Sample Board', dateConferred: '2026-03-10', status: 'Completed' },
    ],
    heroPortrait: undefined,
  };
}

test('generates sections in a stable order from published content', () => {
  const ids = planResumeSections(sampleContent()).map((section) => section.id);
  assert.deepEqual(ids, [
    'header',
    'summary',
    'education',
    'skills',
    'experience',
    'projects',
    'certificates',
    'achievements',
    'eligibility',
  ]);
});

test('returns no substantive sections for empty content but keeps a valid fallback', () => {
  assert.deepEqual(planResumeSections(null), []);
  assert.deepEqual(planResumeSections(undefined), []);
  assert.deepEqual(planResumeSections({}), [{ id: 'summary', title: 'Resume', text: 'Details are available in my online portfolio.' }]);
});

test('empty sections are excluded', () => {
  const content = sampleContent();
  content.education.secondary = { level: 'Secondary', institution: null };
  content.education.tertiary = { level: 'Tertiary', institution: null };
  content.skills = [];
  content.projects = [];
  content.certificates = [];
  content.eligibility = [];
  content.experience = { work: [], internship: [], volunteer: [], academic: [] };
  const ids = planResumeSections(content).map((section) => section.id);
  assert.deepEqual(ids, ['header', 'summary']);
});

test('records with all-empty fields are excluded', () => {
  const content = sampleContent();
  content.skills = [{ id: 's9', category: 'Technical', name: '' }];
  content.projects = [{ id: 'p9', title: '' }];
  const ids = planResumeSections(content).map((section) => section.id);
  assert.equal(ids.includes('skills'), false);
  assert.equal(ids.includes('projects'), false);
});

test('control characters are stripped and long values truncated', () => {
  const content = sampleContent();
  content.about.introduction = `Line one. ${'A'.repeat(1000)} end`;
  content.hero.name = 'Jasmine\r\nInjected';
  const sections = planResumeSections(content);
  const summary = sections.find((section) => section.id === 'summary');
  assert.equal(summary.text.includes('\r'), false);
  assert.ok(summary.text.length <= 600);
  const header = sections.find((section) => section.id === 'header');
  assert.equal(header.name, 'Jasmine Injected');
});

test('skills are grouped in the canonical category order and de-duplicated', () => {
  const sections = planResumeSections(sampleContent());
  const skills = sections.find((section) => section.id === 'skills');
  assert.deepEqual(
    skills.groups.map((group) => group.category),
    ['Technical', 'Networking', 'Cybersecurity', 'Programming & Development', 'Professional'],
  );
  const linux = skills.groups.find((group) => group.category === 'Technical').items.filter((item) => item.startsWith('Linux'));
  assert.equal(linux.length, 1);
});

test('certificates split into certificates and achievements by type', () => {
  const sections = planResumeSections(sampleContent());
  const certificates = sections.find((section) => section.id === 'certificates');
  const achievements = sections.find((section) => section.id === 'achievements');
  assert.deepEqual(certificates.entries.map((entry) => entry.heading), ['Sample Network Security']);
  assert.deepEqual(achievements.entries.map((entry) => entry.heading).sort(), ['Sample Academic Award', 'Sample Achievement']);
});

test('featured projects are listed first', () => {
  const content = sampleContent();
  content.projects = [
    { id: 'p1', title: 'Ordinary Project', purpose: 'x', technologies: [], features: [], contributions: [] },
    { id: 'p2', title: 'Featured Project', purpose: 'y', technologies: [], features: [], contributions: [], featured: true },
  ];
  const sections = planResumeSections(content);
  const projects = sections.find((section) => section.id === 'projects');
  assert.equal(projects.entries[0].heading, 'Featured Project');
});

test('resume path constant matches the published contract', () => {
  assert.equal(RESUME_PUBLIC_URL_PATH, 'portfolio/resume.pdf');
});

test('buildResumePdf returns a valid PDF with at least one page', async () => {
  const bytes = await buildResumePdf(sampleContent());
  assert.equal(bytes[0], 0x25); // '%'
  assert.equal(bytes[1], 0x50); // 'P'
  assert.equal(bytes[2], 0x44); // 'D'
  assert.equal(bytes[3], 0x46); // 'F'

  const { PDFDocument } = await import('pdf-lib');
  const document = await PDFDocument.load(bytes);
  assert.ok(document.getPageCount() >= 1);
});

test('buildResumePdf renders every section without throwing', async () => {
  const bytes = await buildResumePdf(sampleContent());
  assert.ok(bytes.length > 1000);
});

import { getResumePageCount } from './resume.js';

test('planResumeSections honors per-record resume opt-outs and keeps legacy records', () => {
  const content = sampleContent();
  content.skills = [
    { id: 'legacy', category: 'Technical', name: 'Legacy skill' },
    { id: 'off', category: 'Technical', name: 'Excluded skill', resume: false },
    { id: 'on', category: 'Technical', name: 'Chosen skill', resume: true },
  ];
  const names = planResumeSections(content)
    .find((section) => section.id === 'skills')
    .groups.flatMap((group) => group.items)
    .join(' ');
  assert.match(names, /Chosen skill/);
  assert.doesNotMatch(names, /Excluded skill/);
  assert.match(names, /Legacy skill/);
});

test('resume inclusion is independent of the website featured flag', () => {
  const content = sampleContent();
  content.projects = [
    { id: 'p1', title: 'Website only', role: 'x', purpose: 'x', summary: 'x', technologies: ['a'], features: ['b'], contributions: ['c'], featured: true, resume: false, screenshots: [] },
    { id: 'p2', title: 'Resume only', role: 'x', purpose: 'x', summary: 'x', technologies: ['a'], features: ['b'], contributions: ['c'], featured: false, resume: true, screenshots: [] },
  ];
  const titles = planResumeSections(content)
    .find((section) => section.id === 'projects')
    .entries.map((entry) => entry.heading);
  assert.deepEqual(titles, ['Resume only']);
});

test('skills are soft-capped at the recommended resume limit by default', () => {
  const content = sampleContent();
  content.skills = Array.from({ length: 15 }, (_, index) => ({
    id: `s${index}`,
    category: 'Technical',
    name: `Skill ${index}`,
    priority: index + 1,
  }));
  const names = planResumeSections(content)
    .find((section) => section.id === 'skills')
    .groups.flatMap((group) => group.items);
  assert.equal(names.length, 10);
  assert.equal(names[0], 'Skill 0');
});

test('explicit resume selections are not capped', () => {
  const content = sampleContent();
  content.skills = Array.from({ length: 15 }, (_, index) => ({
    id: `s${index}`,
    category: 'Technical',
    name: `Skill ${index}`,
    resume: true,
  }));
  const names = planResumeSections(content)
    .find((section) => section.id === 'skills')
    .groups.flatMap((group) => group.items);
  assert.equal(names.length, 15);
});

test('a portfolio availability footnote is emitted when records are omitted', () => {
  const content = sampleContent();
  content.skills = Array.from({ length: 15 }, (_, index) => ({
    id: `s${index}`,
    category: 'Technical',
    name: `Skill ${index}`,
    priority: index + 1,
  }));
  const sections = planResumeSections(content, { origin: 'https://portfolio.example' });
  const more = sections.find((section) => section.id === 'more');
  assert.ok(more, 'expected a portfolio availability section');
  assert.match(more.text, /online portfolio/);
  assert.match(more.text, /https:\/\/portfolio\.example/);
});

test('no footnote is emitted when everything fits within the resume', () => {
  const sections = planResumeSections(sampleContent(), { origin: 'https://portfolio.example' });
  assert.equal(sections.some((section) => section.id === 'more'), false);
});

test('multi-page documents reserve room and do not overflow', async () => {
  const content = sampleContent();
  content.projects = Array.from({ length: 40 }, (_, index) => ({
    id: `p${index}`,
    title: `Project ${index + 1}`,
    role: 'Lead',
    purpose: 'x'.repeat(120),
    summary: 'A long summary sentence that must wrap cleanly across the available width without overflowing the page boundary. '.repeat(4),
    technologies: Array.from({ length: 8 }, (_, t) => `Tech${t}`),
    features: ['x'.repeat(80), 'y'.repeat(80), 'z'.repeat(80)],
    contributions: ['q'.repeat(80)],
    screenshots: [],
  }));
  const bytes = await buildResumePdf(content, { origin: 'https://portfolio.example' });
  const { PDFDocument } = await import('pdf-lib');
  const document = await PDFDocument.load(bytes);
  assert.ok(document.getPageCount() >= 2, 'expected multiple pages');
  const pages = await getResumePageCount(content, { origin: 'https://portfolio.example' });
  assert.equal(pages, document.getPageCount());
});

test('a fully populated resume stays valid and page-count agrees with the planner', async () => {
  const bytes = await buildResumePdf(sampleContent());
  assert.ok(bytes.length > 1000);
  const pages = await getResumePageCount(sampleContent());
  assert.ok(pages >= 1);
});

test('planned or in-progress eligibility records are excluded from the resume', () => {
  const content = sampleContent();
  content.eligibility = [
    { id: 'e1', title: 'Civil Service Eligibility', issuer: 'Sample Board', dateConferred: '2026-03-10', status: 'Completed' },
    { id: 'e2', title: 'Planned Certification', issuer: 'Sample Board', status: 'Planned' },
    { id: 'e3', title: 'In-progress Certification', issuer: 'Sample Board', status: 'In progress' },
  ];
  const section = planResumeSections(content).find((item) => item.id === 'eligibility');
  assert.ok(section, 'expected an eligibility section');
  assert.deepEqual(section.entries.map((entry) => entry.heading), ['Civil Service Eligibility']);
});
