import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSite } from '../lib/site-context.js';
import ThemeToggle from './ThemeToggle.jsx';
import { isPublicNavigationItem } from '../lib/public-sections.js';

export default function Header() {
  const { content } = useSite();
  const location = useLocation();
  const headerRef = useRef(null);

  // Keep hash offsets correct when the navigation wraps to more rows on
  // narrow screens or when more sections become available.
  useEffect(() => {
    const node = headerRef.current;
    if (!node) return undefined;

    function updateOffset() {
      const height = Math.ceil(node.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--header-offset', `${height}px`);
    }

    updateOffset();
    window.addEventListener('resize', updateOffset);
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateOffset) : null;
    observer?.observe(node);

    return () => {
      window.removeEventListener('resize', updateOffset);
      observer?.disconnect();
    };
  }, [content.nav]);

  return (
    <header className="site-header" id="top" ref={headerRef}>
      <div className="header-inner">
        <Link className="brand" to="/">
          <span className="brand-name">{content.hero.name || 'Portfolio'}</span>
          {(content.hero.brandDetail || content.ui.brandDetail) ? (
            <span className="brand-detail">{content.hero.brandDetail || content.ui.brandDetail}</span>
          ) : null}
        </Link>
        <nav className="primary-nav" aria-label={content.ui.primaryNavigation}>
          {content.nav.filter((item) => isPublicNavigationItem(item, content)).map((item) => {
            const active =
              location.pathname === '/certificates' && item.to === '/certificates';
            return (
              <Link
                key={item.label}
                to={item.to}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
