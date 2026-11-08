import test from 'node:test';
import assert from 'node:assert/strict';
import { hasPublicSectionContent, isPublicNavigationItem } from './public-sections.js';

const emptyContent = {
  skills: [],
  certificates: [],
  eligibility: [],
  experience: { work: [], internship: [], volunteer: [] },
  projects: [],
  education: { tertiary: {}, secondary: {}, elementary: {} },
  securityFocus: { profiles: [], writeups: [] },
};

test('only verified, substantive sections are available for public navigation', () => {
  assert.equal(hasPublicSectionContent('about', emptyContent), true);
  assert.equal(hasPublicSectionContent('contact', emptyContent), true);
  assert.equal(hasPublicSectionContent('skills', emptyContent), false);
  assert.equal(isPublicNavigationItem({ to: '/#projects' }, emptyContent), false);
  assert.equal(isPublicNavigationItem({ to: '/certificates' }, emptyContent), false);
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
