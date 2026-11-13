/**
 * Batch document import orchestration.
 *
 * Privacy-first pipeline: everything happens in the browser until an
 * administrator approves records. Only approved attachments are uploaded,
 * only to the private `originals` bucket. Nothing reaches `public-media`
 * except through the normal publish flow.
 *
 * Batch processing is sequential by design: OCR and PDF work are
 * memory-hungry, and one bad file must never abort the whole batch.
 */

import { hashBlob } from './duplicate-detection.js';
import { classifyDocument } from './document-classifier.js';

export const BATCH_LIMITS = Object.freeze({
  MAX_FILES: 25,
  MAX_FILE_BYTES: 10 * 1024 * 1024, // matches Supabase bucket limit
  MAX_PDF_PAGES: 40,
  MAX_IMAGE_OCR_BYTES: 2 * 1024 * 1024,
});

const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const SUPPORTED_PDF_TYPE = 'application/pdf';

export function fileKindOf(mimeType) {
  if (mimeType === SUPPORTED_PDF_TYPE) return 'pdf';
  if (SUPPORTED_IMAGE_TYPES.has(mimeType)) return 'image';
  return null;
}

export function validateBatchFile(file) {
  if (!file || typeof file.type !== 'string' || typeof file.size !== 'number') {
    return { ok: false, reason: 'The file could not be read.' };
  }
  if (file.size > BATCH_LIMITS.MAX_FILE_BYTES) {
    return { ok: false, reason: `File exceeds the ${BATCH_LIMITS.MAX_FILE_BYTES / (1024 * 1024)} MB limit.` };
  }
  const kind = fileKindOf(file.type);
  if (!kind) {
    return { ok: false, reason: 'Unsupported format. Choose a PDF, JPG, PNG or WebP file.' };
  }
  return { ok: true, kind };
}

export function formatLimitNote() {
  return `Up to ${BATCH_LIMITS.MAX_FILES} files per batch; PDFs up to ${BATCH_LIMITS.MAX_PDF_PAGES} pages; images up to ${BATCH_LIMITS.MAX_IMAGE_OCR_BYTES / (1024 * 1024)} MB; PDFs up to ${BATCH_LIMITS.MAX_FILE_BYTES / (1024 * 1024)} MB.`;
}

export async function prepareBatch(fileList) {
  const files = Array.from(fileList ?? []);
  const prepared = [];
  for (const [position, file] of files.entries()) {
    const id = `batch-${position}-${Date.now().toString(36)}`;
    if (position >= BATCH_LIMITS.MAX_FILES) {
      prepared.push({ id, file, status: 'rejected', error: `Batches are limited to ${BATCH_LIMITS.MAX_FILES} files; this file was not queued.` });
      continue;
    }
    const check = validateBatchFile(file);
    if (!check.ok) {
      prepared.push({ id, file, status: 'rejected', error: check.reason });
      continue;
    }
    let hash = '';
    try {
      hash = await hashBlob(file);
    } catch {
      prepared.push({ id, file, status: 'rejected', error: 'Could not read the file for hashing.' });
      continue;
    }
    prepared.push({ id, file, kind: check.kind, size: file.size, hash, status: 'queued' });
  }
  return prepared;
}

/** Classify raw segment text and build a normalized, unsaved record candidate. */
export function classifySegmentText(rawText) {
  const classification = classifyDocument(rawText);
  return classification;
}

const TYPE_BY_CATEGORY = {
  Certification: 'IT Certification',
  Training: 'Training',
  Seminar: 'Seminar',
  Workshop: 'Workshop',
  Webinar: 'Seminar',
  Conference: 'Seminar',
  Competition: 'Competition',
  CTF: 'Competition',
  Hackathon: 'Competition',
  Award: 'Award',
  'Academic Recognition': 'Award',
  Participation: 'Participation',
  'Volunteer Recognition': 'Award',
  Other: 'Other',
};

export function mapCategoryToType(category) {
  return TYPE_BY_CATEGORY[category] ?? 'Other';
}

export function buildRecordFromExtraction({ id, title, issuer, dateEarned, verifyUrl, category, destination, featured = false, resume = false }) {
  return {
    id: id || crypto.randomUUID(),
    title: String(title ?? '').trim(),
    type: mapCategoryToType(category),
    issuer: String(issuer ?? '').trim(),
    dateEarned: String(dateEarned ?? '').trim(),
    verifyUrl: String(verifyUrl ?? '').trim(),
    featured: Boolean(featured),
    resume: Boolean(resume),
    priority: 1000,
    destination: destination ?? 'certificate',
    category: category ?? 'Other',
    categoryConfidence: undefined,
    destinationConfidence: undefined,
    extracted: undefined, // filled during review
  };
}

export function batchSummary(entries) {
  const summary = {
    total: entries.length,
    queued: 0,
    processing: 0,
    needsReview: 0,
    approved: 0,
    skipped: 0,
    failed: 0,
  };
  for (const entry of entries) {
    const status = entry?.status ?? 'queued';
    if (status === 'queued') summary.queued += 1;
    else if (status === 'processing') summary.processing += 1;
    else if (status === 'needs-review') summary.needsReview += 1;
    else if (status === 'approved') summary.approved += 1;
    else if (status === 'skipped') summary.skipped += 1;
    else if (status === 'failed' || status === 'rejected') summary.failed += 1;
  }
  return summary;
}
