import assert from 'node:assert/strict';
import test from 'node:test';
import {
  listPublicMediaInventoryWithClient,
  loadPortfolioDraftWithClient,
  loadPendingPublicAssetCleanupWithClient,
  loadPublishedPortfolioContentWithClient,
  mergePublishedPortfolioContent,
  movePublicMediaToPrivateWithClient,
  publishPortfolioContentWithClient,
  resolvePortfolioAssetUrl,
  retryPublicAssetCleanupWithClient,
  savePortfolioDesignWithClient,
  savePortfolioDraftWithClient,
  unpublishPortfolioContentWithClient,
  uploadPortfolioAssetWithClient,
  validatePublishedAssetReferencesWithClient,
} from './portfolio-content.js';
import { content } from '../data/content.js';
import { normalizeDatabaseDesign } from './design-settings.js';

function createStorageClient(initialSettings = []) {
  const settings = [...initialSettings];
  const cleanupQueue = [];
  const objects = new Map();
  const removed = [];
  const uploads = [];
  let failRemove = false;
  const keyFor = (bucket, path) => `${bucket}/${path}`;

  const client = {
    settings,
    cleanupQueue,
    objects,
    removed,
    uploads,
    set failRemove(value) {
      failRemove = value;
    },
    from(table) {
      if (table === 'public_asset_cleanup_queue') {
        return {
          select() {
            return {
              order: async () => ({ data: cleanupQueue.map((row) => ({ ...row })), error: null }),
            };
          },
          upsert: async (value) => {
            const rows = Array.isArray(value) ? value : [value];
            for (const row of rows) {
              if (!cleanupQueue.some((item) => item.storage_path === row.storage_path)) {
                cleanupQueue.push({ ...row, created_at: new Date().toISOString() });
              }
            }
            return { error: null };
          },
          delete() {
            return {
              in: async (_column, paths) => {
                for (let index = cleanupQueue.length - 1; index >= 0; index -= 1) {
                  if (paths.includes(cleanupQueue[index].storage_path)) cleanupQueue.splice(index, 1);
                }
                return { error: null };
              },
            };
          },
        };
      }

      if (table === 'published_sections') {
        return {
          select() {
            return {
              eq(_column, key) {
                return {
                  maybeSingle: async () => {
                    const row = settings.find((item) => item.key === key && item.published);
                    return {
                      data: row && typeof row.value === 'string' ? { value: row.value } : null,
                      error: null,
                    };
                  },
                };
              },
            };
          },
        };
      }

      assert.equal(table, 'site_settings');
      return {
        select() {
          return {
            in: async (_column, keys) => ({
              data: settings.filter((row) => keys.includes(row.key)).map((row) => ({ ...row })),
              error: null,
            }),
            then(resolve, reject) {
              return Promise.resolve({ data: settings.map((row) => ({ ...row })), error: null })
                .then(resolve, reject);
            },
          };
        },
        upsert: async (value) => {
          const rows = Array.isArray(value) ? value : [value];
          for (const row of rows) {
            const existing = settings.find((item) => item.key === row.key);
            if (existing) Object.assign(existing, row);
            else settings.push({ ...row });
          }
          return { error: null };
        },
        delete: () => ({
          eq: async (_column, key) => {
            const index = settings.findIndex((row) => row.key === key);
            if (index >= 0) settings.splice(index, 1);
            return { error: null };
          },
        }),
        update: (values) => {
          const filters = {};
          const query = {
            eq(column, value) {
              filters[column] = value;
              return this;
            },
            then(resolve, reject) {
              const row = settings.find((item) =>
                Object.entries(filters).every(([column, value]) => item[column] === value),
              );
              if (row) Object.assign(row, values);
              return Promise.resolve({ error: null }).then(resolve, reject);
            },
          };
          return query;
        },
      };
    },
    storage: {
      from(bucket) {
        return {
          upload: async (path, file, options) => {
            uploads.push({ bucket, path, options });
            objects.set(keyFor(bucket, path), file);
            return { error: null };
          },
          download: async (path) => ({
            data: objects.get(keyFor(bucket, path)) ?? null,
            error: objects.has(keyFor(bucket, path)) ? null : new Error('Object not found'),
          }),
          remove: async (paths) => {
            removed.push(...paths);
            if (failRemove) return { error: new Error('Storage deletion failed') };
            paths.forEach((path) => objects.delete(keyFor(bucket, path)));
            return { error: null };
          },
          createSignedUrl: async (path, expiresIn) => ({
            data: { signedUrl: `https://private.example/${path}?expires=${expiresIn}` },
            error: null,
          }),
          getPublicUrl: (path) => ({
            data: { publicUrl: `https://project.example/storage/v1/object/public/public-media/${path}` },
          }),
          list: async (prefix, { limit = 100, offset = 0 }) => {
            const allPaths = [...objects.keys()]
              .filter((key) => key.startsWith(`${bucket}/`))
              .map((key) => key.slice(bucket.length + 1));
            const children = new Map();
            for (const path of allPaths) {
              if (prefix && !path.startsWith(`${prefix}/`)) continue;
              const rest = prefix ? path.slice(prefix.length + 1) : path;
              const [name, ...remaining] = rest.split('/');
              if (!name) continue;
              if (remaining.length) children.set(name, { id: null, metadata: null, name });
              else children.set(name, { id: `object-${name}`, metadata: { size: objects.get(keyFor(bucket, path)).size }, name });
            }
            return { data: [...children.values()].slice(offset, offset + limit), error: null };
          },
        };
      },
    },
  };
  return client;
}

