import { useSite } from '../lib/site-context.js';
import ImageSlot, { isUsableImage } from './ImageSlot.jsx';
import ResumeButton from './ResumeButton.jsx';
import { hasPublicSectionContent } from '../lib/public-sections.js';

export default function Hero() {
  const { content, design } = useSite();
  const variant = design.heroVariant;
  const image = variant === 'cover'
    ? content.hero.cover || content.hero.portrait
    : content.hero.portrait;
  const hasImage = isUsableImage(image);
  const initials = String(content.hero.name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase();

  return (
    <section className="hero" id="home" data-hero={variant} aria-labelledby="hero-name">
      <div className="hero-inner hero-inner-with-media">
        <div className="hero-copy">
          {content.hero.eyebrow ? <p className="hero-eyebrow">{content.hero.eyebrow}</p> : null}
          <h1 id="hero-name">{content.hero.name}</h1>
          <p className="hero-title">{content.hero.title}</p>
          <p className="hero-focus">{content.hero.focus}</p>
          <div className="hero-actions">
            <ResumeButton />
            {hasPublicSectionContent('projects', content) ? (
              <a className="button button-secondary" href="#projects">
                {content.ui.viewProjects}
              </a>
            ) : null}
          </div>
        </div>
        <div className={`hero-media${hasImage ? '' : ' hero-media-placeholder'}`}>
          {hasImage ? (
            <ImageSlot image={image} kind="hero" eager />
          ) : (
            <div className="hero-portrait-placeholder" role="img" aria-label={content.ui.portraitPlaceholder}>
              <span className="portrait-placeholder-monogram" aria-hidden="true">{initials}</span>
              <span className="portrait-placeholder-label">{content.ui.portraitPlaceholder}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
