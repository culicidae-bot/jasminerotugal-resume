import Section from '../components/Section.jsx';
import TodoText from '../components/TodoText.jsx';
import { formatDate } from '../lib/format.js';
import { useSite } from '../lib/site-context.js';

export default function EligibilitySection({ index }) {
  const { content } = useSite();
  const section = content.sections.eligibility;

  return (
    <Section
      id="eligibility"
      label={section.label}
      title={section.title}
      intro={section.intro}
      index={index}
    >
      {content.eligibility.length ? (
        <ul className="eligibility-list">
          {content.eligibility.map((record) => {
            const date = formatDate(record.dateConferred);
            return (
              <li className="eligibility-row" key={record.id}>
                <div>
                  <h3>{record.title}</h3>
                  <p>
                    <TodoText value={record.issuer} />
                  </p>
                </div>
                <p className="record-date">
                  {date ? (
                    <time dateTime={record.dateConferred}>{date}</time>
                  ) : (
                    <TodoText value={record.dateConferred} />
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      ) : null}
    </Section>
  );
}
