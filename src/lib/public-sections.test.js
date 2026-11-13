import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countPublicProjectScreenshots,
  getSkillProficiency,
  hasPublicSectionContent,
  isPublicEligibility,
  isPublicNavigationItem,
} from './public-sections.js';

const emptyContent = {
  skills: [],
  certificates: [],
  eligibility: [],
  experience: { work: [], internship: [], volunteer: [], academic: [] },
  projects: [],
  education: { tertiary: {}, secondary: {}, elementary: {} },
  securityFocus: { profiles: [], writeups: [] },
};

test('only verified, substantive sections are available for public navigation', () => {
  assert.equal(hasPublicSectionContent('hero', emptyContent), false);
  assert.equal(hasPublicSectionContent('about', emptyContent), false);
  assert.equal(hasPublicSectionContent('contact', emptyContent), false);
  assert.equal(hasPublicSectionContent('skills', emptyContent), false);
  assert.equal(isPublicNavigationItem({ to: '/#projects' }, emptyContent), false);
  assert.equal(isPublicNavigationItem({ to: '/#contact' }, emptyContent), false);
  assert.equal(isPublicNavigationItem({ to: '/certificates' }, emptyContent), false);
});

test('hero, about, and contact only render once owner content exists', () => {
  const populated = {
    ...emptyContent,
    hero: { name: 'A. Person', title: 'Analyst', focus: 'Network security' },
    about: { introduction: 'Professional introduction.', interests: ['Network security'] },
    contact: { email: 'person@example.com' },
  };
  assert.equal(hasPublicSectionContent('hero', populated), true);
  assert.equal(hasPublicSectionContent('about', populated), true);
  assert.equal(hasPublicSectionContent('contact', populated), true);
  assert.equal(isPublicNavigationItem({ to: '/#contact' }, populated), true);

  const placeholder = {
    ...emptyContent,
    hero: { name: '[TODO: add name]' },
    about: { careerObjective: '[TODO: add objective]' },
    contact: { email: 'not-an-email' },
  };
  assert.equal(hasPublicSectionContent('hero', placeholder), false);
  assert.equal(hasPublicSectionContent('about', placeholder), false);
  assert.equal(hasPublicSectionContent('contact', placeholder), false);
});

test('relevant academic activities can be published without inventing employment', () => {
  const academicActivity = {
    role: 'CTF participant',
    organization: 'PacketCapture CTF',
    summary: 'Solved an OSINT challenge by following clues from an image through public social media posts.',
  };
  const content = {
    ...emptyContent,
    experience: { ...emptyContent.experience, academic: [academicActivity] },
  };

  assert.equal(hasPublicSectionContent('experience', content), true);
  assert.equal(hasPublicSectionContent('experience', emptyContent), false);
});

test('skill proficiency remains absent unless a valid value was supplied', () => {
  assert.equal(getSkillProficiency(undefined), null);
  assert.equal(getSkillProficiency(null), null);
  assert.equal(getSkillProficiency(''), null);
  assert.equal(getSkillProficiency('not a number'), null);
  assert.equal(getSkillProficiency(0), 0);
  assert.equal(getSkillProficiency(135), 100);
});

test('project section requires two real, safe screenshots', () => {
  const project = {
    title: 'Portfolio application',
    role: 'Portfolio project',
    purpose: 'Present a professional profile.',
    technologies: ['React'],
    features: ['Portfolio sections'],
    contributions: ['Personal portfolio content'],
    screenshots: [
      { src: '/screens/one.webp', alt: 'Project screen one', width: 800, height: 500 },
      { src: null, alt: 'Image placeholder', width: 800, height: 500 },
    ],
  };
  assert.equal(hasPublicSectionContent('projects', { ...emptyContent, projects: [project] }), false);

  project.screenshots[1] = {
    src: '/screens/two.webp',
    alt: 'Project screen two',
    width: 800,
    height: 500,
  };
  assert.equal(hasPublicSectionContent('projects', { ...emptyContent, projects: [project] }), true);
});

test('education and certificate navigation omit unfinished records', () => {
  const content = {
    ...emptyContent,
    education: {
      ...emptyContent.education,
      secondary: { institution: '[TODO: add school]' },
    },
    certificates: [{ title: '[TODO: add certificate]' }],
  };
  assert.equal(hasPublicSectionContent('education', content), false);
  assert.equal(hasPublicSectionContent('certificates', content), false);
});

test('only completed eligibility records are presented as attained', () => {
  assert.equal(isPublicEligibility({ title: 'Civil Service Eligibility' }), false);
  assert.equal(
    isPublicEligibility({ title: 'Civil Service Eligibility', status: 'Completed' }),
    true,
  );
  assert.equal(isPublicEligibility({ title: 'Planned certification', status: 'Planned' }), false);
  assert.equal(isPublicEligibility({ title: 'Pending certification', status: 'Pending' }), false);
  assert.equal(isPublicEligibility({ title: 'In progress', status: 'In progress' }), false);
  assert.equal(isPublicEligibility({ title: '[TODO: add eligibility]' }), false);
  assert.equal(isPublicEligibility({ title: '' }), false);

  const plannedOnly = {
    ...emptyContent,
    eligibility: [{ title: 'Planned certification', status: 'Planned' }],
  };
  assert.equal(hasPublicSectionContent('eligibility', plannedOnly), false);

  const completed = {
    ...emptyContent,
    eligibility: [{ title: 'Civil Service Eligibility', status: 'Completed' }],
  };
  assert.equal(hasPublicSectionContent('eligibility', completed), true);
});

test('project publish validation counts only usable screenshots', () => {
  const project = {
    screenshots: [
      { src: '/screens/one.webp', alt: 'Project screen one', width: 800, height: 500 },
      { src: '/screens/two.webp', alt: '', width: 800, height: 500 },
    ],
  };
  assert.equal(countPublicProjectScreenshots(project), 1);
  project.screenshots[1].alt = 'Project screen two';
  assert.equal(countPublicProjectScreenshots(project), 2);
});
