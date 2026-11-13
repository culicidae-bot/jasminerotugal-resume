import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSite } from '../lib/site-context.js';
import ThemeToggle from './ThemeToggle.jsx';

export default function Header() {
  const { content } = useSite();
  const headerRef = useRef(null);

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
  }, []);

  return (
    <header className="site-header" id="top" ref={headerRef}>
      <div className="header-inner header-inner-minimal">
        <Link className="brand" to="/" aria-label={content.hero.name || 'Home'}>
          <span className="brand-name">{content.hero.name || 'Portfolio'}</span>
          {content.hero.brandDetail ? (
            <span className="brand-detail">{content.hero.brandDetail}</span>
          ) : null}
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
