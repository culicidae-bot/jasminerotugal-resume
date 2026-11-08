import { Link, useLocation } from 'react-router-dom';
import { sampledPath } from '../lib/urls.js';
import { useSite } from '../lib/site-context.js';
import ThemeToggle from './ThemeToggle.jsx';

export default function Header() {
  const { content, isSample } = useSite();
  const location = useLocation();

  return (
    <header className="site-header" id="top">
      <div className="header-inner">
        <Link className="brand" to={sampledPath('/', isSample)}>
          <span className="brand-name">{content.meta.siteName}</span>
          <span className="brand-detail">{content.ui.brandDetail}</span>
        </Link>
        <nav className="primary-nav" aria-label={content.ui.primaryNavigation}>
          {content.nav.map((item) => {
            const active =
              location.pathname === '/certificates' && item.to === '/certificates';
            return (
              <Link
                key={item.label}
                to={sampledPath(item.to, isSample)}
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
