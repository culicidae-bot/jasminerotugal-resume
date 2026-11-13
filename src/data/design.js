import { contrastRatio, normalizeHex } from '../lib/contrast.js';

export const presets = {
  'graphite-violet': {
    id: 'graphite-violet',
    name: 'Graphite Violet',
    mode: 'dark',
    colors: {
      bg: '#0E1116',
      surface: '#161C24',
      raised: '#1E2530',
      border: '#2A3140',
      text: '#E8EEF5',
      muted: '#A5AEBB',
      dim: '#7F8996',
      primary: '#9B83F5',
      onPrimary: '#0E1116',
      link: '#C9BFFA',
      success: '#5BC48F',
      warning: '#E0B04F',
      error: '#F08A8A',
      inverseBg: '#E8EEF5',
      inverseText: '#0E1116',
      inverseSoft: '#3A434E',
      bandSoft: '#171E27',
    },
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    mode: 'dark',
    colors: {
      bg: '#0B1120',
      surface: '#121A2E',
      raised: '#1A2438',
      border: '#273450',
      text: '#E8EEF5',
      muted: '#A5AEBB',
      dim: '#7F8996',
      primary: '#9B83F5',
      onPrimary: '#0E1116',
      link: '#C9BFFA',
      success: '#5BC48F',
      warning: '#E0B04F',
      error: '#F08A8A',
      inverseBg: '#E8EEF5',
      inverseText: '#0E1116',
      inverseSoft: '#3A434E',
      bandSoft: '#171E27',
    },
  },
  'ivory-light': {
    id: 'ivory-light',
    name: 'Ivory Light',
    mode: 'light',
    colors: {
      bg: '#F7F5F0',
      surface: '#F0EEE8',
      raised: '#E9E6DE',
      border: '#D8D4C9',
      text: '#14121C',
      muted: '#5E5A6B',
      dim: '#686372',
      primary: '#5B3FC4',
      onPrimary: '#FFFFFF',
      link: '#5B3FC4',
      success: '#1F7A4F',
      warning: '#8A6400',
      error: '#B3261E',
      inverseBg: '#14121C',
      inverseText: '#F7F5F0',
      inverseSoft: '#9B97A5',
      bandSoft: '#DCD9F2',
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
    scale: 'modern',
  },
  heroVariant: 'split',
  contentWidth: 'standard',
  sectionSpacing: 'compact',
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
  background: ['text', 'muted', 'dim'],
  surface: ['text', 'muted', 'dim'],
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
    `--color-dim: ${colors.dim};`,
    `--color-primary: ${colors.primary};`,
    `--color-on-primary: ${colors.onPrimary};`,
    `--color-link: ${colors.link};`,
    `--color-success: ${colors.success};`,
    `--color-warning: ${colors.warning};`,
    `--color-error: ${colors.error};`,
    `--color-inverse-bg: ${colors.inverseBg};`,
    `--color-inverse-text: ${colors.inverseText};`,
    `--color-inverse-soft: ${colors.inverseSoft};`,
    `--color-band-soft: ${colors.bandSoft};`,
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
