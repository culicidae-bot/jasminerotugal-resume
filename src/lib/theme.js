export function readTheme(fallback = 'dark') {
  return fallback === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme) {
  const nextTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', nextTheme);
}

export function syncThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const background = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue('--color-bg')
    .trim();
  if (background) meta.setAttribute('content', background);
}
