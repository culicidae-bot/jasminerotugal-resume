import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import ImageSlot from '../components/ImageSlot.jsx';
import SampleTag from '../components/SampleTag.jsx';
import Section from '../components/Section.jsx';
import TodoText from '../components/TodoText.jsx';
import { CertificateStatus, CertificateType } from '../components/CertificateSignals.jsx';
import { formatDate } from '../lib/format.js';
import { latestCertificates } from '../lib/certificates.js';
import { sampledPath } from '../lib/urls.js';
import { useSite } from '../lib/site-context.js';

export default function CertificatesSection({ index }) {
  const { content, design, isSample } = useSite();
  const section = content.sections.certificates;
  const certificates = latestCertificates(content.certificates, 4);

  return (
    <Section
      id="certificates"
      label={section.label}
      title={section.title}
      intro={section.intro}
      index={index}
    >
      {certificates.length === 0 ? (
        <EmptyState
          title={content.ui.emptyCertificates.title}
          detail={content.ui.emptyCertificates.detail}
        />
      ) : (
        <ul className="certificate-list" data-layout={design.certificatesLayout}>
          {certificates.map((certificate) => {
            const date = formatDate(certificate.dateEarned);
            const target = sampledPath(
              `/certificates?cert=${encodeURIComponent(certificate.id)}`,
              isSample,
            );
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
                        <span className="certificate-thumb-empty">
                          {content.ui.noCopyShort}
                        </span>
                      )}
                    </span>
                  ) : null}
                  <span className="certificate-main">
                    <span className="certificate-title">{certificate.title}</span>
                    {certificate.sample ? <SampleTag /> : null}
                    <span className="certificate-issuer">
                      <TodoText value={certificate.issuer} />
                    </span>
                  </span>
                  <span className="certificate-meta">
                    <CertificateType type={certificate.type} />
                    <CertificateStatus certificate={certificate} />
                    <span className="certificate-date">
                      {date ? (
                        <time dateTime={certificate.dateEarned}>{date}</time>
                      ) : (
                        <TodoText value={certificate.dateEarned} />
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <div className="section-footer">
        <Link className="text-link" to={sampledPath('/certificates', isSample)}>
          {content.ui.viewAllCertificates}
        </Link>
      </div>
    </Section>
  );
}
