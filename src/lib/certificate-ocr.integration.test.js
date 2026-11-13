import assert from 'node:assert/strict';
import test from 'node:test';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { extractCertificateDocument } from './certificate-ocr.js';

async function buildSampleCertificatePdf() {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const page = document.addPage([612, 792]);
  const lines = [
    'Sample Training Center',
    'CERTIFICATE OF COMPLETION',
    'This certificate is presented to',
    'Jasmine L. Rotugal',
    'has completed the Network Security Fundamentals course',
    'awarded August 9, 2026',
    'Certificate No: SY-8841-2026',
    'https://verify.example.com/cert/8841',
  ];
  let y = 720;
  for (const line of lines) {
    page.drawText(line, { x: 72, y, size: 14, font });
    y -= 28;
  }
  return Buffer.from(await document.save());
}

test('text-based PDF certificate extracts and maps all fields', async () => {
  const bytes = await buildSampleCertificatePdf();
  const file = new File([bytes], 'sample-certificate.pdf', { type: 'application/pdf' });

  const result = await extractCertificateDocument(file);

  assert.equal(result.method, 'pdf-text');
  assert.equal(result.fields.title.value, 'Certificate of Completion');
  assert.equal(result.fields.issuer.value, 'Sample Training Center');
  assert.equal(result.fields.recipient.value, 'Jasmine L. Rotugal');
  assert.equal(result.fields.dateEarned.value, '2026-08-09');
  assert.equal(result.fields.verifyUrl.value, 'https://verify.example.com/cert/8841');
  assert.equal(result.fields.credentialId.value, 'SY-8841-2026');
});

test('PDF without a recipient announcement reports recipient as missing', async () => {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const page = document.addPage([612, 792]);
  const lines = [
    'Sample Training Center',
    'CERTIFICATE OF COMPLETION',
    'Network Security Fundamentals course',
    'issued August 9, 2026',
  ];
  let y = 720;
  for (const line of lines) {
    page.drawText(line, { x: 72, y, size: 14, font });
    y -= 28;
  }
  const bytes = Buffer.from(await document.save());
  const file = new File([bytes], 'sample-certificate.pdf', { type: 'application/pdf' });

  const result = await extractCertificateDocument(file);

  assert.equal(result.fields.dateEarned.value, '2026-08-09');
  assert.equal(result.fields.recipient.confidence, 'missing');
  assert.equal(result.fields.recipient.value, '');
});
