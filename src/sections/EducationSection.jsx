import SampleTag from '../components/SampleTag.jsx';
import Section from '../components/Section.jsx';
import TodoText from '../components/TodoText.jsx';
import { useSite } from '../lib/site-context.js';

function EducationRow({ record }) {
  const { content } = useSite();
  const labels = content.ui.educationLabels;
  return (
    <article className="education-row">
      <p className="item-label">
        <span>{record.level}</span>
        {record.sample ? <SampleTag /> : null}
      </p>
      <div className="education-main">
        <h3>
          <TodoText value={record.institution} />
        </h3>
        <dl className="definition-list">
          {record.course ? (
            <>
              <dt>{labels.course}</dt>
              <dd>
                <TodoText value={record.course} />
              </dd>
            </>
          ) : null}
          <dt>{labels.year}</dt>
          <dd>
            <TodoText value={record.yearGraduated} />
          </dd>
          {record.achievement ? (
            <>
              <dt>{labels.achievement}</dt>
              <dd>
                <TodoText value={record.achievement} />
              </dd>
            </>
          ) : null}
        </dl>
      </div>
    </article>
  );
}

export default function EducationSection({ index }) {
  const { content } = useSite();
  const section = content.sections.education;
  const records = [content.education.tertiary, content.education.secondary, content.education.elementary];

  return (
    <Section
      id="education"
      label={section.label}
      title={section.title}
      intro={section.intro}
      index={index}
    >
      <div className="education-list">
        {records.map((record) => (
          <EducationRow record={record} key={record.level} />
        ))}
      </div>
    </Section>
  );
}
