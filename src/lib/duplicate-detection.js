/**
 * Duplicate detection for certificate/achievement records.
 *
 * Two matching strategies, evaluated independently:
 *   A) Exact file-hash match (same bytes, even across formats when content matches).
 *   B) Normalized-metadata similarity score.
 *
 * Nothing is ever deleted, merged, or overwritten automatically; matches are
 * surfaced with explicit evidence for the administrator to act on.
 */

function normalizeToken(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(text) {
  return new Set(normalizeToken(text).split(/\s+/).filter((word) => word.length > 2));
}

function jaccard(a, b) {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

function datesEqual(a, b) {
  if (!a || !b) return false;
  return String(a).slice(0, 10) === String(b).slice(0, 10);
}

export function fileHashMatches(candidateHash, existingHash) {
  return Boolean(candidateHash && existingHash && candidateHash === existingHash);
}

export function findDuplicateRecord(candidate, existingRecords) {
  const existing = Array.isArray(existingRecords) ? existingRecords : [];
  if (!candidate || !existing.length) return null;

  const candidateTitle = normalizeToken(candidate.title);
  const candidateIssuer = normalizeToken(candidate.issuer);
  const candidateRecipient = normalizeToken(candidate.recipient);
  const candidateCredential = normalizeToken(candidate.credentialId);
  const candidateDate = candidate.dateEarned ?? candidate.dateConferred ?? '';

  let best = null;
  for (const record of existing) {
    const recordTitle = normalizeToken(record.title);
    const recordIssuer = normalizeToken(record.issuer);
    const recordRecipient = normalizeToken(record.recipient);
    const recordCredential = normalizeToken(record.credentialId);
    const recordDate = record.dateEarned ?? record.dateConferred ?? '';

    const evidence = [];
    let score = 0;

    if (candidateCredential && recordCredential && candidateCredential === recordCredential) {
      score += 5;
      evidence.push('same credential id');
    } else if (candidateCredential && recordCredential && candidateCredential.slice(0, 8) === recordCredential.slice(0, 8)) {
      score += 3;
      evidence.push('similar credential id');
    }

    const titleSimilarity = jaccard(candidate.title, record.title);
    if (titleSimilarity >= 0.75) { score += 3; evidence.push('near-identical title'); }
    else if (titleSimilarity >= 0.4) { score += 1; evidence.push('similar title'); }

    const issuerSimilarity = jaccard(candidate.issuer, record.issuer);
    if (issuerSimilarity >= 0.6) { score += 2; evidence.push('same issuer'); }
    else if (issuerSimilarity >= 0.3) { score += 1; evidence.push('similar issuer'); }

    const recipientSimilarity = jaccard(candidate.recipient, record.recipient);
    if (recipientSimilarity >= 0.6) { score += 1; evidence.push('same recipient'); }

    if (datesEqual(candidateDate, recordDate)) { score += 2; evidence.push('same date'); }

    if (score > 0) {
      if (!best || score > best.score) {
        best = { record, score, evidence, titleSimilarity, issuerSimilarity };
      }
    }
  }

  if (!best || best.score < 4) return null;
  return {
    record: best.record,
    score: best.score,
    confidence: best.score >= 6 ? 'high' : best.score >= 5 ? 'medium' : 'low',
    evidence: best.evidence,
  };
}

export async function hashBlob(blob) {
  if (!blob) return '';
  const source = typeof blob.arrayBuffer === 'function' ? await blob.arrayBuffer() : blob;
  const digest = await crypto.subtle.digest('SHA-256', source);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Find intra-batch duplicates among raw segment fields.
 * Returns an array of { a, b, evidence } pairs (indices refer to `segments`).
 */
export function findIntraBatchDuplicates(segments) {
  const list = Array.isArray(segments) ? segments : [];
  const pairs = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const dup = findDuplicateRecord(
        {
          title: list[i].fields?.title?.value,
          issuer: list[i].fields?.issuer?.value,
          dateEarned: list[i].fields?.dateEarned?.value,
          credentialId: list[i].fields?.credentialId?.value,
        },
        [
          {
            title: list[j].fields?.title?.value,
            issuer: list[j].fields?.issuer?.value,
            dateEarned: list[j].fields?.dateEarned?.value,
            credentialId: list[j].fields?.credentialId?.value,
            id: j,
          },
        ],
      );
      if (dup) pairs.push({ a: i, b: j, evidence: dup.evidence, score: dup.score });
    }
  }
  return pairs;
}
