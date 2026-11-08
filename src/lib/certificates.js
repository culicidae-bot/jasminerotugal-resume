import { isSafeHttpsUrl, isSafeImagePath } from './urls.js';

export function deriveCertificateStatus(certificate) {
  if (isSafeHttpsUrl(certificate.verifyUrl)) return 'issuer-verifiable';
  const file = certificate.publicFile;
  if (
    file &&
    typeof file === 'object' &&
    isSafeImagePath(file.src) &&
    typeof file.alt === 'string' &&
    file.alt.trim()
  ) {
    return 'document-on-file';
  }
  return 'self-reported';
}

function dateValue(value) {
  if (typeof value !== 'string' || !value) return 0;
  const parsed = new Date(`${value}T00:00:00`).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function sortCertificates(certificates) {
  return [...certificates].sort((first, second) => dateValue(second.dateEarned) - dateValue(first.dateEarned));
}

export function latestCertificates(certificates, count = 4) {
  return sortCertificates(certificates).slice(0, count);
}

export function filterCertificates(certificates, query, type) {
  const normalizedQuery = query.trim().toLowerCase();
  return sortCertificates(certificates).filter((certificate) => {
    if (type && certificate.type !== type) return false;
    if (!normalizedQuery) return true;
    return [certificate.title, certificate.type, certificate.issuer, certificate.dateEarned]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });
}
