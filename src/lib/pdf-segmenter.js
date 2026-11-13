/**
 * PDF page text extraction and document segmentation.
 *
 * Text is preferred; scanned pages fall back to OCR (bounded to
 * MAX_PDF_PAGES to avoid unbounded memory use).
 */

import { segmentPages } from './document-splitter.js';
import { parseCertificateText } from './certificate-parser.js';

const MAX_PDF_PAGES = 40;

async function loadPdf(file) {
  const pdfjs = globalThis.Promise?.withResolvers
    ? await import('pdfjs-dist')
    : await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = typeof window === 'undefined'
    ? new URL('../../public/vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href
    : '/vendor/pdfjs/pdf.worker.min.mjs';
  const data = new Uint8Array(await file.arrayBuffer());
  return pdfjs.getDocument({ data, isEvalSupported: false, useWorkerFetch: typeof window !== "undefined", useSystemFonts: typeof window === "undefined" }).promise;
}

/**
 * Return one entry per page with `index`, `text`, `method`, and `wordCount`.
 * Pages beyond MAX_PDF_PAGES are reported via `limitExceeded` instead of
 * being silently dropped.
 */
export async function extractPdfPages(file, { onProgress, ocrPage } = {}) {
  const document = await loadPdf(file);
  const pages = [];
  const pageCount = document.numPages;
  const limitExceeded = pageCount > MAX_PDF_PAGES;

  try {
    for (let pageNumber = 1; pageNumber <= Math.min(pageCount, MAX_PDF_PAGES); pageNumber += 1) {
      onProgress?.({ status: `Reading page ${pageNumber} of ${pageCount}…`, progress: pageNumber / Math.min(pageCount, MAX_PDF_PAGES) });
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const items = content.items.filter((item) => 'str' in item && item.str.trim());
      const rows = [];
      for (const item of items) {
        const y = Math.round(item.transform?.[5] ?? 0);
        let row = null;
        for (const candidate of rows) {
          if (Math.abs(candidate.y - y) < 3) { row = candidate; break; }
        }
        if (!row) {
          row = { y, items: [] };
          rows.push(row);
        }
        row.items.push(item);
      }
      rows.sort((a, b) => b.y - a.y);
      let text = rows
        .map((row) => row.items.sort((a, b) => (a.transform?.[4] ?? 0) - (b.transform?.[4] ?? 0)).map((item) => item.str).join(' ').trim())
        .filter(Boolean)
        .join('\n');

      // Scanned page fallback — bounded OCR.
      if (text.replace(/\s+/g, '').length < 40 && typeof ocrPage === 'function') {
        const canvasText = await ocrPage(page, pageNumber);
        if (canvasText) text = canvasText;
      }

      pages.push({
        index: pageNumber - 1,
        pageNumber,
        text,
        wordCount: text.trim().split(/\s+/).filter(Boolean).length,
        method: text.replace(/\s+/g, '').length >= 40 ? 'pdf-text' : 'ocr',
      });
    }
    if (limitExceeded) {
      pages.limitExceeded = true;
      pages.limitMessage = `PDF has ${pageCount} pages; only the first ${MAX_PDF_PAGES} were processed.`;
    }
  } finally {
    await document.destroy().catch(() => {});
  }

  return { pages, pageCount, limitExceeded };
}

export function segmentPdfPages(pages) {
  return segmentPages(pages);
}

export function parseSegmentPageText(text) {
  return parseCertificateText(text);
}
