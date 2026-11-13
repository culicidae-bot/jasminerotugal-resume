import { useRef } from 'react';
import { useSite } from '../lib/site-context.js';
import { useFittedText } from '../lib/use-fitted-text.js';
import ResumeButton from './ResumeButton.jsx';
import { hasPublicSectionContent } from '../lib/public-sections.js';

export default function Hero() {
  const { content, design } = useSite();
  const nameRef = useRef(null);
  useFittedText(nameRef, { minSize: 8 });
  const variant = design.heroVariant;
  const heading = content.hero.name || content.hero.title || content.ui.emptySite.label;

  return (
    <section className="hero" id="home" data-hero={variant} aria-labelledby="hero-name">
      <div className="hero-inner">
        <div className="hero-copy">
          {content.hero.eyebrow ? <p className="hero-eyebrow">{content.hero.eyebrow}</p> : null}
          <h1 id="hero-name" ref={nameRef}>{heading}</h1>
          {content.hero.name && content.hero.title ? (
            <p className="hero-title">{content.hero.title}</p>
          ) : null}
          {content.hero.focus ? <p className="hero-focus">{content.hero.focus}</p> : null}
          <div className="hero-actions">
            <ResumeButton />
            {hasPublicSectionContent('projects', content) ? (
              <a className="button button-secondary" href="#projects">
                {content.ui.viewProjects}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
