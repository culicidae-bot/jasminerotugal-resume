import { useSite } from '../lib/site-context.js';
import ImageSlot from './ImageSlot.jsx';
import ResumeButton from './ResumeButton.jsx';

export default function Hero() {
  const { content, design } = useSite();
  const variant = design.heroVariant;
  const image = variant === 'cover' ? content.hero.cover : content.hero.portrait;

  return (
    <section className="hero" id="home" data-hero={variant} aria-labelledby="hero-name">
      <div className="hero-inner">
        <div className="hero-copy">
          <p className="hero-eyebrow">{content.hero.eyebrow}</p>
          <h1 id="hero-name">{content.hero.name}</h1>
          <p className="hero-title">{content.hero.title}</p>
          <p className="hero-focus">{content.hero.focus}</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#projects">
              {content.ui.viewProjects}
            </a>
            <ResumeButton />
          </div>
          <p className="hero-whoami">{content.hero.whoami}</p>
        </div>
        <div className="hero-media">
          <ImageSlot image={image} kind="hero" eager />
        </div>
      </div>
    </section>
  );
}
