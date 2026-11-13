import { useSite } from '../lib/site-context.js';

export default function Header() {
  const { content } = useSite();

  return (
    <header className="site-header site-header-minimal" id="top">
      <div className="header-inner header-inner-minimal">
        <a className="brand" href="#home" aria-label={content.hero.name || 'Home'}>
          <span className="brand-name">{content.hero.name || 'Portfolio'}</span>
          {content.hero.brandDetail ? (
            <span className="brand-detail">{content.hero.brandDetail}</span>
          ) : null}
        </a>
      </div>
    </header>
  );
}
