import { useState } from 'react';
import { applyTheme, readTheme, syncThemeColor } from '../lib/theme.js';
import { useSite } from '../lib/site-context.js';

export default function ThemeToggle() {
  const { content } = useSite();
  const [theme, setTheme] = useState(() => readTheme());

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    setTheme(nextTheme);
    syncThemeColor();
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? content.ui.themeToLight : content.ui.themeToDark}
    >
      {theme === 'dark' ? content.ui.themeLightShort : content.ui.themeDarkShort}
    </button>
  );
}
