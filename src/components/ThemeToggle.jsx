import { useEffect, useState } from 'react';
import { applyTheme, readTheme, syncThemeColor } from '../lib/theme.js';
import { useSite } from '../lib/site-context.js';
import { applyDesignTokens } from '../lib/design-settings.js';

export default function ThemeToggle() {
  const { content, design } = useSite();
  const defaultTheme = design.activePreset === 'ivory-light' ? 'light' : 'dark';
  const [theme, setTheme] = useState(() => readTheme(defaultTheme));

  useEffect(() => {
    setTheme(readTheme(defaultTheme));
  }, [defaultTheme]);

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    applyDesignTokens(design, nextTheme);
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
