import { designSettings as fallbackDesignSettings } from '../data/design.js';
import { getSupabaseClient } from './supabase.js';

const allowedFonts = ['editorial', 'modern', 'mono'];
const allowedThemes = ['dark', 'light'];
const allowedWidths = ['narrow', 'wide', 'full'];
const allowedSpacings = ['compact', 'roomy', 'spacious'];
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
  return allowedThemes.includes(next) ? next : 'dark';
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
    padding: sanitizeNumber(parsed.section_padding ?? parsed.padding, 12, 120, 24),
  };
}

function applyFontFace(fontName, fontUrl) {
  if (typeof document === 'undefined' || !fontName || !fontUrl) return;
  const existing = document.head.querySelector(`style[data-font-name="${CSS.escape(fontName)}"]`);
  if (existing) return;

  const style = document.createElement('style');
  style.dataset.fontName = fontName;
  document.head.appendChild(style);

  const fontFace = new FontFace(fontName, `url('${fontUrl}') format('woff2')`);
  fontFace.load().then(() => {
    document.fonts.add(fontFace);
    style.textContent = `@font-face { font-family: "${fontName}"; src: url('${fontUrl}') format('woff2'); }`;
  }).catch(() => {
    style.remove();
  });
}

export function applyDesignTokens(raw = fallbackDesignSettings) {
  const root = typeof document !== 'undefined' ? document.documentElement : null;
  if (!root) return normalizeDatabaseDesign(raw);

  const settings = normalizeDatabaseDesign(raw);
  const palette = settings.palette || {};

  root.style.setProperty('--color-bg', palette.background || '#121116');
  root.style.setProperty('--color-surface', palette.surface || '#1A1920');
  root.style.setProperty('--color-primary', palette.primary || '#6D3FD8');
  root.style.setProperty('--color-text', palette.text || '#ECEAF2');
  root.style.setProperty('--site-content-width', settings.contentWidth === 'full' ? '100%' : settings.contentWidth === 'narrow' ? '72rem' : '88rem');
  root.style.setProperty('--site-section-spacing', `${String(settings.padding || 24)}px`);
  root.style.setProperty('--font-scale', settings.typography.scale || 'editorial');
  root.style.setProperty('--theme-mode', settings.activePreset || 'dark');
  root.dataset.theme = sanitizeTheme(settings.activePreset);

  const fontName = typeof raw?.font_family === 'string' ? raw.font_family : null;
  const fontUrl = typeof raw?.font_url === 'string' ? raw.font_url : null;
  if (fontName && fontUrl) {
    applyFontFace(fontName, fontUrl);
    root.style.setProperty('--font-family', fontName);
  } else {
    root.style.setProperty('--font-family', settings.typography.scale === 'mono' ? 'ui-monospace, SFMono-Regular, monospace' : 'Georgia, "Times New Roman", serif');
  }

  return settings;
}

export async function loadDesignSettings() {
  const supabase = getSupabaseClient();
  if (!supabase) return fallbackDesignSettings;

  try {
    const { data, error } = await supabase.from('site_settings').select('key, value').eq('published', true);
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
