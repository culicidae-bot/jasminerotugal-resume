import EmptyState from '../components/EmptyState.jsx';
import SampleTag from '../components/SampleTag.jsx';
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
      {content.eligibility.length === 0 ? (
        <EmptyState
          title={content.ui.emptyEligibility.title}
          detail={content.ui.emptyEligibility.detail}
        />
      ) : (
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
                  {record.sample ? <SampleTag /> : null}
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
      )}
    </Section>
  );
}
