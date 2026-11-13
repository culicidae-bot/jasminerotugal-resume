import Section from '../components/Section.jsx';
import TodoText from '../components/TodoText.jsx';
import { useSite } from '../lib/site-context.js';
import { isPublicExperience } from '../lib/public-sections.js';
import { sortByPriority } from '../lib/prioritize.js';

function ExperienceItem({ item, labels }) {
  return (
    <article className="experience-item">
      <header className="experience-header">
        <p className="item-label">
          <span>{item.role}</span>
        </p>
        <h4>{item.organization}</h4>
        {item.period ? (
          <p className="record-date">
            <TodoText value={item.period} />
          </p>
        ) : null}
      </header>
      <div className="experience-body">
        {item.summary ? <p>{item.summary}</p> : null}
        {item.responsibilities?.length ? (
          <div>
            <h5>{labels.responsibilities}</h5>
            <ul>
              {item.responsibilities.map((responsibility) => (
                <li key={responsibility}>{responsibility}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {item.accomplishments?.length ? (
          <div>
            <h5>{labels.accomplishments}</h5>
            <ul>
              {item.accomplishments.map((accomplishment) => (
                <li key={accomplishment}>{accomplishment}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function ExperienceSection({ index }) {
  const { content } = useSite();
  const section = content.sections.experience;
  const labels = content.ui.experienceLabels;
  const groups = ['work', 'internship', 'volunteer', 'academic'];

  const keyOf = (item) => item.id ?? `${item.role}-${item.organization}`;

  return (
    <Section
      id="experience"
      label={section.label}
      title={section.title}
      intro={section.intro}
      index={index}
    >
      <div className="experience-groups">
        {groups.map((group) => {
          const all = sortByPriority((content.experience[group] || []).filter(isPublicExperience));
          const items = all;
          if (!items.length) return null;
          return (
            <section className="experience-group" key={group} aria-labelledby={`experience-${group}`}>
              <h3 id={`experience-${group}`}>{content.ui.experienceGroups[group]}</h3>
              <div className="experience-list">
                {items.map((item) => (
                  <ExperienceItem item={item} labels={labels} key={keyOf(item)} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </Section>
  );
}
