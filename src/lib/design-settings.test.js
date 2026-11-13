import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeDatabaseDesign,
  sanitizeSectionVisibility,
  sectionVisibilityIds,
} from './design-settings.js';

test('sanitizeSectionVisibility keeps known ids and defaults the rest to visible', () => {
  assert.deepEqual(
    sanitizeSectionVisibility({ about: false, projects: false }),
    {
      hero: true,
      about: false,
      skills: true,
      certificates: true,
      eligibility: true,
      experience: true,
      projects: false,
      education: true,
      security: true,
      contact: true,
    },
  );
});

test('sanitizeSectionVisibility ignores unknown ids and non-boolean values', () => {
  const result = sanitizeSectionVisibility({ about: 'no', bogus: false, hero: false });
  assert.equal(result.about, true);
  assert.equal(result.hero, false);
  assert.equal(Object.hasOwn(result, 'bogus'), false);
});

test('sanitizeSectionVisibility falls back to all-visible for invalid input', () => {
  for (const value of [null, undefined, 'nope', 42, [], true]) {
    const result = sanitizeSectionVisibility(value);
    for (const id of sectionVisibilityIds) assert.equal(result[id], true);
  }
});

test('normalizeDatabaseDesign parses JSON section_visibility strings', () => {
  const settings = normalizeDatabaseDesign({
    section_visibility: JSON.stringify({ about: false, security: false }),
  });
  assert.equal(settings.sectionVisibility.about, false);
  assert.equal(settings.sectionVisibility.security, false);
  assert.equal(settings.sectionVisibility.hero, true);
});

test('normalizeDatabaseDesign tolerates object section_visibility values', () => {
  const settings = normalizeDatabaseDesign({
    section_visibility: { projects: false },
  });
  assert.equal(settings.sectionVisibility.projects, false);
  assert.equal(settings.sectionVisibility.contact, true);
});

test('normalizeDatabaseDesign defaults sectionVisibility to all-visible', () => {
  const settings = normalizeDatabaseDesign({});
  for (const id of sectionVisibilityIds) assert.equal(settings.sectionVisibility[id], true);
});

test('normalizeDatabaseDesign parses admin-managed layout choices', () => {
  const settings = normalizeDatabaseDesign({
    skills_layout: 'two-columns',
    projects_layout: 'two-column',
    certificates_layout: 'thumbnails',
  });

  assert.equal(settings.skillsLayout, 'two-columns');
  assert.equal(settings.projectsLayout, 'two-column');
  assert.equal(settings.certificatesLayout, 'thumbnails');
});

test('normalizeDatabaseDesign rejects unknown layout values', () => {
  const settings = normalizeDatabaseDesign({
    skills_layout: 'carousel',
    projects_layout: 'masonry',
    certificates_layout: 'cards',
  });

  assert.equal(settings.skillsLayout, 'rows');
  assert.equal(settings.projectsLayout, 'stacked');
  assert.equal(settings.certificatesLayout, 'table');
});
