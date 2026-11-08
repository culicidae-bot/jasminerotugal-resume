import { Link } from 'react-router-dom';
import { useSite } from '../lib/site-context.js';
import { isPublicNavigationItem } from '../lib/public-sections.js';

export default function Footer() {
  const { content } = useSite();
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <p>{content.meta.siteName}</p>
          <p className="footer-note">{content.ui.footerNote}</p>
        </div>
        <nav className="footer-nav" aria-label={content.ui.footerNavigation}>
          {content.nav.filter((item) => isPublicNavigationItem(item, content)).map((item) => (
            <Link key={item.label} to={item.to}>
              {item.label}
            </Link>
          ))}
          <a href="#top">{content.ui.backToTop}</a>
        </nav>
        <div className="footer-meta">
          <p>{content.ui.footerRights}</p>
        </div>
      </div>
    </footer>
  );
}
