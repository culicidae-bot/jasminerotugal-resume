import {
  designSettings as fallbackDesignSettings,
  presets,
  resolvePresetColors,
} from '../data/design.js';
import { getSupabaseClient } from './supabase.js';

const allowedFonts = ['editorial', 'modern', 'mono'];
const allowedThemes = ['graphite-violet', 'midnight', 'ivory-light'];
const allowedWidths = ['narrow', 'standard', 'wide'];
const allowedSpacings = ['compact', 'roomy', 'airy'];
const databaseDesignKeys = [
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
const clampValue = (value, min, max) => Math.min(Math.max(Number(value) || 0, min), max);

export function sanitizeHex(value, fallback = '#000000') {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim();
  if (!/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(normalized)) return fallback;
  return normalized.length === 4 ? `#${normalized.slice(1).split('').map((char) => char + char).join('')}`.toUpperCase() : normalized.toUpperCase();
}

export function sanitizeFont(value) {
  const next = String(value ?? '').toLowerCase();
  return allowedFonts.includes(next) ? next : 'editorial';
}

export function sanitizeTheme(value) {
  const next = String(value ?? '').toLowerCase();
  return allowedThemes.includes(next) ? next : fallbackDesignSettings.activePreset;
}

export function sanitizeNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return clampValue(number, min, max);
}

function parseSetting(value) {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    try {
      const parsed = JSON.parse(trimmed);
      return parsed;
    } catch {
      return trimmed;
    }
  }
  return value;
}

export function normalizeDatabaseDesign(raw = {}) {
  const source = raw || {};
  const settings = { ...fallbackDesignSettings };
  const parsed = Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, parseSetting(value)]),
  );

  settings.activePreset = sanitizeTheme(parsed.theme_mode ?? parsed.active_preset ?? settings.activePreset);
  settings.typography = {
    ...settings.typography,
    scale: sanitizeFont(parsed.font_scale ?? parsed.typography_scale ?? settings.typography.scale),
  };
  settings.contentWidth = allowedWidths.includes(String(parsed.content_width ?? ''))
    ? String(parsed.content_width)
    : settings.contentWidth;
  settings.sectionSpacing = allowedSpacings.includes(String(parsed.section_spacing ?? ''))
    ? String(parsed.section_spacing)
    : settings.sectionSpacing;
  settings.heroVariant = ['split', 'centered', 'cover'].includes(String(parsed.hero_variant ?? ''))
    ? String(parsed.hero_variant)
    : settings.heroVariant;

  const background = sanitizeHex(parsed.background_color, '#121116');
  const surface = sanitizeHex(parsed.surface_color, '#1A1920');
  const primary = sanitizeHex(parsed.primary_color, '#6D3FD8');
  const text = sanitizeHex(parsed.text_color, '#ECEAF2');

  return {
    ...settings,
    palette: {
      background,
      surface,
      primary,
      text,
    },
    padding: sanitizeNumber(parsed.section_padding ?? parsed.padding, 40, 160, 88),
    fontUrl: sanitizeFontUrl(parsed.font_url),
  };
}

function sanitizeFontUrl(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = new URL(value);
    const configuredOrigin = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
    if (
      url.protocol !== 'https:' ||
      !configuredOrigin ||
      url.origin !== new URL(configuredOrigin).origin ||
      !url.pathname.startsWith('/storage/v1/object/public/public-media/portfolio/')
    ) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

async function applyUploadedFont(fontUrl) {
  if (typeof document === 'undefined' || !fontUrl || typeof FontFace === 'undefined') return;
  if (document.fonts.check('16px PortfolioUploaded')) return;

  try {
    const fontFace = new FontFace('PortfolioUploaded', `url(${JSON.stringify(fontUrl)})`);
    const loadedFont = await fontFace.load();
    document.fonts.add(loadedFont);
  } catch {
    return;
  }
}

function normalizedDesign(raw) {
  if (raw?.palette && raw?.activePreset && raw?.typography) return raw;
  return normalizeDatabaseDesign(raw);
}

function storedTheme() {
  try {
    const saved = window.localStorage.getItem('jasmine-theme');
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch {
    return null;
  }
}

export function applyDesignTokens(raw = fallbackDesignSettings, requestedTheme) {
  const root = typeof document !== 'undefined' ? document.documentElement : null;
  if (!root) return normalizedDesign(raw);

  const settings = normalizedDesign(raw);
  const savedTheme = storedTheme();
  const theme = requestedTheme === 'light' || requestedTheme === 'dark'
    ? requestedTheme
    : savedTheme || (settings.activePreset === 'ivory-light' ? 'light' : 'dark');
  const activeDarkPreset = presets[settings.activePreset]?.mode === 'dark'
    ? settings.activePreset
    : fallbackDesignSettings.activePreset;
  const activePreset = theme === 'light'
    ? settings.lightPreset
    : activeDarkPreset;
  const colors = resolvePresetColors(activePreset).colors;
  const customPalette = theme === 'dark' && presets[settings.activePreset]?.mode === 'dark'
    ? settings.palette
    : {};

  root.style.setProperty('--color-bg', customPalette.background || colors.bg);
  root.style.setProperty('--color-surface', customPalette.surface || colors.surface);
  root.style.setProperty('--color-raised', colors.raised);
  root.style.setProperty('--color-border', colors.border);
  root.style.setProperty('--color-primary', customPalette.primary || colors.primary);
  root.style.setProperty('--color-on-primary', colors.onPrimary);
  root.style.setProperty('--color-text', customPalette.text || colors.text);
  root.style.setProperty('--color-muted', colors.muted);
  root.style.setProperty('--color-link', colors.link);
  root.style.setProperty('--color-success', colors.success);
  root.style.setProperty('--color-warning', colors.warning);
  root.style.setProperty('--color-error', colors.error);
  root.style.setProperty('--site-content-width', settings.contentWidth === 'full' ? '100%' : settings.contentWidth === 'narrow' ? '72rem' : '88rem');
  const spacingMultiplier = settings.sectionSpacing === 'compact' ? 0.75 : settings.sectionSpacing === 'airy' ? 1.3 : 1;
  root.style.setProperty('--site-section-spacing', `${String(Math.min(160, Math.max(40, settings.padding * spacingMultiplier)))}px`);
  root.style.setProperty('--font-scale', settings.typography.scale || 'editorial');
  root.style.setProperty('--theme-mode', theme);
  root.dataset.theme = theme;

  const fontFamily = settings.fontUrl
    ? '"PortfolioUploaded", Georgia, "Times New Roman", serif'
    : settings.typography.scale === 'modern'
      ? 'ui-sans-serif, system-ui, sans-serif'
      : settings.typography.scale === 'mono'
        ? 'ui-monospace, SFMono-Regular, monospace'
        : '"Iowan Old Style", Georgia, "Times New Roman", serif';
  root.style.setProperty('--font-serif', fontFamily);
  root.style.setProperty('--font-sans', 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif');
  if (settings.fontUrl) void applyUploadedFont(settings.fontUrl);

  return settings;
}

export async function loadDesignSettings() {
  const supabase = getSupabaseClient();
  if (!supabase) return fallbackDesignSettings;

  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value')
      .eq('published', true)
      .in('key', databaseDesignKeys);
    if (error || !Array.isArray(data)) return fallbackDesignSettings;

    const map = {};
    for (const row of data) {
      if (row && typeof row.key === 'string') {
        map[row.key] = row.value;
      }
    }

    return normalizeDatabaseDesign(map);
  } catch {
    return fallbackDesignSettings;
  }
}
