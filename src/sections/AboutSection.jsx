import ImageSlot from '../components/ImageSlot.jsx';
import Section from '../components/Section.jsx';
import { useSite } from '../lib/site-context.js';

export default function AboutSection({ index }) {
  const { content } = useSite();
  const section = content.sections.about;
  const labels = content.ui.aboutLabels;

  return (
    <Section id="about" label={section.label} title={section.title} intro={section.intro} index={index}>
      <div className="about-grid">
        <div className="about-copy">
          <p className="lead">{content.about.introduction}</p>
          <div className="text-block">
            <h3>{labels.careerObjective}</h3>
            <p>{content.about.careerObjective}</p>
          </div>
          <div className="text-block">
            <h3>{labels.educationBackground}</h3>
            <p>{content.about.educationSummary}</p>
          </div>
          <div className="text-block">
            <h3>{labels.interests}</h3>
            <ul className="hairline-list">
              {content.about.interests.map((interest) => (
                <li key={interest}>{interest}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="about-media">
          <ImageSlot image={content.about.image} kind="about" />
        </div>
      </div>
    </Section>
  );
}