test('legacy published template instructions are never merged into public content', () => {
  const merged = mergePublishedPortfolioContent(content, {
    hero: {
      focus: '[TODO: add a professional introduction]',
      title: 'Aspiring Cybersecurity and Network Security Professional',
    },
    about: {
      educationSummary: 'Edit the source files to add education.',
    },
  });

  assert.equal(merged.hero.focus, content.hero.focus);
  assert.equal(merged.about.educationSummary, content.about.educationSummary);
  assert.doesNotMatch(JSON.stringify(merged), /\[TODO:|edit the source files/i);
});

test('saved profile and null education values load into the admin form', () => {
  const savedContent = {
    hero: { name: 'Updated Jasmine' },
    contact: { email: 'jasmine@example.org' },
    education: {
      tertiary: { institution: 'Updated University', yearGraduated: '2027' },
      secondary: { institution: 'Secondary School' },
      elementary: { institution: 'Elementary School' },
    },
  };
  const merged = mergePublishedPortfolioContent(content, savedContent);

  assert.equal(merged.hero.name, 'Updated Jasmine');
  assert.equal(merged.contact.email, 'jasmine@example.org');
  assert.equal(merged.education.tertiary.institution, 'Updated University');
  assert.equal(merged.education.tertiary.yearGraduated, '2027');
  assert.equal(merged.education.secondary.institution, 'Secondary School');
});

test('older published content keeps shared base records when a group is omitted', () => {
  const baseWithActivity = {
    ...content,
    experience: {
      work: [],
      internship: [],
      volunteer: [],
      academic: [{ id: 'base-activity', role: 'Participant', organization: 'Base Org' }],
    },
  };
  const merged = mergePublishedPortfolioContent(baseWithActivity, {
    experience: { work: [], internship: [], volunteer: [] },
  });

  assert.deepEqual(merged.experience.academic, baseWithActivity.experience.academic);
});

test('invalid saved portfolio content fails closed instead of loading fallback content', async () => {
  const client = createStorageClient([
    { key: 'portfolio_content_draft', value: '{invalid', published: false },
  ]);

  await assert.rejects(
    loadPortfolioDraftWithClient(client),
    /Saved portfolio content is invalid JSON/,
  );
});

test('Save Draft persists edits for reload without changing published content', async () => {
  const publishedValue = JSON.stringify({ hero: { name: 'Public Name' } });
  const client = createStorageClient([
    { key: 'portfolio_content', value: publishedValue, published: true },
  ]);
  const edited = {
    ...content,
    hero: { ...content.hero, name: 'Draft Name' },
    education: {
      ...content.education,
      tertiary: { ...content.education.tertiary, yearGraduated: '2027' },
    },
  };

  await savePortfolioDraftWithClient(client, edited);
  const loaded = await loadPortfolioDraftWithClient(client);

  assert.equal(loaded.content.hero.name, 'Draft Name');
  assert.equal(loaded.content.education.tertiary.yearGraduated, '2027');
  assert.equal(loaded.published, true);
  assert.equal(client.settings.find((row) => row.key === 'portfolio_content').value, publishedValue);
  assert.equal(client.settings.find((row) => row.key === 'portfolio_content_draft').published, false);
});

test('new asset uploads stay private and draft previews use short-lived signed URLs', async () => {
  const client = createStorageClient();
  const file = new Blob(['image bytes'], { type: 'image/png' });
  Object.defineProperty(file, 'name', { value: 'portrait.png' });

  const reference = await uploadPortfolioAssetWithClient(client, file);
  assert.match(reference, /^originals:portfolio\/[0-9a-f-]+\.png$/);
  assert.equal(client.uploads[0].bucket, 'originals');
  assert.equal(client.uploads[0].options.upsert, false);

  const preview = await resolvePortfolioAssetUrl(reference, client);
  assert.match(preview, /expires=60$/);
});

test('publishing copies only referenced originals and stores public URLs in published content', async () => {
  const client = createStorageClient();
  const file = new Blob(['resume bytes'], { type: 'application/pdf' });
  Object.defineProperty(file, 'name', { value: 'resume.pdf' });
  const reference = await uploadPortfolioAssetWithClient(client, file, { kind: 'resume' });

  const { content: published, warnings } = await publishPortfolioContentWithClient(client, {
    resumePath: reference,
    hero: { portrait: { src: reference } },
    projects: [],
  });

  assert.match(published.resumePath, /\/public\/public-media\/portfolio\//);
  assert.equal(published.hero.portrait.src, published.resumePath);
  assert.deepEqual(warnings, []);
  assert.ok(client.uploads.some((upload) => upload.bucket === 'public-media'));
  const row = client.settings.find((setting) => setting.key === 'portfolio_content');
  const draftRow = client.settings.find((setting) => setting.key === 'portfolio_content_draft');
  assert.equal(row.published, true);
  assert.equal(JSON.parse(row.value).resumePath, published.resumePath);
  assert.ok(!row.value.includes('originals:'));
  assert.equal(draftRow.published, false);
  assert.equal(JSON.parse(draftRow.value).resumePath, reference);
});

test('Publish updates edited profile, certificate, education, and project records', async () => {
  const client = createStorageClient();
  const assets = ['portrait.webp', 'certificate.pdf', 'project-1.png', 'project-2.png'];
  assets.forEach((name) => {
    client.objects.set(`originals/portfolio/${name}`, new Blob([name], { type: 'application/octet-stream' }));
  });
  const edited = {
    hero: { name: 'Updated Jasmine', portrait: { src: 'originals:portfolio/portrait.webp' } },
    contact: { email: 'jasmine@example.org' },
    education: { tertiary: { institution: 'Updated University', yearGraduated: '2027' } },
    certificates: [{
      id: 'certificate-1',
      title: 'Updated Network Certificate',
      issuer: 'Verified Issuer',
      publicFile: { src: 'originals:portfolio/certificate.pdf' },
    }],
    projects: [{
      id: 'project-1',
      title: 'Updated Network Project',
      screenshots: [
        { src: 'originals:portfolio/project-1.png' },
        { src: 'originals:portfolio/project-2.png' },
      ],
    }],
  };

  const { content: published } = await publishPortfolioContentWithClient(client, edited);
  const publishedRow = client.settings.find((row) => row.key === 'portfolio_content');

  assert.equal(published.hero.name, 'Updated Jasmine');
  assert.equal(published.education.tertiary.institution, 'Updated University');
  assert.equal(published.education.tertiary.yearGraduated, '2027');
  assert.equal(published.certificates[0].title, 'Updated Network Certificate');
  assert.equal(published.projects[0].title, 'Updated Network Project');
  assert.match(published.certificates[0].publicFile.src, /\/public\/public-media\//);
  assert.ok(published.projects.every((project) => project.screenshots.every((image) => image.src.includes('/public/public-media/'))));
  assert.equal(publishedRow.published, true);
  assert.equal(JSON.parse(client.settings.find((row) => row.key === 'portfolio_content_draft').value).hero.portrait.src, 'originals:portfolio/portrait.webp');
});

test('unpublishing deletes unused public copies but preserves assets shared by a published design', async () => {
  const sharedUrl = 'https://project.example/storage/v1/object/public/public-media/portfolio/shared.webp';
  const uniqueUrl = 'https://project.example/storage/v1/object/public/public-media/portfolio/unique.webp';
  const client = createStorageClient([
    {
      key: 'portfolio_content',
      value: JSON.stringify({ hero: { portrait: { src: sharedUrl } }, resumePath: uniqueUrl }),
      published: true,
    },
    { key: 'font_url', value: sharedUrl, published: true },
  ]);
  client.objects.set('public-media/portfolio/shared.webp', new Blob(['shared']));
  client.objects.set('public-media/portfolio/unique.webp', new Blob(['unique']));

  const { cleanupError, content: privateDraft } = await unpublishPortfolioContentWithClient(client);
  assert.equal(cleanupError, null);
  assert.deepEqual(client.removed, ['portfolio/unique.webp']);
  assert.equal(client.objects.has('public-media/portfolio/shared.webp'), true);
  assert.equal(client.settings.find((row) => row.key === 'portfolio_content').published, false);
  const draft = JSON.parse(client.settings.find((row) => row.key === 'portfolio_content_draft').value);
  assert.equal(draft.hero.portrait.src, 'originals:portfolio/shared.webp');
  assert.equal(draft.resumePath, 'originals:portfolio/unique.webp');
  assert.equal(client.objects.has('originals/portfolio/unique.webp'), true);

  const { content: republished } = await publishPortfolioContentWithClient(client, privateDraft);
  assert.match(republished.resumePath, /\/public\/public-media\/portfolio\/unique\.webp$/);
  assert.equal(client.settings.find((row) => row.key === 'portfolio_content').published, true);
  assert.equal(client.objects.has('public-media/portfolio/unique.webp'), true);
});

test('failed unpublish cleanup persists across reload and succeeds on retry', async () => {
  const publicUrl = 'https://project.example/storage/v1/object/public/public-media/portfolio/retry.webp';
  const client = createStorageClient([
    {
      key: 'portfolio_content',
      value: JSON.stringify({ hero: { portrait: { src: publicUrl } } }),
      published: true,
    },
  ]);
  client.objects.set('public-media/portfolio/retry.webp', new Blob(['image']));
  client.failRemove = true;

  const result = await unpublishPortfolioContentWithClient(client);
  assert.ok(result.cleanupError);
  assert.deepEqual(result.cleanupCandidates, ['portfolio/retry.webp']);
  assert.equal(client.settings.find((row) => row.key === 'portfolio_content').published, false);
  assert.equal(client.objects.has('public-media/portfolio/retry.webp'), true);

  const pendingAfterReload = await loadPendingPublicAssetCleanupWithClient(client);
  assert.deepEqual(pendingAfterReload, ['portfolio/retry.webp']);
  client.failRemove = false;
  const retry = await retryPublicAssetCleanupWithClient(client);

  assert.deepEqual(retry.pendingPaths, []);
  assert.deepEqual(retry.removedPaths, ['portfolio/retry.webp']);
  assert.equal(client.objects.has('public-media/portfolio/retry.webp'), false);
  assert.equal(client.cleanupQueue.length, 0);
  assert.equal(client.objects.has('originals/portfolio/retry.webp'), true);
});

test('published content rejects private paths, signed URLs, malformed storage URLs, and unknown buckets', () => {
  const client = createStorageClient();
  const invalidReferences = [
    'originals:portfolio/private.pdf',
    'originals/portfolio/private.pdf',
    '/resume/private.pdf',
    'https://cdn.example/private-photo.webp',
    'https://project.example/storage/v1/object/public/originals/portfolio/private.pdf',
    'https://project.example/storage/v1/object/sign/public-media/portfolio/private.pdf?token=secret',
    'https://project.example/storage/v1/object/public/public-media',
    'https://project.example/storage/v1/object/public/unknown/portfolio/file.png',
  ];

  for (const reference of invalidReferences) {
    assert.throws(
      () => validatePublishedAssetReferencesWithClient({ certificate: { publicFile: { src: reference } } }, client),
      /approved public-media URLs/,
      reference,
    );
  }

  assert.doesNotThrow(() =>
    validatePublishedAssetReferencesWithClient(
      {
        hero: { portrait: { src: 'https://project.example/storage/v1/object/public/public-media/portfolio/photo.webp' } },
        resumePath: 'https://project.example/storage/v1/object/public/public-media/portfolio/resume.pdf',
        projects: [{ screenshots: [{ src: 'https://project.example/storage/v1/object/public/public-media/portfolio/project.png' }] }],
        contact: { github: 'https://github.com/jasmine' },
      },
      client,
    ),
  );
});

test('signed asset URLs cannot be written by publishing content or design settings', async () => {
  const client = createStorageClient();
  const signedUrl =
    'https://project.example/storage/v1/object/sign/originals/portfolio/resume.pdf?token=secret';

  await assert.rejects(
    publishPortfolioContentWithClient(client, { resumePath: signedUrl, projects: [] }),
    /approved public-media URLs/,
  );
  await assert.rejects(
    savePortfolioDesignWithClient(client, { font_url: signedUrl }),
    /approved public-media URLs/,
  );
  assert.equal(client.settings.some((row) => row.key === 'portfolio_content' && row.published), false);
  assert.equal(client.settings.some((row) => row.key === 'font_url' && row.published), false);
});

test('legacy inventory is read-only and unapproved assets can be moved private', async () => {
  const publicUrl = 'https://project.example/storage/v1/object/public/public-media/portfolio/legacy.webp';
  const client = createStorageClient([
    {
      key: 'portfolio_content_draft',
      value: JSON.stringify({ hero: { portrait: { src: publicUrl } } }),
      published: false,
    },
  ]);
  client.objects.set('public-media/portfolio/legacy.webp', new Blob(['legacy image'], { type: 'image/webp' }));

  const inventory = await listPublicMediaInventoryWithClient(client);
  assert.deepEqual(inventory, [
    {
      path: 'portfolio/legacy.webp',
      size: 12,
      contentType: '',
      publishedReferences: 0,
      draftReferences: 1,
    },
  ]);
  assert.equal(client.objects.has('public-media/portfolio/legacy.webp'), true);
  assert.deepEqual(client.removed, []);

  const moved = await movePublicMediaToPrivateWithClient(client, 'portfolio/legacy.webp');
  assert.equal(moved.publicRemoved, true);
  assert.equal(client.objects.has('originals/portfolio/legacy.webp'), true);
  assert.equal(client.objects.has('public-media/portfolio/legacy.webp'), false);
  assert.equal(
    JSON.parse(client.settings[0].value).hero.portrait.src,
    'originals:portfolio/legacy.webp',
  );
});

test('legacy asset migration refuses to move assets referenced by published content', async () => {
  const publicUrl = 'https://project.example/storage/v1/object/public/public-media/portfolio/approved.webp';
  const client = createStorageClient([
    { key: 'portfolio_content', value: JSON.stringify({ resumePath: publicUrl }), published: true },
  ]);
  client.objects.set('public-media/portfolio/approved.webp', new Blob(['approved']));

  await assert.rejects(
    movePublicMediaToPrivateWithClient(client, 'portfolio/approved.webp'),
    /referenced by published content/,
  );
  assert.equal(client.objects.has('public-media/portfolio/approved.webp'), true);
  assert.equal(client.objects.has('originals/portfolio/approved.webp'), false);
});

test('legacy migration preserves an existing private object instead of overwriting it', async () => {
  const publicUrl = 'https://project.example/storage/v1/object/public/public-media/portfolio/legacy.webp';
  const client = createStorageClient([
    {
      key: 'portfolio_content_draft',
      value: JSON.stringify({ hero: { portrait: { src: publicUrl } } }),
      published: false,
    },
  ]);
  client.objects.set('public-media/portfolio/legacy.webp', new Blob(['new public file']));
  client.objects.set('originals/portfolio/legacy.webp', new Blob(['existing private file']));

  const result = await movePublicMediaToPrivateWithClient(client, 'portfolio/legacy.webp');
  const privatePath = result.privateReference.slice('originals:'.length);
  assert.notEqual(privatePath, 'portfolio/legacy.webp');
  assert.match(privatePath, /^portfolio\/legacy-[0-9a-f-]+-legacy\.webp$/);
  assert.equal(await client.objects.get('originals/portfolio/legacy.webp').text(), 'existing private file');
  assert.equal(await client.objects.get(`originals/${privatePath}`).text(), 'new public file');
  assert.equal(
    JSON.parse(client.settings[0].value).hero.portrait.src,
    result.privateReference,
  );
  assert.equal(client.objects.has('public-media/portfolio/legacy.webp'), false);
});

const testResumeDraft = {
  ...content,
  projects: content.projects.map((project) => project),
  hero: { ...content.hero, name: 'Portfolio Owner' },
  resumePath: '',
};

test('publishing regenerates the public resume PDF and points the public site at it', async () => {
  const client = createStorageClient([]);
  const result = await publishPortfolioContentWithClient(client, testResumeDraft);

  assert.match(result.content.resumePath, /\/storage\/v1\/object\/public\/public-media\/portfolio\/resume\.pdf$/);

  const uploaded = client.uploads.find((entry) => entry.path === 'portfolio/resume.pdf');
  assert.ok(uploaded, 'expected portfolio/resume.pdf to be uploaded');
  assert.equal(uploaded.bucket, 'public-media');
  assert.equal(uploaded.options.upsert, true);
  assert.equal(uploaded.options.contentType, 'application/pdf');

  const pdfBytes = await client.objects.get('public-media/portfolio/resume.pdf');
  assert.deepEqual([...pdfBytes.slice(0, 5)], [...Buffer.from('%PDF-')]);

  const publicRow = client.settings.find((row) => row.key === 'portfolio_content');
  const draftRow = client.settings.find((row) => row.key === 'portfolio_content_draft');
  assert.equal(JSON.parse(publicRow.value).resumePath, result.content.resumePath);
  assert.equal(JSON.parse(draftRow.value).resumePath, '');
});

test('a manual resume upload overrides generation and is copied to public-media instead', async () => {
  const client = createStorageClient([]);
  client.objects.set('originals/portfolio/my-resume.pdf', new Blob(['%PDF-manual']));

  const draft = { ...testResumeDraft, resumePath: 'originals:portfolio/my-resume.pdf' };
  const result = await publishPortfolioContentWithClient(client, draft);

  assert.equal(result.content.resumePath,
    'https://project.example/storage/v1/object/public/public-media/portfolio/my-resume.pdf');
  assert.equal(
    client.uploads.some((entry) => entry.path === 'portfolio/resume.pdf'),
    false,
    'automatic generation must be skipped when a manual override exists',
  );
});

test('resume generation failure surfaces as a warning and does not block publish', async () => {
  const client = createStorageClient([]);
  const failing = new Proxy(client, {
    get(target, property) {
      if (property === 'storage') {
        return {
          from(bucket) {
            if (bucket === 'public-media') {
              return {
                upload: async () => ({ error: new Error('storage unavailable') }),
                getPublicUrl: (path) => ({
                  data: { publicUrl: `https://project.example/storage/v1/object/public/public-media/${path}` },
                }),
              };
            }
            return target.storage.from(bucket);
          },
        };
      }
      return target[property];
    },
  });

  const result = await publishPortfolioContentWithClient(failing, testResumeDraft);
  assert.equal(result.content.resumePath, '');
  assert.ok(result.warnings.some((warning) => warning.includes('resume')), 'expected a resume warning');
  assert.ok(client.settings.some((row) => row.key === 'portfolio_content' && row.published === true));
});

test('every public section survives draft save, reload, publish, anonymous load, and unpublish', async () => {
  const client = createStorageClient([
    {
      key: 'portfolio_content',
      value: JSON.stringify({ hero: { name: 'Published Owner' }, contact: { email: 'published@example.org' } }),
      published: true,
    },
  ]);
  const publishedRow = client.settings.find((row) => row.key === 'portfolio_content');
  const publishedValueBefore = publishedRow.value;

  const edited = {
    ...content,
    hero: {
      ...content.hero,
      name: 'Draft Owner',
      title: 'Security Analyst',
      eyebrow: 'Cybersecurity portfolio',
      brandDetail: 'Security · Operations',
      focus: 'Draft introduction for the public profile.',
    },
    about: {
      ...content.about,
      introduction: 'Draft about section.',
      careerObjective: 'Draft career objective.',
      educationSummary: 'Draft education summary.',
      interests: ['Network defense', 'Threat detection'],
    },
    skills: [{ id: 'skill-1', category: 'Cybersecurity', name: 'Threat detection', proficiency: 80, featured: true }],
    certificates: [
      { id: 'cert-1', title: 'Draft Certificate', type: 'IT Certification', issuer: 'Draft Issuer', dateEarned: '2026-01-01', featured: true },
      { id: 'award-1', title: 'Draft Award', type: 'Award', issuer: 'Draft Award Body', dateEarned: '2026-02-02', featured: true },
    ],
    eligibility: [{ id: 'elig-1', title: 'Draft Eligibility', issuer: 'Draft Board', dateConferred: '2026-03-03', status: 'Completed' }],
    experience: {
      work: [{ id: 'work-1', role: 'Analyst', organization: 'Draft Employer', period: '2026', responsibilities: ['Draft responsibility'] }],
      internship: [{ id: 'intern-1', role: 'Intern', organization: 'Draft Office', period: '2025' }],
      volunteer: [{ id: 'vol-1', role: 'Volunteer', organization: 'Draft Program', period: '2025' }],
      academic: [{ id: 'acad-1', role: 'CTF participant', organization: 'Draft CTF', summary: 'Draft activity.' }],
    },
    projects: [{
      id: 'project-1',
      title: 'Draft Project',
      role: 'Developer',
      purpose: 'Draft purpose.',
      summary: 'Draft description.',
      technologies: ['React'],
      features: ['Draft feature'],
      contributions: ['Draft contribution'],
      screenshots: [
        { src: 'https://project.example/storage/v1/object/public/public-media/portfolio/one.png', alt: 'First screenshot', width: 800, height: 600 },
        { src: 'https://project.example/storage/v1/object/public/public-media/portfolio/two.png', alt: 'Second screenshot', width: 800, height: 600 },
      ],
      featured: true,
    }],
    education: {
      tertiary: { level: 'Tertiary', institution: 'Draft University', course: 'Draft Course', yearGraduated: '2027', achievement: null },
      secondary: { level: 'Secondary', institution: 'Draft High School', yearGraduated: '2023', achievement: null },
      elementary: { level: 'Elementary', institution: 'Draft Elementary School', yearGraduated: '2019' },
    },
    securityFocus: {
      profiles: [{ id: 'profile-1', name: 'Draft Lab Profile', detail: 'Draft lab description.', url: 'https://example.org/lab' }],
      writeups: [{ id: 'writeup-1', title: 'Draft Write-up', summary: 'Draft write-up summary.' }],
    },
    contact: {
      ...content.contact,
      email: 'draft.owner@example.org',
      github: 'https://github.com/draft-owner',
      linkedin: 'https://www.linkedin.com/in/draft-owner',
    },
    resumePath: '',
  };

  await savePortfolioDraftWithClient(client, edited);
  const reloaded = await loadPortfolioDraftWithClient(client);
  assert.equal(reloaded.published, true);
  assert.equal(reloaded.content.hero.name, 'Draft Owner');
  assert.equal(reloaded.content.contact.github, 'https://github.com/draft-owner');
  assert.equal(publishedRow.value, publishedValueBefore, 'saving a draft must not change published content');

  const { content: published } = await publishPortfolioContentWithClient(client, reloaded.content);
  assert.equal(published.hero.name, 'Draft Owner');
  assert.equal(published.hero.brandDetail, 'Security · Operations');
  assert.equal(published.about.interests.length, 2);
  assert.equal(published.skills[0].name, 'Threat detection');
  assert.equal(published.certificates.find((item) => item.id === 'cert-1').title, 'Draft Certificate');
  assert.equal(published.certificates.find((item) => item.id === 'award-1').title, 'Draft Award');
  assert.equal(published.eligibility[0].title, 'Draft Eligibility');
  assert.equal(published.experience.work[0].organization, 'Draft Employer');
  assert.equal(published.experience.internship[0].organization, 'Draft Office');
  assert.equal(published.experience.volunteer[0].organization, 'Draft Program');
  assert.equal(published.experience.academic[0].organization, 'Draft CTF');
  assert.equal(published.projects[0].title, 'Draft Project');
  assert.equal(published.education.tertiary.institution, 'Draft University');
  assert.equal(published.education.secondary.institution, 'Draft High School');
  assert.equal(published.education.elementary.institution, 'Draft Elementary School');
  assert.equal(published.securityFocus.profiles[0].name, 'Draft Lab Profile');
  assert.equal(published.securityFocus.writeups[0].title, 'Draft Write-up');
  assert.equal(published.contact.linkedin, 'https://www.linkedin.com/in/draft-owner');
  assert.match(published.resumePath, /\/public-media\/portfolio\/resume\.pdf$/);

  const anonymous = await loadPublishedPortfolioContentWithClient(client);
  assert.equal(anonymous.hero.name, 'Draft Owner');
  assert.equal(anonymous.contact.email, 'draft.owner@example.org');

  client.objects.set('public-media/portfolio/one.png', new Blob(['one']));
  client.objects.set('public-media/portfolio/two.png', new Blob(['two']));
  const unpublished = await unpublishPortfolioContentWithClient(client);
  assert.equal(await loadPublishedPortfolioContentWithClient(client), null);
  assert.equal(unpublished.content.hero.name, 'Draft Owner');
  assert.equal(unpublished.content.contact.github, 'https://github.com/draft-owner');
});

test('design layout choices persist through the published design settings', async () => {
  const client = createStorageClient([]);
  const { settings } = await savePortfolioDesignWithClient(client, {
    theme_mode: 'midnight',
    skills_layout: 'two-columns',
    projects_layout: 'two-column',
    certificates_layout: 'thumbnails',
    section_visibility: { about: false, projects: true },
  });

  assert.equal(settings.skills_layout, 'two-columns');
  const rows = Object.fromEntries(client.settings.map((row) => [row.key, row.value]));
  assert.equal(rows.skills_layout, 'two-columns');
  assert.equal(rows.projects_layout, 'two-column');
  assert.equal(rows.certificates_layout, 'thumbnails');
  assert.equal(client.settings.every((row) => row.published), true);

  const normalized = normalizeDatabaseDesign(rows);
  assert.equal(normalized.skillsLayout, 'two-columns');
  assert.equal(normalized.projectsLayout, 'two-column');
  assert.equal(normalized.certificatesLayout, 'thumbnails');
  assert.equal(normalized.sectionVisibility.about, false);
});

test('a legacy static resume path is replaced by the generated published resume', async () => {
  const client = createStorageClient([]);
  const legacyDraft = {
    ...testResumeDraft,
    resumePath: '/resume/legacy-file.pdf',
  };

  const result = await publishPortfolioContentWithClient(client, legacyDraft);

  assert.match(result.content.resumePath, /\/public-media\/portfolio\/resume\.pdf$/);
  assert.ok(client.uploads.some((entry) => entry.path === 'portfolio/resume.pdf'));
  assert.equal(
    JSON.parse(client.settings.find((row) => row.key === 'portfolio_content_draft').value).resumePath,
    '/resume/legacy-file.pdf',
  );
});
