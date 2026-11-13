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
