import assert from 'node:assert/strict';
import test from 'node:test';
import {
  listPublicMediaInventoryWithClient,
  loadPendingPublicAssetCleanupWithClient,
  mergePublishedPortfolioContent,
  movePublicMediaToPrivateWithClient,
  publishPortfolioContentWithClient,
  resolvePortfolioAssetUrl,
  retryPublicAssetCleanupWithClient,
  savePortfolioDesignWithClient,
  unpublishPortfolioContentWithClient,
  uploadPortfolioAssetWithClient,
  validatePublishedAssetReferencesWithClient,
} from './portfolio-content.js';
import { content } from '../data/content.js';

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
