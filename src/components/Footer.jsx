import { useSite } from '../lib/site-context.js';
import { isSafeHttpUrl, mailtoSafeAddress } from '../lib/urls.js';
import { ExternalIcon } from './Icons.jsx';

export default function Footer() {
  const { content } = useSite();
  const email = mailtoSafeAddress(content.contact.email);
  const github = isSafeHttpUrl(content.contact.github) ? content.contact.github : null;
  const linkedin = isSafeHttpUrl(content.contact.linkedin) ? content.contact.linkedin : null;
  const hasProfessionalLinks = Boolean(email || github || linkedin);
  const hasBrand = Boolean(content.hero.name || content.hero.title);

  return (
    <footer className="site-footer">
      <div className="footer-inner footer-inner-minimal">
        {hasBrand ? (
          <div className="footer-brand">
            <p className="footer-name">{content.hero.name}</p>
            <p className="footer-title">{content.hero.title}</p>
          </div>
        ) : null}
        {hasProfessionalLinks ? (
          <div className="footer-links">
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
          </div>
        ) : null}
        <a className="footer-back-to-top" href="#top">{content.ui.backToTop}</a>
      </div>
    </footer>
  );
}
