import { uploadPortfolioAssetWithClient } from './portfolio-content.js';
import { PDFDocument } from 'pdf-lib';

function pageRangeLabel(pages, fallbackLabel) {
  if (Array.isArray(pages) && pages.length) {
    const first = pages[0] + 1;
    const last = pages[pages.length - 1] + 1;
    return first === last ? `page ${first}` : `pages ${first}–${last}`;
  }
  return fallbackLabel || 'pages 1';
}

export async function splitPdfAttachmentWithClient(file, { from = 0, to = 0 } = {}) {
  if (!file) throw new Error('Choose a PDF to split.');
  const buffer = await file.arrayBuffer();
  const source = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const pageCount = source.getPageCount();
  const start = Math.max(0, Math.min(Number(from) || 0, pageCount - 1));
  const end = Math.max(start, Math.min(Number(to) || pageCount - 1, pageCount - 1));
  const indices = [];
  for (let page = start; page <= end; page += 1) indices.push(page);
  const document = await PDFDocument.create();
  const copied = await document.copyPages(source, indices);
  for (const page of copied) document.addPage(page);
  const bytes = await document.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

/**
 * Attach a source document or a split page range to each approved import
 * record. Every record that is imported keeps a real, persistent reference
 * to its supporting document (private `originals:` reference; copied to the
 * public bucket on publish).
 *
 * `items` is a list of { record, entry, item } where entry carries the
 * original File and item the extracted segment.
 */
export async function attachBatchAttachmentsWithClient(client, items, { uploadAsset } = {}) {
  const upload =
    uploadAsset ??
    ((file) => uploadPortfolioAssetWithClient(client, file, { kind: 'certificate' }));

  const records = [];
  const failures = [];

  for (const { record, entry, item } of items) {
    const title = String(record?.title ?? '').trim() || 'Certificate';
    const file = entry?.file;
    const pages = Array.isArray(item?.segment?.pages) ? item.segment.pages : null;
    const rangeLabel = pageRangeLabel(pages, item?.segment?.pageRangeLabel);
    const baseAlt = pages && pages.length > 1
      ? `${title} (${rangeLabel} of ${file?.name ?? 'document'})`
      : `${title} (source: ${file?.name ?? 'document'})`;

    if (!file || typeof file.type !== 'string') {
      failures.push({ id: record.id, title, error: 'Source file is missing for this record.' });
      continue;
    }

    const isImage = file.type.startsWith('image/');

    // Prefer a split copy of the source PDF when a page range is known.
    let chosenFile = file;
    let alt = baseAlt;
    let mimeType = file.type;
    let wholeDocument = false;
    if (!isImage && entry?.kind === 'pdf' && Array.isArray(pages) && pages.length > 0) {
      try {
        const split = await splitPdfAttachmentWithClient(file, {
          from: pages[0],
          to: pages[pages.length - 1],
        });
        chosenFile = split;
        mimeType = 'application/pdf';
        alt = pages.length === 1
          ? `${title} (page ${pages[0] + 1} of ${file?.name ?? 'document'})`
          : `${title} (${rangeLabel} of ${file?.name ?? 'document'})`;
      } catch (splitError) {
        wholeDocument = true;
        alt = `${title} (full document: ${file?.name ?? 'source PDF'})`;
      }
    }

    try {
      const src = await upload(chosenFile);
      records.push({
        ...record,
        publicFile: {
          src,
          alt,
          width: 1200,
          height: 1600,
          mimeType,
        },
      });
    } catch (uploadError) {
      if (!wholeDocument && !isImage && entry?.kind === 'pdf') {
        // Fallback: persist the whole source document rather than dropping the record.
        try {
          const src = await upload(file);
          records.push({
            ...record,
            publicFile: {
              src,
              alt: `${title} (full document: ${file?.name ?? 'source PDF'})`,
              width: 1200,
              height: 1600,
              mimeType: file.type,
            },
          });
          continue;
        } catch (fallbackError) {
          failures.push({ id: record.id, title, error: fallbackError?.message || 'Attachment upload failed.' });
          continue;
        }
      }
      failures.push({ id: record.id, title, error: uploadError?.message || 'Attachment upload failed.' });
    }
  }

  return { records, failures };
}
