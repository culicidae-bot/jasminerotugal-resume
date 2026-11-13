import { Link } from 'react-router-dom';
import { useSite } from '../lib/site-context.js';
import { isPublicNavigationItem } from '../lib/public-sections.js';
import { isSafeHttpUrl, mailtoSafeAddress } from '../lib/urls.js';
import { ExternalIcon } from './Icons.jsx';

export default function Footer() {
  const { content } = useSite();
  const email = mailtoSafeAddress(content.contact.email);
  const github = isSafeHttpUrl(content.contact.github) ? content.contact.github : null;
  const linkedin = isSafeHttpUrl(content.contact.linkedin) ? content.contact.linkedin : null;
  const hasProfessionalLinks = Boolean(email || github || linkedin);

  return (
    <footer className="site-footer">
      <div className={`footer-inner${hasProfessionalLinks ? '' : ' footer-inner-simple'}`}>
        <div className="footer-brand">
          <p className="footer-name">{content.hero.name}</p>
          <p className="footer-title">{content.hero.title}</p>
        </div>
        <nav className="footer-nav" aria-label={content.ui.footerNavigation}>
          {content.nav.filter((item) => isPublicNavigationItem(item, content)).map((item) => (
            <Link key={item.label} to={item.to}>
              {item.label}
            </Link>
          ))}
          <a href="#top">{content.ui.backToTop}</a>
        </nav>
        {hasProfessionalLinks ? (
          <nav className="footer-links" aria-label={content.ui.professionalLinks}>
            {email ? <a href={`mailto:${email}`}>{email}</a> : null}
            {github ? (
              <a href={github} target="_blank" rel="noopener noreferrer">
                {content.contact.githubLabel}
                <ExternalIcon />
                <span className="visually-hidden"> ({content.ui.opensNewTab})</span>
              </a>
            ) : null}
            {linkedin ? (
              <a href={linkedin} target="_blank" rel="noopener noreferrer">
                {content.contact.linkedinLabel}
                <ExternalIcon />
                <span className="visually-hidden"> ({content.ui.opensNewTab})</span>
              </a>
            ) : null}
          </nav>
        ) : null}
      </div>
    </footer>
  );
}
