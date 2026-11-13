/**
 * Browser-only certificate OCR.
 * Imports the pure parser; heavy dependencies are lazy-loaded inside
 * their respective branches. Nothing here runs on the server.
 */
import { parseCertificateText } from './certificate-parser.js';
export { parseCertificateText, normalizeLines, suggestCertificateType } from './certificate-parser.js';

const MIN_USABLE_TEXT_LENGTH = 40;
const MAX_PDF_OCR_PAGES = 2;

async function ocrImages(sources, onProgress) {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    workerPath: '/vendor/tesseract/worker.min.js',
    corePath: '/vendor/tesseract',
    langPath: '/vendor/tesseract',
    workerBlobURL: false,
    gzip: false,
    logger: (message) => {
      if (!onProgress) return;
      if (message.status === 'recognizing text') {
        onProgress({ status: 'Recognizing text…', progress: message.progress });
      } else if (/loading/i.test(message.status || '')) {
        onProgress({ status: 'Loading OCR engine…', progress: message.progress ?? 0 });
      }
    },
  });
  let text = '';
  try {
    for (const source of sources) {
      const result = await worker.recognize(source);
      text += `\n${result?.data?.text ?? ''}`;
    }
  } finally {
    await worker.terminate().catch(() => {});
  }
  return text;
}

export async function extractCertificateDocument(file, { onProgress } = {}) {
  const notes = [];
  const type = file?.type || '';
  const isImage = type.startsWith('image/');
  const isPdf = type === 'application/pdf';

  if (isImage) {
    onProgress?.({ status: 'Recognizing text…', progress: 0 });
    const text = await ocrImages([file], onProgress);
    const parsed = parseCertificateText(text);
    return { ...parsed, method: 'ocr-image', notes: [...notes, ...parsed.notes] };
  }

  if (isPdf) {
    onProgress?.({ status: 'Reading PDF…', progress: 0 });
    const pdfjs = typeof window !== 'undefined'
      ? await import('pdfjs-dist')
      : await import('pdfjs-dist/legacy/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = typeof window === 'undefined'
      ? new URL('../../public/vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href
      : '/vendor/pdfjs/pdf.worker.min.mjs';
    const data = new Uint8Array(await file.arrayBuffer());
    const document = await pdfjs.getDocument({ data, isEvalSupported: false, useWorkerFetch: typeof window !== "undefined", useSystemFonts: typeof window === "undefined" }).promise;
    try {
      let text = '';
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        onProgress?.({ status: `Extracting page ${pageNumber} of ${document.numPages}…`, progress: pageNumber / document.numPages / 2 });
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
        const pageText = rows
          .map((row) => row.items.sort((a, b) => (a.transform?.[4] ?? 0) - (b.transform?.[4] ?? 0)).map((item) => item.str).join(' ').trim())
          .filter(Boolean)
          .join('\n');
        text += `\n${pageText}`;
      }
      if (text.replace(/\s+/g, '').length >= MIN_USABLE_TEXT_LENGTH) {
        const parsed = parseCertificateText(text);
        return { ...parsed, method: 'pdf-text', notes: [...notes, ...parsed.notes] };
      }
      notes.push('PDF has no selectable text (scanned document) — running OCR instead.');
      onProgress?.({ status: 'Scanned PDF — running OCR…', progress: 0.5 });

      const pages = Math.min(document.numPages, MAX_PDF_OCR_PAGES);
      const images = [];
      for (let pageNumber = 1; pageNumber <= pages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(2.25, 1600 / baseViewport.width);
        const viewport = page.getViewport({ scale });
        const canvas = globalThis.document?.createElement('canvas');
        if (!canvas) throw new Error('Canvas is not available in this environment.');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        await page.render({ canvasContext: context, viewport }).promise;
        images.push(canvas.toDataURL('image/png'));
      }
      const text2 = await ocrImages(images, (message) => onProgress?.({ ...message, progress: 0.5 + (message.progress ?? 0) / 2 }));
      const parsed = parseCertificateText(text2);
      return { ...parsed, method: 'pdf-ocr', notes: [...notes, ...parsed.notes] };
    } finally {
      await document.destroy().catch(() => {});
    }
  }

  throw new Error('Unsupported format. Choose a JPG, PNG, WebP image or a PDF.');
}
