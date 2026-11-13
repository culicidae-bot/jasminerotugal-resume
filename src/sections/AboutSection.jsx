import ImageSlot, { isUsableImage } from '../components/ImageSlot.jsx';
import { ExternalIcon } from '../components/Icons.jsx';
import Section from '../components/Section.jsx';
import TodoText from '../components/TodoText.jsx';
import { isSafeHttpUrl, mailtoSafeAddress } from '../lib/urls.js';
import { useSite } from '../lib/site-context.js';

export default function AboutSection({ index }) {
  const { content } = useSite();
  const section = content.sections.about;
  const labels = content.ui.aboutLabels;
  const hasImage = isUsableImage(content.about.image);
  const email = mailtoSafeAddress(content.contact.email);
  const github = isSafeHttpUrl(content.contact.github) ? content.contact.github : null;
  const linkedin = isSafeHttpUrl(content.contact.linkedin) ? content.contact.linkedin : null;
  const hasProfiles = Boolean(email || github || linkedin);

  return (
    <Section id="about" label={section.label} title={section.title} intro={section.intro} index={index}>
      <div className={`about-grid${hasImage ? ' has-media' : ''}`}>
        <div className="about-copy">
          {content.about.introduction ? (
            <p className="lead">{content.about.introduction}</p>
          ) : null}
          <div className="text-block">
            <h3>{labels.careerObjective}</h3>
            <p>{content.about.careerObjective}</p>
          </div>
          {content.about.educationSummary ? (
            <div className="text-block">
              <h3>{labels.educationBackground}</h3>
              <p>
                <TodoText value={content.about.educationSummary} />
              </p>
            </div>
          ) : null}
          <div className="text-block">
            <h3>{labels.interests}</h3>
            <ul className="hairline-list">
              {content.about.interests.map((interest) => (
                <li key={interest}>{interest}</li>
              ))}
            </ul>
          </div>
          {hasProfiles ? (
            <nav className="about-links" aria-label={content.ui.professionalLinks}>
              {email ? <a href={`mailto:${email}`}>{content.ui.contactLabels.email}: {email}</a> : null}
              {github ? (
                <a href={github} target="_blank" rel="noopener noreferrer">
                  {content.ui.contactLabels.github}<ExternalIcon />
                  <span className="visually-hidden"> ({content.ui.opensNewTab})</span>
                </a>
              ) : null}
              {linkedin ? (
                <a href={linkedin} target="_blank" rel="noopener noreferrer">
                  {content.ui.contactLabels.linkedin}<ExternalIcon />
                  <span className="visually-hidden"> ({content.ui.opensNewTab})</span>
                </a>
              ) : null}
            </nav>
          ) : null}
        </div>
        {hasImage ? (
          <div className="about-media">
            <ImageSlot image={content.about.image} kind="about" />
          </div>
        ) : null}
      </div>
    </Section>
  );
}
