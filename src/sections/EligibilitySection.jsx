import Section from '../components/Section.jsx';
import { ExternalIcon } from '../components/Icons.jsx';
import TodoText from '../components/TodoText.jsx';
import { formatDate } from '../lib/format.js';
import { isSafeHttpsUrl } from '../lib/urls.js';
import { isPublicEligibility } from '../lib/public-sections.js';
import { useSite } from '../lib/site-context.js';

export default function EligibilitySection({ index }) {
  const { content } = useSite();
  const section = content.sections.eligibility;
  const records = (content.eligibility || []).filter(isPublicEligibility);

  return (
    <Section
      id="eligibility"
      label={section.label}
      title={section.title}
      intro={section.intro}
      index={index}
    >
      {records.length ? (
        <ul className="eligibility-list">
          {records.map((record) => {
            const date = formatDate(record.dateConferred);
            return (
              <li className="eligibility-row" key={record.id}>
                <div>
                  <h3>{record.title}</h3>
                  <p>
                    <TodoText value={record.issuer} />
                  </p>
                  {record.extra ? <p>{record.extra}</p> : null}
                  {isSafeHttpsUrl(record.verifyUrl) ? (
                    <p>
                      <a className="text-link external-link" href={record.verifyUrl} target="_blank" rel="noopener noreferrer">
                        {content.ui.verifyEligibility}<ExternalIcon />
                        <span className="visually-hidden"> ({content.ui.opensNewTab})</span>
                      </a>
                    </p>
                  ) : null}
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
