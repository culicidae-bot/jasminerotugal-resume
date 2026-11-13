import ImageSlot, { isUsableImage } from '../components/ImageSlot.jsx';
import { ExternalIcon } from '../components/Icons.jsx';
import Section from '../components/Section.jsx';
import TodoText from '../components/TodoText.jsx';
import { isSafeHttpUrl, mailtoSafeAddress } from '../lib/urls.js';
import { useSite } from '../lib/site-context.js';
import { isTodo } from '../lib/format.js';

function educationLine(value) {
  return typeof value === 'string' && value.trim() && !isTodo(value) ? value : null;
}

export default function AboutSection({ index }) {
  const { content } = useSite();
  const section = content.sections.about;
  const labels = content.ui.aboutLabels;
  const aboutImage = isUsableImage(content.about.image)
    ? content.about.image
    : isUsableImage(content.hero?.portrait)
      ? content.hero.portrait
      : null;
  const hasImage = Boolean(aboutImage);
  const email = mailtoSafeAddress(content.contact.email);
  const github = isSafeHttpUrl(content.contact.github) ? content.contact.github : null;
  const linkedin = isSafeHttpUrl(content.contact.linkedin) ? content.contact.linkedin : null;
  const hasProfiles = Boolean(email || github || linkedin);

  const tertiary = content.education?.tertiary || {};
  const school = educationLine(tertiary.institution);
  const course = educationLine(tertiary.course);
  const year = educationLine(tertiary.yearGraduated);
  const achievement = educationLine(tertiary.achievement);
  const educationSummary = !school ? educationLine(content.about.educationSummary) : null;
  const hasSideEducation = Boolean(school || course || year || achievement || educationSummary);

  return (
    <Section id="about" label={section.label} title={section.title} intro={section.intro} index={index}>
      <div className="about-shell">
        <aside className="about-aside">
          {hasSideEducation ? (
            <div className="about-side-block">
              <p className="item-label">{labels.educationBackground}</p>
              {educationSummary ? <p className="about-summary"><TodoText value={educationSummary} /></p> : null}
              {school ? <p className="about-school">{school}</p> : null}
              {course ? <p>{course}</p> : null}
              {year ? <p><TodoText value={year} /></p> : null}
              {achievement ? <p><TodoText value={achievement} /></p> : null}
            </div>
          ) : null}
          {hasImage ? (
            <div className="about-media">
              <ImageSlot image={aboutImage} kind="about" />
            </div>
          ) : null}
        </aside>
        <div className="about-copy">
          {content.about.introduction ? <p className="lead">{content.about.introduction}</p> : null}
          {content.about.careerObjective ? (
            <div className="text-block">
              <h3>{labels.careerObjective}</h3>
              <p>{content.about.careerObjective}</p>
            </div>
          ) : null}
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
      </div>
      {content.about.interests?.length ? (
        <div className="interest-lines" aria-label={labels.interests}>
          {content.about.interests.map((interest) => (
            <p className="interest-line" key={interest}>{interest}</p>
          ))}
        </div>
      ) : null}
    </Section>
  );
}
