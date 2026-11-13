import { getSupabaseClient, getSupabaseConfigIssue } from './supabase.js';
import {
  buildResumePdf,
  RESUME_PUBLIC_URL_PATH,
  STATIC_RESUME_PATH,
} from './resume.js';

const CONTENT_KEY = 'portfolio_content';
const DRAFT_KEY = 'portfolio_content_draft';
const DESIGN_KEYS = [
  'theme_mode',
  'font_scale',
  'content_width',
  'section_spacing',
  'section_padding',
  'background_color',
  'surface_color',
  'primary_color',
  'text_color',
  'hero_variant',
  'font_url',
  'section_visibility',
];
const ORIGINALS_BUCKET = 'originals';
const PUBLIC_MEDIA_BUCKET = 'public-media';
const CLEANUP_QUEUE = 'public_asset_cleanup_queue';
const ORIGINALS_REFERENCE_PREFIX = 'originals:';
const PUBLIC_URL_PREFIX = '/storage/v1/object/public/public-media/';
const SIGNED_URL_SECONDS = 60;
const ASSET_REFERENCE_FIELDS = new Set([
  'src',
  'resumePath',
  'font_url',
  'fontUrl',
  'image_path',
  'original_path',
  'storage_path',
  'file_url',
  'publicFile',
]);
const PUBLIC_CONTENT_KEYS = [
  'meta',
  'hero',
  'sections',
  'about',
  'skills',
  'certificateTypes',
  'achievementTypes',
  'certificates',
  'eligibility',
  'experience',
  'projects',
  'education',
  'securityFocus',
  'contact',
  'resumePath',
  'contactSubject',
];

function sanitizeTemplateText(value) {
  if (typeof value === 'string') {
    const templateInstruction =
      /\[TODO\b|not yet added|image placeholder|\$\s*whoami|(?:edit|change)\s+(?:the\s+)?(?:source|src)(?:\s+files?)?|add\s+(?:a|an|your)\s+(?:image|photo|picture|resume|certificate|project)/i;
    return templateInstruction.test(value) ? undefined : value;
  }
  if (Array.isArray(value)) return value.map(sanitizeTemplateText).filter((item) => item !== undefined);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => [key, sanitizeTemplateText(item)])
      .filter(([, item]) => item !== undefined),
  );
}

function mergeContent(base, override) {
  if (Array.isArray(base)) return Array.isArray(override) ? override : base;
  if (base === null) {
    return override === null || ['string', 'number', 'boolean'].includes(typeof override)
      ? override
      : base;
  }
  if (!base || typeof base !== 'object') {
    return typeof override === typeof base ? override : base;
  }
  if (!override || typeof override !== 'object' || Array.isArray(override)) return base;

  const merged = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (Object.prototype.hasOwnProperty.call(base, key)) merged[key] = mergeContent(base[key], value);
  }
  return merged;
}

export function mergePublishedPortfolioContent(base, savedContent) {
  if (!savedContent || typeof savedContent !== 'object' || Array.isArray(savedContent)) return base;
  const sanitizedContent = sanitizeTemplateText(savedContent);
  const result = { ...base };
  for (const key of PUBLIC_CONTENT_KEYS) {
    if (
      Object.prototype.hasOwnProperty.call(base, key) &&
      Object.prototype.hasOwnProperty.call(sanitizedContent, key)
    ) {
      result[key] = mergeContent(base[key], sanitizedContent[key]);
    }
  }
  return result;
}

function notConfiguredError() {
  const issue = getSupabaseConfigIssue();
  return new Error(issue ? `Supabase is not configured: ${issue}.` : 'Supabase is not configured.');
}

function getOriginalPath(reference) {
  if (typeof reference !== 'string' || !reference.startsWith(ORIGINALS_REFERENCE_PREFIX)) return null;
  const path = reference.slice(ORIGINALS_REFERENCE_PREFIX.length);
  if (
    !path ||
    path.split('/').some((part) => !part || part === '.' || part === '..') ||
    path.includes('\\')
  ) {
    throw new Error('The stored asset reference is invalid.');
  }
  return path;
}

