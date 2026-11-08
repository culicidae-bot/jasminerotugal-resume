import EmptyState from '../components/EmptyState.jsx';
import SampleTag from '../components/SampleTag.jsx';
import Section from '../components/Section.jsx';
import TodoText from '../components/TodoText.jsx';
import { useSite } from '../lib/site-context.js';

function ExperienceItem({ item, labels }) {
  return (
    <article className="experience-item">
      <header className="experience-header">
        <p className="item-label">
          {item.sample ? <SampleTag /> : null}
          <span>{item.role}</span>
        </p>
        <h4>{item.organization}</h4>
        <p className="record-date">
          <TodoText value={item.period} />
        </p>
      </header>
      <div className="experience-body">
        <div>
          <h5>{labels.responsibilities}</h5>
          <ul>
            {(item.responsibilities || []).map((responsibility) => (
              <li key={responsibility}>{responsibility}</li>
            ))}
          </ul>
        </div>
        <div>
          <h5>{labels.accomplishments}</h5>
          <ul>
            {(item.accomplishments || []).map((accomplishment) => (
              <li key={accomplishment}>{accomplishment}</li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

export default function ExperienceSection({ index }) {
  const { content } = useSite();
  const section = content.sections.experience;
  const labels = content.ui.experienceLabels;
  const groups = ['work', 'internship', 'volunteer'];

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
          const items = content.experience[group];
          return (
            <section className="experience-group" key={group} aria-labelledby={`experience-${group}`}>
              <h3 id={`experience-${group}`}>{content.ui.experienceGroups[group]}</h3>
              {items.length === 0 ? (
                <EmptyState
                  title={content.ui.emptyExperience[group].title}
                  detail={content.ui.emptyExperience[group].detail}
                />
              ) : (
                <div className="experience-list">
                  {items.map((item) => (
                    <ExperienceItem item={item} labels={labels} key={item.id} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </Section>
  );
}
