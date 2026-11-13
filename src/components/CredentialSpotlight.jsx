import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalIcon } from './Icons.jsx';
import { CertificateType } from './CertificateSignals.jsx';
import TodoText from './TodoText.jsx';
import { formatDate } from '../lib/format.js';
import {
  canAutoRotate,
  nextCredentialIndex,
  CREDENTIAL_ROTATION_INTERVAL,
} from '../lib/credential-highlight.js';
import { usePrefersReducedMotion } from '../lib/motion.js';
import { isSafeHttpsUrl } from '../lib/urls.js';
import { useSite } from '../lib/site-context.js';

const ROTATION_MIN = 5;

function credentialDestination(id) {
  return `/certificates?cert=${encodeURIComponent(id)}`;
}

function CredentialItem({ record, active = true, content }) {
  const date = formatDate(record.dateEarned);
  const type = record.type || 'Certificate';
  return (
    <li className={`credential-item${active ? ' is-active' : ''}`}>
      <div className="credential-main">
        <CertificateType type={type} />
        <h3 className="credential-title">
          <Link to={credentialDestination(record.id)}>{record.title}</Link>
        </h3>
        <p className="credential-issuer">
          <TodoText value={record.issuer} />
        </p>
      </div>
      <div className="credential-meta">
        {date ? (
          <time dateTime={record.dateEarned}>{date}</time>
        ) : (
          <TodoText value={record.dateEarned} />
        )}
        {isSafeHttpsUrl(record.verifyUrl) ? (
          <a
            className="credential-verify"
            href={record.verifyUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {content.ui.verifyCredential}
            <ExternalIcon />
            <span className="visually-hidden"> ({content.ui.opensNewTab})</span>
          </a>
        ) : null}
      </div>
    </li>
  );
}

export default function CredentialSpotlight({ records }) {
  const { content } = useSite();
  const reducedMotion = usePrefersReducedMotion();
  const rotationEnabled = canAutoRotate(reducedMotion, records.length) && records.length >= ROTATION_MIN;
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [documentHidden, setDocumentHidden] = useState(
    () => typeof document !== 'undefined' && document.hidden,
  );

  useEffect(() => {
    function onVisibility() {
      setDocumentHidden(document.hidden);
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (!rotationEnabled || paused || hovered || documentHidden) return undefined;
    const timer = window.setInterval(
      () => setActiveIndex((current) => nextCredentialIndex(current, records.length)),
      CREDENTIAL_ROTATION_INTERVAL,
    );
    return () => window.clearInterval(timer);
  }, [rotationEnabled, paused, hovered, documentHidden, records.length]);

  if (!records.length) return null;

  if (!rotationEnabled) {
    return (
      <ul className="credential-list two-ended" aria-label={content.ui.featuredCredentials}>
        {records.map((record) => (
          <CredentialItem key={record.id} record={record} content={content} />
        ))}
      </ul>
    );
  }

  return (
    <div
      className="credential-spotlight"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHovered(false);
      }}
    >
      <ul className="credential-list rotating" aria-label={content.ui.featuredCredentials}>
        {records.map((record, recordIndex) => (
          <CredentialItem
            key={record.id}
            record={record}
            content={content}
            active={recordIndex === activeIndex}
          />
        ))}
      </ul>
      <div className="credential-controls">
        <button
          type="button"
          className="button-quiet text-link"
          aria-pressed={paused}
          onClick={() => setPaused((current) => !current)}
        >
          {paused ? content.ui.resumeHighlighting : content.ui.pauseHighlighting}
        </button>
      </div>
    </div>
  );
}
