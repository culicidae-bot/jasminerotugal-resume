import { useSite } from '../lib/site-context.js';
import ImageSlot, { isUsableImage } from './ImageSlot.jsx';
import ResumeButton from './ResumeButton.jsx';

export default function Hero() {
  const { content, design } = useSite();
  const variant = design.heroVariant;
  const image = variant === 'cover' ? content.hero.cover : content.hero.portrait;
  const hasImage = isUsableImage(image);

  return (
    <section className="hero" id="home" data-hero={variant} aria-labelledby="hero-name">
      <div className={`hero-inner${hasImage ? ' hero-inner-with-media' : ''}`}>
        <div className="hero-copy">
          <p className="hero-eyebrow">{content.hero.eyebrow}</p>
          <h1 id="hero-name">{content.hero.name}</h1>
          <p className="hero-title">{content.hero.title}</p>
          <p className="hero-focus">{content.hero.focus}</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#about">
              {content.ui.viewProfile}
            </a>
            <ResumeButton />
          </div>
        </div>
        {hasImage ? (
          <div className="hero-media">
            <ImageSlot image={image} kind="hero" eager />
          </div>
        ) : null}
      </div>
    </section>
  );
}
