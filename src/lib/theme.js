export function readTheme(fallback = 'dark') {
  try {
    const saved = window.localStorage.getItem('portfolio-theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch (error) {
    return fallback === 'light' ? 'light' : 'dark';
  }
  return fallback === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme) {
  const nextTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', nextTheme);
  try {
    window.localStorage.setItem('portfolio-theme', nextTheme);
  } catch (error) {
    return;
  }
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