function getPublicMediaPath(value, expectedOrigin) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (!url.pathname.startsWith(PUBLIC_URL_PREFIX)) return null;
    if (url.username || url.password || url.search || url.hash) return null;
    const configuredProjectUrl = import.meta.env?.VITE_SUPABASE_URL;
    const allowedOrigin = expectedOrigin || (configuredProjectUrl && new URL(configuredProjectUrl).origin);
    if (allowedOrigin && url.origin !== allowedOrigin) return null;
    const path = decodeURIComponent(url.pathname.slice(PUBLIC_URL_PREFIX.length));
    if (
      !path ||
      path.split('/').some((part) => !part || part === '.' || part === '..') ||
      path.includes('\\')
    ) {
      return null;
    }
    return path;
  } catch {
    return null;
  }
}

function getPublicMediaOrigin(client) {
  const { data } = client.storage.from(PUBLIC_MEDIA_BUCKET).getPublicUrl('portfolio/validation');
  if (!data?.publicUrl) throw new Error('Could not determine the public media URL.');
  const url = new URL(data.publicUrl);
  if (!url.pathname.startsWith(PUBLIC_URL_PREFIX)) {
    throw new Error('The configured public media URL is invalid.');
  }
  const configuredProjectUrl = import.meta.env?.VITE_SUPABASE_URL;
  if (configuredProjectUrl && url.origin !== new URL(configuredProjectUrl).origin) {
    throw new Error('The public media URL does not match the configured Supabase project.');
  }
  return url.origin;
}

function isStorageReference(value) {
  return (
    /^(originals|public-media)[:/]/i.test(value) ||
    /\/storage(?:\/v1)?(?:\/|$)/i.test(value)
  );
}

export function validatePublishedAssetReferencesWithClient(value, client) {
  const origin = getPublicMediaOrigin(client);
  const visit = (item, key = '') => {
    if (typeof item === 'string') {
      if (!item) return;
      if (key === 'resumePath' && item === STATIC_RESUME_PATH) return; // bundled static file, safe to serve
      const approvedPublicPath = getPublicMediaPath(item, origin);
      if (
        (ASSET_REFERENCE_FIELDS.has(key) || isStorageReference(item)) &&
        !approvedPublicPath
      ) {
        throw new Error('Published assets must use approved public-media URLs.');
      }
      return;
    }
    if (Array.isArray(item)) {
      item.forEach((entry) => visit(entry, key));
      return;
    }
    if (item && typeof item === 'object') {
      Object.entries(item).forEach(([childKey, child]) => visit(child, childKey));
    }
  };
  visit(value);
}

function visitStrings(value, visitor) {
  if (typeof value === 'string') {
    visitor(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => visitStrings(item, visitor));
    return;
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => visitStrings(item, visitor));
  }
}

function collectPublicAssetPaths(rows) {
  const paths = new Set();
  for (const row of rows) {
    if (!row.published || typeof row.value !== 'string') continue;
    let value;
    try {
      value = JSON.parse(row.value);
    } catch {
      value = row.value;
    }
    visitStrings(value, (item) => {
      const path = getPublicMediaPath(item);
      if (path) paths.add(path);
    });
  }
  return paths;
}

