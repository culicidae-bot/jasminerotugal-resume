import { Link, useLocation } from 'react-router-dom';
import { sampledPath } from '../lib/urls.js';
import { useSite } from '../lib/site-context.js';

export default function Footer() {
  const { content, isSample } = useSite();
  const location = useLocation();
  const sampleTarget = isSample ? location.pathname : sampledPath(location.pathname, true);

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <p>{content.meta.siteName}</p>
          <p className="footer-note">{content.ui.footerNote}</p>
        </div>
        <nav className="footer-nav" aria-label={content.ui.footerNavigation}>
          {content.nav.map((item) => (
            <Link key={item.label} to={sampledPath(item.to, isSample)}>
              {item.label}
            </Link>
          ))}
          <a href="#top">{content.ui.backToTop}</a>
        </nav>
        <div className="footer-meta">
          <Link className="sample-switch" to={sampleTarget}>
            {isSample ? content.ui.exitSample : content.ui.startSample}
          </Link>
          <p>{content.ui.footerRights}</p>
        </div>
      </div>
    </footer>
  );
}
