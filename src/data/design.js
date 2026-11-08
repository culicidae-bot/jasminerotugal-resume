import { contrastRatio, normalizeHex } from '../lib/contrast.js';

export const presets = {
  'graphite-violet': {
    id: 'graphite-violet',
    name: 'Graphite Violet',
    mode: 'dark',
    colors: {
      bg: '#121116',
      surface: '#1A1920',
      raised: '#23212C',
      border: '#34313F',
      text: '#ECEAF2',
      muted: '#A9A6BA',
      primary: '#6D3FD8',
      onPrimary: '#FFFFFF',
      link: '#BBA6FF',
      success: '#5BC48F',
      warning: '#E0B04F',
      error: '#F08A8A',
    },
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    mode: 'dark',
    colors: {
      bg: '#0E1116',
      surface: '#161C24',
      raised: '#1E2632',
      border: '#303B4A',
      text: '#E8EEF5',
      muted: '#A7B4C4',
      primary: '#4058B7',
      onPrimary: '#FFFFFF',
      link: '#A9C7FF',
      success: '#5BC48F',
      warning: '#E0B04F',
      error: '#F08A8A',
    },
  },
  'ivory-light': {
    id: 'ivory-light',
    name: 'Ivory Light',
    mode: 'light',
    colors: {
      bg: '#FBFAFD',
      surface: '#FFFFFF',
      raised: '#F3F0F8',
      border: '#DAD5E6',
      text: '#1A1823',
      muted: '#5B5870',
      primary: '#5B2FC0',
      onPrimary: '#FFFFFF',
      link: '#5B2FC0',
      success: '#1F7A4F',
      warning: '#8A6400',
      error: '#B3261E',
    },
  },
};

export const designSettings = {
  activePreset: 'graphite-violet',
  lightPreset: 'ivory-light',
  colorOverrides: {
    primary: null,
    background: null,
    surface: null,
  },
  typography: {
    scale: 'editorial',
  },
  heroVariant: 'split',
  contentWidth: 'wide',
  sectionSpacing: 'roomy',
  sectionOrder: [
    'hero',
    'about',
    'skills',
    'certificates',
    'eligibility',
    'experience',
    'projects',
    'education',
    'security',
    'contact',
  ],
  sectionVisibility: {
    hero: true,
    about: true,
    skills: true,
    certificates: true,
    eligibility: true,
    experience: true,
    projects: true,
    education: true,
    security: true,
    contact: true,
  },
  skillsLayout: 'rows',
  projectsLayout: 'stacked',
  certificatesLayout: 'table',
  cornerRadius: 'small',
  imageFrameStyle: 'hairline',
  borderStyle: 'hairline',
};

const overrideChecks = {
  primary: ['onPrimary'],
  background: ['text', 'muted'],
  surface: ['text', 'muted'],
};

export function resolvePresetColors(presetId, overrides = designSettings.colorOverrides) {
  const preset = presets[presetId] || presets[designSettings.activePreset];
  const colors = { ...preset.colors };
  const blocked = [];

  Object.entries(overrideChecks).forEach(([token, contrastAgainst]) => {
    const rawValue = overrides[token];
    if (rawValue === null || rawValue === undefined || rawValue === '') return;
    const value = normalizeHex(rawValue);
    if (!value) {
      blocked.push(token);
      return;
    }
    const passes = contrastAgainst.every((against) => {
      const ratio = contrastRatio(value, colors[against]);
      return ratio !== null && ratio >= 4.5;
    });
    if (!passes) {
      blocked.push(token);
      return;
    }
    colors[token] = value;
  });

  return { colors, blocked };
}

function tokenBlock(colors) {
  return [
    `--color-bg: ${colors.bg};`,
    `--color-surface: ${colors.surface};`,
    `--color-raised: ${colors.raised};`,
    `--color-border: ${colors.border};`,
    `--color-text: ${colors.text};`,
    `--color-muted: ${colors.muted};`,
    `--color-primary: ${colors.primary};`,
    `--color-on-primary: ${colors.onPrimary};`,
    `--color-link: ${colors.link};`,
    `--color-success: ${colors.success};`,
    `--color-warning: ${colors.warning};`,
    `--color-error: ${colors.error};`,
  ].join('\n  ');
}

export function buildThemeCss() {
  const active = resolvePresetColors(designSettings.activePreset);
  const light = resolvePresetColors(designSettings.lightPreset);
  const graphite = resolvePresetColors('graphite-violet');
  const midnight = resolvePresetColors('midnight');
  const ivory = resolvePresetColors('ivory-light');

  return `:root {
  ${tokenBlock(active.colors)}
}

:root[data-theme="dark"] {
  ${tokenBlock(active.colors)}
}

:root[data-theme="light"] {
  ${tokenBlock(light.colors)}
}

:root[data-theme="graphite-violet"] {
  ${tokenBlock(graphite.colors)}
}

:root[data-theme="midnight"] {
  ${tokenBlock(midnight.colors)}
}

:root[data-theme="ivory-light"] {
  ${tokenBlock(ivory.colors)}
}
`;
}
