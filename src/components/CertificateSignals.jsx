import { StatusIcon, TypeIcon } from './Icons.jsx';
import { deriveCertificateStatus } from '../lib/certificates.js';
import { useSite } from '../lib/site-context.js';

export function CertificateType({ type }) {
  return (
    <span className="certificate-type">
      <TypeIcon type={type} />
      <span>{type}</span>
    </span>
  );
}

export function CertificateStatus({ certificate }) {
  const { content } = useSite();
  const status = deriveCertificateStatus(certificate);
  return (
    <span className={`certificate-status status-${status}`}>
      <StatusIcon status={status} />
      <span>{content.ui.statusLabels[status]}</span>
      <span className="visually-hidden">. {content.ui.statusDescriptions[status]}</span>
    </span>
  );
}
