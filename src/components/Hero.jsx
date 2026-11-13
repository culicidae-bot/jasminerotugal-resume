import { useSite } from '../lib/site-context.js';
import ResumeButton from './ResumeButton.jsx';

export default function Hero() {
  const { content, design } = useSite();

  return (
    <section className="hero" id="home" data-hero={design.heroVariant} aria-labelledby="hero-name">
      <div className="hero-inner">
        <div className="hero-copy">
          {content.hero.eyebrow ? <p className="hero-eyebrow">{content.hero.eyebrow}</p> : null}
          <h1 id="hero-name">{content.hero.name || content.hero.title || content.ui.emptySite.label}</h1>
          {content.hero.title ? <p className="hero-title">{content.hero.title}</p> : null}
          {content.hero.focus ? <p className="hero-focus">{content.hero.focus}</p> : null}
          <div className="hero-actions">
            <a className="button button-primary" href="#about">
              {content.ui.viewProfile}
            </a>
            <ResumeButton />
          </div>
        </div>
      </div>
    </section>
  );
}
