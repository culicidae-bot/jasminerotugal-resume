import { Link, Navigate, useSearchParams } from 'react-router-dom';
import ImageSlot from '../components/ImageSlot.jsx';
import Seo from '../components/Seo.jsx';
import TodoText from '../components/TodoText.jsx';
import { CertificateStatus, CertificateType } from '../components/CertificateSignals.jsx';
import { ExternalIcon } from '../components/Icons.jsx';
import { formatDate } from '../lib/format.js';
import { isSafeHttpsUrl } from '../lib/urls.js';
import { useSite } from '../lib/site-context.js';
import { isPublicCertificate } from '../lib/public-sections.js';
import { resolveSeo } from '../lib/seo.js';

export default function CertificatesPage() {
  const { content } = useSite();
  const seo = resolveSeo(content, 'certificates');
  const [searchParams] = useSearchParams();
  const certificateId = searchParams.get('cert') || '';
  const certificate = (content.certificates || [])
    .filter(isPublicCertificate)
    .find((record) => record.id === certificateId);

  if (!certificate) return <Navigate to="/#certificates" replace />;

  const date = formatDate(certificate.dateEarned);

  return (
    <article className="register-page credential-detail-page">
      <Seo title={certificate.title || seo.title} description={seo.description} />
      <header className="page-heading">
        <p className="page-kicker"><CertificateType type={certificate.type} /></p>
        <h1 id="credential-title">{certificate.title}</h1>
        <p className="lead"><TodoText value={certificate.issuer} /></p>
        <Link className="text-link" to="/#certificates">Back to portfolio</Link>
      </header>

      <section className="credential-detail" aria-labelledby="credential-title">
        <dl className="definition-list">
          <dt>Issuing organization</dt>
          <dd><TodoText value={certificate.issuer} /></dd>
          <dt>Date earned</dt>
          <dd>{date ? <time dateTime={certificate.dateEarned}>{date}</time> : <TodoText value={certificate.dateEarned} />}</dd>
          <dt>Credential status</dt>
          <dd><CertificateStatus certificate={certificate} /></dd>
        </dl>

        <div className="dialog-document">
          {certificate.publicFile ? (
            certificate.publicFile.mimeType === 'application/pdf' ? (
              <a className="button button-secondary" href={certificate.publicFile.src} target="_blank" rel="noopener noreferrer">
                Open certificate PDF
              </a>
            ) : (
              <ImageSlot image={certificate.publicFile} kind="certificate" />
            )
          ) : (
            <p className="asset-note">A public certificate copy is not available.</p>
          )}
        </div>

        <div className="dialog-footer">
          {isSafeHttpsUrl(certificate.verifyUrl) ? (
            <a className="text-link external-link" href={certificate.verifyUrl} target="_blank" rel="noopener noreferrer">
              Open verification link <ExternalIcon />
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          ) : (
            <p className="asset-note">No public verification link is available.</p>
          )}
        </div>
      </section>
    </article>
  );
}
