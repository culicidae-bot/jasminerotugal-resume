import ImageSlot, { isUsableImage } from '../components/ImageSlot.jsx';
import Section from '../components/Section.jsx';
import TodoText from '../components/TodoText.jsx';
import { useSite } from '../lib/site-context.js';

export default function AboutSection({ index }) {
  const { content } = useSite();
  const section = content.sections.about;
  const labels = content.ui.aboutLabels;
  const hasImage = isUsableImage(content.about.image);

  return (
    <Section id="about" label={section.label} title={section.title} intro={section.intro} index={index}>
      <div className={`about-grid${hasImage ? ' has-media' : ''}`}>
        <div className="about-copy">
          {content.about.introduction ? <p className="lead">{content.about.introduction}</p> : null}
          {content.about.careerObjective ? (
            <div className="text-block">
              <h3>{labels.careerObjective}</h3>
              <p>{content.about.careerObjective}</p>
            </div>
          ) : null}
          {content.about.educationSummary ? (
            <div className="text-block">
              <h3>{labels.educationBackground}</h3>
              <p><TodoText value={content.about.educationSummary} /></p>
            </div>
          ) : null}
          {content.about.interests?.length ? (
            <div className="text-block">
              <h3>{labels.interests}</h3>
              <ul className="hairline-list">
                {content.about.interests.map((interest) => <li key={interest}>{interest}</li>)}
              </ul>
            </div>
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
