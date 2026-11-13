import { Link } from 'react-router-dom';
import ImageSlot from '../components/ImageSlot.jsx';
import Section from '../components/Section.jsx';
import TodoText from '../components/TodoText.jsx';
import { CertificateStatus, CertificateType } from '../components/CertificateSignals.jsx';
import { formatDate } from '../lib/format.js';
import { sortByPriority } from '../lib/prioritize.js';
import { useSite } from '../lib/site-context.js';
import { isPublicCertificate } from '../lib/public-sections.js';

function certificateRow(certificate, content, design) {
  const date = formatDate(certificate.dateEarned);
  const target = `/certificates?cert=${encodeURIComponent(certificate.id)}`;

  return (
    <li key={certificate.id}>
      <Link className="certificate-row" to={target}>
        {design.certificatesLayout === 'thumbnails' ? (
          <span className="certificate-thumb">
            {certificate.publicFile ? (
              certificate.publicFile.mimeType === 'application/pdf' ? (
                <span className="certificate-thumb-empty">PDF</span>
              ) : (
                <ImageSlot image={certificate.publicFile} kind="certificate-thumb" />
              )
            ) : (
              <span className="certificate-thumb-empty">{content.ui.noCopyShort}</span>
            )}
          </span>
        ) : null}
        <span className="certificate-main">
          <span className="certificate-title">{certificate.title}</span>
          <span className="certificate-issuer"><TodoText value={certificate.issuer} /></span>
        </span>
        <span className="certificate-meta">
          <CertificateType type={certificate.type} />
          <CertificateStatus certificate={certificate} />
          <span className="certificate-date">
            {date ? <time dateTime={certificate.dateEarned}>{date}</time> : <TodoText value={certificate.dateEarned} />}
          </span>
        </span>
      </Link>
    </li>
  );
}

export default function CertificatesSection({ index }) {
  const { content, design } = useSite();
  const section = content.sections.certificates;
  const records = sortByPriority((content.certificates || []).filter(isPublicCertificate));

  return (
    <Section
      id="certificates"
      label={section.label}
      title={section.title}
      intro={section.intro}
      index={index}
    >
      {records.length ? (
        <ul className="certificate-list" data-layout={design.certificatesLayout}>
          {records.map((record) => certificateRow(record, content, design))}
        </ul>
      ) : null}
    </Section>
  );
}