async function loadPortfolioSettings(client) {
  const { data, error } = await client
    .from('site_settings')
    .select('key, value, published');
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

function validateStoragePath(path) {
  if (
    typeof path !== 'string' ||
    !path ||
    path.startsWith('/') ||
    path.split('/').some((part) => !part || part === '.' || part === '..') ||
    path.includes('\\')
  ) {
    throw new Error('The stored asset path is invalid.');
  }
}

export async function loadPendingPublicAssetCleanupWithClient(client) {
  if (!client) throw notConfiguredError();
  const { data, error } = await client
    .from(CLEANUP_QUEUE)
    .select('storage_path')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (Array.isArray(data) ? data : []).map((row) => row.storage_path);
}

async function enqueuePublicAssetCleanupWithClient(client, candidatePaths) {
  const paths = [...new Set(candidatePaths)];
  paths.forEach(validateStoragePath);
  if (!paths.length) return;
  const { error } = await client.from(CLEANUP_QUEUE).upsert(
    paths.map((storage_path) => ({ storage_path })),
    { onConflict: 'storage_path', ignoreDuplicates: true },
  );
  if (error) throw error;
}

async function processPendingPublicAssetCleanupWithClient(client) {
  const pendingPaths = await loadPendingPublicAssetCleanupWithClient(client);
  if (!pendingPaths.length) {
    return { pendingPaths: [], removedPaths: [], retainedPaths: [] };
  }

  const activePaths = collectPublicAssetPaths(await loadPortfolioSettings(client));
  const retainedPaths = pendingPaths.filter((path) => activePaths.has(path));
  const removablePaths = pendingPaths.filter((path) => !activePaths.has(path));

  if (removablePaths.length) {
    const { error } = await client.storage.from(PUBLIC_MEDIA_BUCKET).remove(removablePaths);
    if (error) throw error;
  }
  const resolvedPaths = [...retainedPaths, ...removablePaths];
  if (resolvedPaths.length) {
    const { error } = await client.from(CLEANUP_QUEUE).delete().in('storage_path', resolvedPaths);
    if (error) throw error;
  }

  return {
    pendingPaths: await loadPendingPublicAssetCleanupWithClient(client),
    removedPaths: removablePaths,
    retainedPaths,
  };
}

async function queueAndProcessPublicAssetCleanup(client, candidatePaths) {
  await enqueuePublicAssetCleanupWithClient(client, candidatePaths);
  return processPendingPublicAssetCleanupWithClient(client);
}

async function listPublicMediaObjects(client) {
  const bucket = client.storage.from(PUBLIC_MEDIA_BUCKET);
  const directories = [''];
  const objects = [];
  const pageSize = 100;

  while (directories.length) {
    const directory = directories.shift();
    let offset = 0;
    while (true) {
      const { data, error } = await bucket.list(directory, {
        limit: pageSize,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw error;
      const entries = Array.isArray(data) ? data : [];
      for (const entry of entries) {
        const path = directory ? `${directory}/${entry.name}` : entry.name;
        if (entry.id == null && entry.metadata == null) directories.push(path);
        else objects.push({ path, metadata: entry.metadata || {} });
      }
      if (entries.length < pageSize) break;
      offset += pageSize;
    }
  }
  return objects;
}

function parseSettingValue(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function countSettingAssetReferences(rows, origin) {
  const counts = new Map();
  for (const row of rows) {
    const value = parseSettingValue(row.value);
    visitStrings(value, (item) => {
      const path = getPublicMediaPath(item, origin);
      if (!path) return;
      const reference = counts.get(path) || { published: 0, draft: 0 };
      reference[row.published ? 'published' : 'draft'] += 1;
      counts.set(path, reference);
    });
  }
  return counts;
}

export async function listPublicMediaInventoryWithClient(client) {
  if (!client) throw notConfiguredError();
  const [objects, rows] = await Promise.all([
    listPublicMediaObjects(client),
    loadPortfolioSettings(client),
  ]);
  const references = countSettingAssetReferences(rows, getPublicMediaOrigin(client));
  return objects.map(({ path, metadata }) => ({
    path,
    size: Number(metadata.size) || 0,
    contentType: metadata.mimetype || metadata.contentType || '',
    publishedReferences: references.get(path)?.published || 0,
    draftReferences: references.get(path)?.draft || 0,
  }));
}

export async function movePublicMediaToPrivateWithClient(client, path) {
  if (!client) throw notConfiguredError();
  validateStoragePath(path);

  const origin = getPublicMediaOrigin(client);
  const rows = await loadPortfolioSettings(client);
  const references = countSettingAssetReferences(rows, origin).get(path);
  if (references?.published) {
    throw new Error('This public asset is referenced by published content. Unpublish or replace it first.');
  }

  const { data: file, error: downloadError } = await client.storage
    .from(PUBLIC_MEDIA_BUCKET)
    .download(path);
  if (downloadError) throw downloadError;
  const separator = path.lastIndexOf('/');
  const directory = path.slice(0, separator);
  const name = path.slice(separator + 1);
  const { data: existingFiles, error: listError } = await client.storage
    .from(ORIGINALS_BUCKET)
    .list(directory, { limit: 2, search: name });
  if (listError) throw listError;
  const originalExists = (existingFiles || []).some((entry) => entry.name === name && entry.id != null);
  const privatePath = originalExists
    ? `${directory ? `${directory}/` : ''}legacy-${crypto.randomUUID()}-${name}`
    : path;
  const { error: uploadError } = await client.storage.from(ORIGINALS_BUCKET).upload(privatePath, file, {
    cacheControl: '60',
    contentType: file.type || undefined,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  for (const row of rows.filter((item) => !item.published)) {
    const parsedValue = parseSettingValue(row.value);
    let changed = false;
    const migratedValue = await mapAssetReferences(parsedValue, (value) => {
      if (getPublicMediaPath(value, origin) !== path) return value;
      changed = true;
      return `${ORIGINALS_REFERENCE_PREFIX}${privatePath}`;
    });
    if (!changed) continue;

    const value = typeof migratedValue === 'string' ? migratedValue : JSON.stringify(migratedValue);
    const { error } = await client
      .from('site_settings')
      .update({ value })
      .eq('key', row.key)
      .eq('published', false);
    if (error) throw error;
  }

  await enqueuePublicAssetCleanupWithClient(client, [path]);
  const cleanup = await processPendingPublicAssetCleanupWithClient(client);
  return {
    path,
    privateReference: `${ORIGINALS_REFERENCE_PREFIX}${privatePath}`,
    publicRemoved: cleanup.removedPaths.includes(path),
    retainedByPublishedContent: cleanup.retainedPaths.includes(path),
    pendingPaths: cleanup.pendingPaths,
  };
}

async function copyOriginalsToPublic(client, value, copiedPaths) {
  const path = getOriginalPath(value);
  if (!path) return value;

  const { data: file, error: downloadError } = await client.storage
    .from(ORIGINALS_BUCKET)
    .download(path);
  if (downloadError) throw downloadError;

  copiedPaths.add(path);
  const { error: uploadError } = await client.storage.from(PUBLIC_MEDIA_BUCKET).upload(path, file, {
    cacheControl: '60',
    contentType: file.type || undefined,
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { data } = client.storage.from(PUBLIC_MEDIA_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error('Could not create a public URL for a published asset.');
  return data.publicUrl;
}

async function mapAssetReferences(value, mapper) {
  if (typeof value === 'string') return mapper(value);
  if (Array.isArray(value)) return Promise.all(value.map((item) => mapAssetReferences(item, mapper)));
  if (!value || typeof value !== 'object') return value;

  const entries = await Promise.all(
    Object.entries(value).map(async ([key, item]) => [key, await mapAssetReferences(item, mapper)]),
  );
  return Object.fromEntries(entries);
}

export async function resolvePortfolioAssetUrl(value, client = getSupabaseClient()) {
  const path = getOriginalPath(value);
  if (!path) return value;
  if (!client) throw notConfiguredError();

  const { data, error } = await client.storage
    .from(ORIGINALS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('Could not create a private asset preview.');
  return data.signedUrl;
}

export async function loadPublishedPortfolioContent() {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('published_sections')
      .select('value')
      .eq('key', CONTENT_KEY)
      .maybeSingle();

    if (error) {
      console.warn('Published portfolio content could not be loaded; using local content.', error);
      return null;
    }
    if (!data || typeof data.value !== 'string') return null;

    const parsed = JSON.parse(data.value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    console.warn('Published portfolio content could not be loaded; using local content.', error);
    return null;
  }
}

export async function loadPortfolioDraftWithClient(client) {
  if (!client) throw notConfiguredError();

  const { data, error } = await client
    .from('site_settings')
    .select('key, value, published, updated_at')
    .in('key', [CONTENT_KEY, DRAFT_KEY]);

  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  const row = rows.find((item) => item.key === DRAFT_KEY) || rows.find((item) => item.key === CONTENT_KEY);
  if (!row || typeof row.value !== 'string') return { content: null, published: false };
  const published = Boolean(rows.find((item) => item.key === CONTENT_KEY)?.published);
  const updatedAt = rows
    .map((item) => (typeof item.updated_at === 'string' ? item.updated_at : null))
    .filter(Boolean)
    .sort()
    .pop() || null;
  const cleanupNeeded =
    !published &&
    collectPublicAssetPaths(rows.filter((item) => item.key === CONTENT_KEY || item.key === DRAFT_KEY)).size > 0;

  let content;
  try {
    content = JSON.parse(row.value);
  } catch {
    throw new Error('Saved portfolio content is invalid JSON. Restore a valid backup before editing.');
  }
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    throw new Error('Saved portfolio content has an invalid format. Restore a valid backup before editing.');
  }

  return { content, published, cleanupNeeded, updatedAt };
}

export async function loadPortfolioDraft() {
  return loadPortfolioDraftWithClient(getSupabaseClient());
}

export async function savePortfolioDraftWithClient(client, content) {
  if (!client) throw notConfiguredError();

  const { error } = await client.from('site_settings').upsert(
    {
      key: DRAFT_KEY,
      value: JSON.stringify(content),
      published: false,
    },
    { onConflict: 'key' },
  );

  if (error) throw error;
}

export async function savePortfolioDraft(content) {
  return savePortfolioDraftWithClient(getSupabaseClient(), content);
}

/**
 * Regenerate the public resume PDF from the content that is about to be
 * published. Runs on every publish unless the owner uploaded a manual
 * resume override in the admin settings. Failures do not break publishing;
 * they surface as a warning and the resume path stays on its fallback.
 */
async function attachGeneratedResume(client, draftContent, publishedContent) {
  const draftPath = typeof draftContent?.resumePath === 'string' ? draftContent.resumePath.trim() : '';
  const isStatic = draftPath === STATIC_RESUME_PATH;
  const isGenerated = draftPath.endsWith('/public-media/portfolio/resume.pdf');
  const manualOverride = Boolean(draftPath) && !isStatic && !isGenerated;
  if (manualOverride) return { content: publishedContent, warnings: [] };

  try {
    const bytes = await buildResumePdf(publishedContent);
    const { error } = await client.storage.from(PUBLIC_MEDIA_BUCKET).upload(
      RESUME_PUBLIC_URL_PATH,
      bytes,
      { contentType: 'application/pdf', cacheControl: '60', upsert: true },
    );
    if (error) throw error;
    const { data } = client.storage.from(PUBLIC_MEDIA_BUCKET).getPublicUrl(RESUME_PUBLIC_URL_PATH);
    if (!data?.publicUrl) throw new Error('Could not create a public URL for the generated resume.');
    return { content: { ...publishedContent, resumePath: data.publicUrl }, warnings: [] };
  } catch (error) {
    return {
      content: publishedContent,
      warnings: [`The resume PDF could not be generated automatically: ${error.message}`],
    };
  }
}

export async function publishPortfolioContentWithClient(client, content) {
  if (!client) throw notConfiguredError();

  await processPendingPublicAssetCleanupWithClient(client);
  const previousPaths = collectPublicAssetPaths(await loadPortfolioSettings(client));
  const copiedPaths = new Set();
  const assetCopies = new Map();
  let published = false;
  try {
    const publishedAssetContent = await mapAssetReferences(content, (value) => {
      const path = getOriginalPath(value);
      if (!path) return value;
      if (!assetCopies.has(path)) {
        assetCopies.set(path, copyOriginalsToPublic(client, value, copiedPaths));
      }
      return assetCopies.get(path);
    });
    const resumeResult = await attachGeneratedResume(client, content, publishedAssetContent);
    const resumeWarnings = resumeResult.warnings;
    const publishedContent = resumeResult.content;
    validatePublishedAssetReferencesWithClient(publishedContent, client);
    const newPaths = collectPublicAssetPaths([
      { value: JSON.stringify(publishedContent), published: true },
    ]);
    const cleanupCandidates = [...previousPaths].filter((path) => !newPaths.has(path));
    await enqueuePublicAssetCleanupWithClient(client, cleanupCandidates);

    const { error } = await client.from('site_settings').upsert(
      {
        key: CONTENT_KEY,
        value: JSON.stringify(publishedContent),
        published: true,
      },
      { onConflict: 'key' },
    );
    if (error) throw error;
    published = true;

    const warnings = [...resumeWarnings];
    const { error: draftError } = await client.from('site_settings').upsert(
      {
        key: DRAFT_KEY,
        value: JSON.stringify(content),
        published: false,
      },
      { onConflict: 'key' },
    );
    if (draftError) {
      warnings.push(`Published content, but its private draft could not be saved: ${draftError.message}`);
    }
    try {
      const cleanup = await processPendingPublicAssetCleanupWithClient(client);
      if (cleanup.pendingPaths.length) {
        warnings.push('Some replaced public assets remain queued for cleanup.');
      }
      return { content: publishedContent, warnings, cleanupCandidates: cleanup.pendingPaths };
    } catch (cleanupError) {
      warnings.push(`Some replaced public assets could not be removed: ${cleanupError.message}`);
      return {
        content: publishedContent,
        warnings,
        cleanupCandidates,
      };
    }
  } catch (error) {
    if (!published) {
      try {
        await queueAndProcessPublicAssetCleanup(
          client,
          [...copiedPaths].filter((path) => !previousPaths.has(path)),
        );
      } catch (cleanupError) {
        throw new Error(`${error.message} Public upload cleanup also failed: ${cleanupError.message}`);
      }
    }
    throw error;
  }
}

export async function publishPortfolioContent(content) {
  const client = getSupabaseClient();
  if (!client) throw notConfiguredError();
  return publishPortfolioContentWithClient(client, content);
}

export async function unpublishPortfolioContentWithClient(client) {
  if (!client) throw notConfiguredError();

  const rows = await loadPortfolioSettings(client);
  const currentContent = rows.find((row) => row.key === CONTENT_KEY);
  const currentDraft = rows.find((row) => row.key === DRAFT_KEY);
  const candidatePaths = new Set();
  if (currentContent?.value) {
    collectPublicAssetPaths([{ ...currentContent, published: true }]).forEach((path) => candidatePaths.add(path));
  }
  if (currentDraft?.value) {
    collectPublicAssetPaths([{ ...currentDraft, published: true }]).forEach((path) => candidatePaths.add(path));
  }

  let draftContent;
  const draftSource = currentDraft?.value || currentContent?.value;
  if (draftSource) {
    try {
      draftContent = JSON.parse(draftSource);
    } catch (error) {
      throw new Error(`Could not preserve the current draft while unpublishing: ${error.message}`);
    }
  }
  const privateDraft = draftContent
    ? await mapAssetReferences(draftContent, async (value) => {
        const path = getPublicMediaPath(value);
        if (!path) return value;

        const { data: file, error: downloadError } = await client.storage
          .from(PUBLIC_MEDIA_BUCKET)
          .download(path);
        if (downloadError) throw downloadError;

        const { error: uploadError } = await client.storage.from(ORIGINALS_BUCKET).upload(path, file, {
          cacheControl: '60',
          contentType: file.type || undefined,
          upsert: true,
        });
        if (uploadError) throw uploadError;
        return `${ORIGINALS_REFERENCE_PREFIX}${path}`;
      })
    : null;

  if (privateDraft) {
    const { error: draftError } = await client.from('site_settings').upsert(
      {
        key: DRAFT_KEY,
        value: JSON.stringify(privateDraft),
        published: false,
      },
      { onConflict: 'key' },
    );
    if (draftError) throw draftError;
  }

  await enqueuePublicAssetCleanupWithClient(client, [...candidatePaths]);

  const { error } = await client
    .from('site_settings')
    .update({ published: false })
    .eq('key', CONTENT_KEY);
  if (error) throw error;

  let contentError = null;
  if (privateDraft) {
    const { error: updateError } = await client
      .from('site_settings')
      .update({ value: JSON.stringify(privateDraft), published: false })
      .eq('key', CONTENT_KEY);
    contentError = updateError;
  }

  try {
    const cleanup = await processPendingPublicAssetCleanupWithClient(client);
    return {
      cleanupError: contentError || (cleanup.pendingPaths.length
        ? new Error('Public assets remain queued for cleanup.')
        : null),
      content: privateDraft,
      cleanupCandidates: cleanup.pendingPaths,
      retainedPaths: cleanup.retainedPaths,
    };
  } catch (cleanupError) {
    return {
      cleanupError: contentError || cleanupError,
      content: privateDraft,
      cleanupCandidates: [...candidatePaths],
      retainedPaths: [],
    };
  }
}

export async function unpublishPortfolioContent() {
  const client = getSupabaseClient();
  if (!client) throw notConfiguredError();
  return unpublishPortfolioContentWithClient(client);
}

export async function savePortfolioDesignWithClient(client, settings) {
  if (!client) throw notConfiguredError();

  await processPendingPublicAssetCleanupWithClient(client);
  const previousPaths = collectPublicAssetPaths(await loadPortfolioSettings(client));
  const copiedPaths = new Set();
  const assetCopies = new Map();
  let published = false;
  try {
    const publishedSettings = await mapAssetReferences(settings, (value) => {
      const path = getOriginalPath(value);
      if (!path) return value;
      if (!assetCopies.has(path)) {
        assetCopies.set(path, copyOriginalsToPublic(client, value, copiedPaths));
      }
      return assetCopies.get(path);
    });
    validatePublishedAssetReferencesWithClient(publishedSettings, client);
    const newPaths = collectPublicAssetPaths([
      { value: JSON.stringify(publishedSettings), published: true },
    ]);
    const cleanupCandidates = [...previousPaths].filter((path) => !newPaths.has(path));
    await enqueuePublicAssetCleanupWithClient(client, cleanupCandidates);

    const rows = DESIGN_KEYS.map((key) => ({
      key,
      value:
        publishedSettings[key] && typeof publishedSettings[key] === 'object'
          ? JSON.stringify(publishedSettings[key])
          : String(publishedSettings[key] ?? ''),
      published: true,
    }));
    const { error } = await client.from('site_settings').upsert(rows, { onConflict: 'key' });
    if (error) throw error;
    published = true;

    try {
      const cleanup = await processPendingPublicAssetCleanupWithClient(client);
      return {
        settings: publishedSettings,
        cleanupError: cleanup.pendingPaths.length
          ? new Error('Public assets remain queued for cleanup.')
          : null,
        cleanupCandidates: cleanup.pendingPaths,
      };
    } catch (cleanupError) {
      return {
        settings: publishedSettings,
        cleanupError,
        cleanupCandidates,
      };
    }
  } catch (error) {
    if (!published) {
      try {
        await queueAndProcessPublicAssetCleanup(
          client,
          [...copiedPaths].filter((path) => !previousPaths.has(path)),
        );
      } catch (cleanupError) {
        throw new Error(`${error.message} Public upload cleanup also failed: ${cleanupError.message}`);
      }
    }
    throw error;
  }
}

export async function savePortfolioDesign(settings) {
  const client = getSupabaseClient();
  if (!client) throw notConfiguredError();
  return savePortfolioDesignWithClient(client, settings);
}

export async function retryPublicAssetCleanupWithClient(client, paths = []) {
  if (!client) throw notConfiguredError();
  return queueAndProcessPublicAssetCleanup(client, paths);
}

export async function retryPublicAssetCleanup(paths = []) {
  const client = getSupabaseClient();
  if (!client) throw notConfiguredError();
  return retryPublicAssetCleanupWithClient(client, paths);
}

export async function uploadPortfolioAssetWithClient(client, file, { kind = 'image' } = {}) {
  if (!client) throw notConfiguredError();
  if (!file || typeof file.type !== 'string' || typeof file.size !== 'number') {
    throw new Error('Choose a file to upload.');
  }
  const allowedTypes =
    kind === 'resume'
      ? ['application/pdf']
        : kind === 'certificate'
          ? ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
        : kind === 'font'
          ? ['font/woff2']
          : ['image/jpeg', 'image/png', 'image/webp'];
  const maximumSize =
    kind === 'resume' || (kind === 'certificate' && file.type === 'application/pdf')
        ? 10 * 1024 * 1024
        : 2 * 1024 * 1024;

  if (!allowedTypes.includes(file.type)) {
    throw new Error(
      kind === 'resume'
        ? 'Choose a PDF file.'
        : kind === 'certificate'
          ? 'Choose a PDF, JPG, PNG, or WebP file.'
        : kind === 'font'
          ? 'Choose a WOFF2 font file.'
          : 'Choose a JPG, PNG, or WebP image.',
    );
  }
  if (file.size > maximumSize) {
    throw new Error(
      kind === 'resume' || (kind === 'certificate' && file.type === 'application/pdf')
        ? 'The PDF must be 10 MB or smaller.'
        : 'The file must be 2 MB or smaller.',
    );
  }

  const extensions = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'font/woff2': 'woff2',
  };
  const extension = extensions[file.type];
  const path = `portfolio/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from(ORIGINALS_BUCKET).upload(path, file, {
    cacheControl: '60',
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;

  return `${ORIGINALS_REFERENCE_PREFIX}${path}`;
}

export async function uploadPortfolioAsset(file, options) {
  const client = getSupabaseClient();
  if (!client) throw notConfiguredError();
  return uploadPortfolioAssetWithClient(client, file, options);
}
