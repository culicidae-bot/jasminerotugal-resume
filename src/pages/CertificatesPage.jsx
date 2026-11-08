import { useEffect, useId, useRef } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import ImageSlot from '../components/ImageSlot.jsx';
import Seo from '../components/Seo.jsx';
import TodoText from '../components/TodoText.jsx';
import { CertificateStatus, CertificateType } from '../components/CertificateSignals.jsx';
import { ExternalIcon } from '../components/Icons.jsx';
import { deriveCertificateStatus, filterCertificates } from '../lib/certificates.js';
import { formatDate } from '../lib/format.js';
import { isSafeHttpsUrl } from '../lib/urls.js';
import { useSite } from '../lib/site-context.js';
import { isPublicCertificate } from '../lib/public-sections.js';

function CertificateDialog({ certificate, dialogRef, closeRef, onClose }) {
  const { content } = useSite();

  return (
    <dialog
      ref={dialogRef}
      className="certificate-dialog"
      aria-labelledby={certificate ? 'certificate-dialog-title' : undefined}
      onClose={onClose}
    >
      {certificate ? (
        <div className="dialog-inner">
          <button
            ref={closeRef}
            type="button"
            className="dialog-close"
            onClick={() => dialogRef.current?.close()}
          >
            {content.ui.closeDialog}
          </button>
          <p className="page-kicker">{content.ui.dialogDetails}</p>
          <h2 id="certificate-dialog-title">{certificate.title}</h2>
          <div className="dialog-signals">
            <CertificateType type={certificate.type} />
            <CertificateStatus certificate={certificate} />
          </div>
          <dl className="definition-list">
            <dt>{content.ui.issuerLabel}</dt>
            <dd>
              <TodoText value={certificate.issuer} />
            </dd>
            <dt>{content.ui.dateEarnedLabel}</dt>
            <dd>
              {formatDate(certificate.dateEarned) ? (
                <time dateTime={certificate.dateEarned}>
                  {formatDate(certificate.dateEarned)}
                </time>
              ) : (
                <TodoText value={certificate.dateEarned} />
              )}
            </dd>
            <dt>{content.ui.typeLabel}</dt>
            <dd>{certificate.type}</dd>
            <dt>{content.ui.statusLabel}</dt>
            <dd>{content.ui.statusLabels[deriveCertificateStatus(certificate)]}</dd>
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
              <p className="asset-note">{content.ui.noDocument}</p>
            )}
          </div>
          <div className="dialog-footer">
            {isSafeHttpsUrl(certificate.verifyUrl) ? (
              <a
                className="text-link external-link"
                href={certificate.verifyUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {content.ui.verificationLink}
                <ExternalIcon />
                <span className="visually-hidden"> ({content.ui.opensNewTab})</span>
              </a>
            ) : (
              <p className="asset-note">{content.ui.noVerificationLink}</p>
            )}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

export default function CertificatesPage() {
  const { content } = useSite();
  const [searchParams, setSearchParams] = useSearchParams();
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const triggerRef = useRef(null);
  const searchId = useId();
  const typeId = useId();

  const query = searchParams.get('q') || '';
  const requestedType = searchParams.get('type') || '';
  const type = content.certificateTypes.includes(requestedType) ? requestedType : '';
  const openId = searchParams.get('cert') || '';
  const certificates = content.certificates.filter(isPublicCertificate);
  const filtered = filterCertificates(certificates, query, type);
  const openCertificate = certificates.find((certificate) => certificate.id === openId);

  if (!certificates.length) return <Navigate to="/" replace />;

  function updateParam(key, value, replace = true) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace });
  }

  function clearFilters() {
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    next.delete('type');
    next.delete('cert');
    setSearchParams(next, { replace: true });
  }

  function openCertificateDialog(certificate, event) {
    triggerRef.current = event.currentTarget;
    updateParam('cert', certificate.id, false);
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (openCertificate && !dialog.open) {
      dialog.showModal();
      closeRef.current?.focus();
    } else if (!openCertificate && dialog.open) {
      dialog.close();
    }
  }, [openCertificate]);

  function handleDialogClose() {
    if (searchParams.get('cert')) {
      const next = new URLSearchParams(searchParams);
      next.delete('cert');
      setSearchParams(next, { replace: true });
    }
    window.requestAnimationFrame(() => {
      if (triggerRef.current && document.contains(triggerRef.current)) {
        triggerRef.current.focus();
      } else {
        document.getElementById('certificate-page-title')?.focus();
      }
    });
  }

  const resultText =
    filtered.length === 0
      ? content.ui.results.none
      : filtered.length === 1
        ? content.ui.results.one
        : `${filtered.length} ${content.ui.results.many}`;

  return (
    <article className="register-page">
      <Seo
        title={content.meta.certificatesTitle}
        description={content.meta.certificatesDescription}
      />
      <header className="page-heading">
        <p className="page-kicker">{content.ui.certificateRegisterTitle}</p>
        <h1 id="certificate-page-title" tabIndex="-1">
          {content.ui.certificateRegisterHeading}
        </h1>
        <p className="lead">{content.ui.certificateRegisterIntro}</p>
        <Link className="text-link" to="/">
          {content.ui.backToHome}
        </Link>
      </header>

      {certificates.length === 0 ? (
        <EmptyState
          title={content.ui.emptyCertificateRegister.title}
          detail={content.ui.emptyCertificateRegister.detail}
          level={2}
        />
      ) : (
        <>
          <div className="register-tools" role="search" aria-label={content.ui.searchLabel}>
            <div className="field field-search">
              <label htmlFor={searchId}>{content.ui.searchLabel}</label>
              <input
                id={searchId}
                name="q"
                type="search"
                autoComplete="off"
                placeholder={content.ui.searchPlaceholder}
                value={query}
                onChange={(event) => updateParam('q', event.target.value)}
              />
            </div>
            <div className="field field-filter">
              <label htmlFor={typeId}>{content.ui.typeFilterLabel}</label>
              <select
                id={typeId}
                name="type"
                autoComplete="off"
                value={type}
                onChange={(event) => updateParam('type', event.target.value)}
              >
                <option value="">{content.ui.allTypes}</option>
                {content.certificateTypes.map((certificateType) => (
                  <option value={certificateType} key={certificateType}>
                    {certificateType}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="button button-quiet" onClick={clearFilters}>
              {content.ui.clearFilters}
            </button>
          </div>

          <p className="results-count" aria-live="polite">
            {resultText}
          </p>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <p className="empty-label">{content.ui.noMatchLabel}</p>
              <h2>{content.ui.results.none}</h2>
              <p>{content.ui.filterEmptyDetail}</p>
              <button type="button" className="button button-secondary" onClick={clearFilters}>
                {content.ui.clearFilters}
              </button>
            </div>
          ) : (
            <div className="table-region">
              <table className="certificate-table">
                <caption className="visually-hidden">{content.ui.certificateRegisterTitle}</caption>
                <thead>
                  <tr>
                    <th scope="col">{content.ui.tableHeaders.title}</th>
                    <th scope="col">{content.ui.tableHeaders.type}</th>
                    <th scope="col">{content.ui.tableHeaders.issuer}</th>
                    <th scope="col">{content.ui.tableHeaders.date}</th>
                    <th scope="col">{content.ui.tableHeaders.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((certificate) => {
                    const date = formatDate(certificate.dateEarned);
                    return (
                      <tr key={certificate.id}>
                        <td data-label={content.ui.tableHeaders.title}>
                          <button
                            type="button"
                            className="certificate-open"
                            onClick={(event) => openCertificateDialog(certificate, event)}
                            aria-haspopup="dialog"
                          >
                            {certificate.title}
                          </button>
                        </td>
                        <td data-label={content.ui.tableHeaders.type}>
                          <CertificateType type={certificate.type} />
                        </td>
                        <td data-label={content.ui.tableHeaders.issuer}>
                          <TodoText value={certificate.issuer} />
                        </td>
                        <td data-label={content.ui.tableHeaders.date}>
                          {date ? (
                            <time dateTime={certificate.dateEarned}>{date}</time>
                          ) : (
                            <TodoText value={certificate.dateEarned} />
                          )}
                        </td>
                        <td data-label={content.ui.tableHeaders.status}>
                          <CertificateStatus certificate={certificate} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <CertificateDialog
        certificate={openCertificate}
        dialogRef={dialogRef}
        closeRef={closeRef}
        onClose={handleDialogClose}
      />
    </article>
  );
}
