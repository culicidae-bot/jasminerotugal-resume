import { getSupabaseClient } from './supabase.js';

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
];
const PUBLIC_CONTENT_KEYS = [
  'meta',
  'hero',
  'sections',
  'about',
  'skills',
  'certificateTypes',
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

function mergeContent(base, override) {
  if (Array.isArray(base)) return Array.isArray(override) ? override : base;
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
  const result = { ...base };
  for (const key of PUBLIC_CONTENT_KEYS) {
    if (
      Object.prototype.hasOwnProperty.call(base, key) &&
      Object.prototype.hasOwnProperty.call(savedContent, key)
    ) {
      result[key] = mergeContent(base[key], savedContent[key]);
    }
  }
  return result;
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

export async function loadPortfolioDraft() {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { data, error } = await client
    .from('site_settings')
    .select('key, value, published')
    .in('key', [CONTENT_KEY, DRAFT_KEY]);

  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  const row = rows.find((item) => item.key === DRAFT_KEY) || rows.find((item) => item.key === CONTENT_KEY);
  if (!row || typeof row.value !== 'string') return { content: null, published: false };

  try {
    const content = JSON.parse(row.value);
    return {
      content: content && typeof content === 'object' && !Array.isArray(content) ? content : null,
      published: Boolean(row.published) && row.key === CONTENT_KEY,
    };
  } catch {
    return { content: null, published: Boolean(row.published) && row.key === CONTENT_KEY };
  }
}

export async function savePortfolioDraft(content) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

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

export async function publishPortfolioContent(content) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { error } = await client.from('site_settings').upsert(
    {
      key: CONTENT_KEY,
      value: JSON.stringify(content),
      published: true,
    },
    { onConflict: 'key' },
  );
  if (error) throw error;

  const { error: draftError } = await client.from('site_settings').delete().eq('key', DRAFT_KEY);
  if (draftError) throw draftError;
}

export async function savePortfolioDesign(settings) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const rows = DESIGN_KEYS.map((key) => ({
    key,
    value: String(settings[key] ?? ''),
    published: true,
  }));
  const { error } = await client.from('site_settings').upsert(rows, { onConflict: 'key' });
  if (error) throw error;
}

export async function uploadPortfolioAsset(file, { kind = 'image' } = {}) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

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
      kind === 'resume' ? 'The PDF must be 10 MB or smaller.' : 'The file must be 2 MB or smaller.',
    );
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const path = `portfolio/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from('public-media').upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;

  const { data } = client.storage.from('public-media').getPublicUrl(path);
  return data.publicUrl;
}
