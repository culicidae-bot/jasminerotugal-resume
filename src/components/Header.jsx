import { Link, useLocation } from 'react-router-dom';
import { useSite } from '../lib/site-context.js';
import ThemeToggle from './ThemeToggle.jsx';
import { isPublicNavigationItem } from '../lib/public-sections.js';

export default function Header() {
  const { content } = useSite();
  const location = useLocation();

  return (
    <header className="site-header" id="top">
      <div className="header-inner">
        <Link className="brand" to="/">
          <span className="brand-name">{content.meta.siteName}</span>
          <span className="brand-detail">{content.ui.brandDetail}</span>
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
