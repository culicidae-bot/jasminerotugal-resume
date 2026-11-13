import Section from '../components/Section.jsx';
import { CertificateStatus, CertificateType } from '../components/CertificateSignals.jsx';
import { formatDate } from '../lib/format.js';
import { sortByPriority } from '../lib/prioritize.js';
import { isPublicCertificate, isPublicEligibility } from '../lib/public-sections.js';
import { isSafeHttpsUrl } from '../lib/urls.js';
import { useSite } from '../lib/site-context.js';

export default function CertificatesSection({ index }) {
  const { content } = useSite();
  const section = content.sections.certificates;
  const certificateRecords = (content.certificates || []).filter(isPublicCertificate);
  const eligibilityRecords = (content.eligibility || []).filter(isPublicEligibility).map((record) => ({
    ...record,
    type: 'Eligibility',
    dateEarned: record.dateConferred || '',
  }));
  const records = sortByPriority([...certificateRecords, ...eligibilityRecords]);

  return (
    <Section
      id="certificates"
      label={section.label}
      title="Certifications & Achievements"
      intro="Selected certifications, eligibility, training, and recognitions."
      index={index}
    >
      <ul className="portfolio-credentials">
        {records.map((record) => {
          const date = formatDate(record.dateEarned);
          const documentUrl = record.publicFile?.src || '';
          const verifyUrl = isSafeHttpsUrl(record.verifyUrl) ? record.verifyUrl : '';
          return (
            <li className="portfolio-credential" key={record.id}>
              <div className="portfolio-credential-main">
                <div className="portfolio-credential-meta">
                  <CertificateType type={record.type || 'Certificate'} />
                  <CertificateStatus certificate={record} />
                </div>
                <h3>{record.title}</h3>
                <p className="certificate-issuer">{record.issuer || "Issuing organization not provided"}</p>
              </div>
              <div className="portfolio-credential-actions">
                {date ? <time dateTime={record.dateEarned}>{date}</time> : null}
                {documentUrl ? (
                  <a className="text-link" href={documentUrl} target="_blank" rel="noopener noreferrer">
                    View certificate
                  </a>
                ) : null}
                {verifyUrl ? (
                  <a className="text-link" href={verifyUrl} target="_blank" rel="noopener noreferrer">
                    Verify credential
                  </a>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
