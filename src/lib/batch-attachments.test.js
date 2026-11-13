import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import {
  attachBatchAttachmentsWithClient,
  splitPdfAttachmentWithClient,
} from './batch-attachments.js';

async function makePdf(pageCount = 3) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i += 1) doc.addPage([612, 792]);
  const bytes = await doc.save();
  return new File([bytes], 'batch.pdf', { type: 'application/pdf' });
}

function fakeUpload(client) {
  return async (file) => {
    const entry = {
      bucket: 'originals',
      path: `portfolio/${crypto.randomUUID()}.${file.type === 'application/pdf' ? 'pdf' : 'png'}`,
      size: file.size,
      type: file.type,
    };
    client.uploads.push(entry);
    return `originals:${entry.path}`;
  };
}

function makeEntry(overrides = {}) {
  return { id: 'batch-0-test', kind: 'pdf', status: 'complete', ...overrides };
}

test('split page range produces a valid PDF with only the requested pages', async () => {
  const source = await makePdf(4);
  const split = await splitPdfAttachmentWithClient(source, { from: 1, to: 2 });
  const loaded = await PDFDocument.load(await split.arrayBuffer());
  assert.equal(loaded.getPageCount(), 2);
  assert.equal(split.type, 'application/pdf');
});

test('each approved PDF segment gets its own split attachment uploaded', async () => {
  const client = { uploads: [] };
  const source = await makePdf(3);
  const entry = makeEntry({ file: source });
  const items = [
    {
      record: { id: 'seg-1', title: 'Certificate A' },
      entry,
      item: { segment: { pages: [0], pageRangeLabel: 'page 1' } },
    },
    {
      record: { id: 'seg-2', title: 'Certificate B' },
      entry,
      item: { segment: { pages: [1], pageRangeLabel: 'page 2' } },
    },
  ];

  const { records, failures } = await attachBatchAttachmentsWithClient(client, items, {
    uploadAsset: fakeUpload(client),
  });

  assert.deepEqual(failures, []);
  assert.equal(records.length, 2);
  assert.equal(client.uploads.length, 2);
  for (const record of records) {
    assert.match(record.publicFile.src, /^originals:portfolio\/.+\.pdf$/);
    assert.equal(record.publicFile.mimeType, 'application/pdf');
    assert.match(record.publicFile.alt, /Certificate/);
  }
});

test('image sources are attached directly without splitting', async () => {
  const client = { uploads: [] };
  const image = new File([new Uint8Array([1, 2, 3])], 'scan.png', { type: 'image/png' });
  const entry = makeEntry({ kind: 'image', file: image });
  const items = [
    {
      record: { id: 'seg-img', title: 'Scan Certificate' },
      entry,
      item: { segment: { pages: null, pageRangeLabel: 'page 1' } },
    },
  ];

  const { records, failures } = await attachBatchAttachmentsWithClient(client, items, {
    uploadAsset: fakeUpload(client),
  });

  assert.deepEqual(failures, []);
  assert.equal(records.length, 1);
  assert.equal(client.uploads[0].type, 'image/png');
  assert.equal(records[0].publicFile.alt, 'Scan Certificate (source: scan.png)');
});

test('if splitting fails, the full source document is attached as fallback', async () => {
  const client = { uploads: [] };
  const source = await makePdf(2);
  const entry = makeEntry({ file: source });
  let uploadCalls = 0;
  const uploadAsset = async (file) => {
    uploadCalls += 1;
    return fakeUpload(client)(file);
  };

  // Force the splitter to fail by corrupting the PDF bytes.
  const corrupt = new File([new Uint8Array([9, 9, 9])], 'corrupt.pdf', { type: 'application/pdf' });
  const items = [
    {
      record: { id: 'seg-corrupt', title: 'Corrupt Certificate' },
      entry: makeEntry({ kind: 'pdf', file: corrupt }),
      item: { segment: { pages: [0], pageRangeLabel: 'page 1' } },
    },
  ];

  const { records, failures } = await attachBatchAttachmentsWithClient(client, items, { uploadAsset });
  assert.deepEqual(failures, []);
  assert.equal(records.length, 1);
  assert.match(records[0].publicFile.alt, /full document/);
  assert.equal(uploadCalls, 1);
});

test('records whose attachment cannot be uploaded are reported, not silently imported', async () => {
  const source = await makePdf(1);
  const entry = makeEntry({ file: source });
  const items = [
    {
      record: { id: 'seg-fail', title: 'Failing Certificate' },
      entry,
      item: { segment: { pages: [0], pageRangeLabel: 'page 1' } },
    },
  ];
  const uploadAsset = async () => {
    throw new Error('storage is full');
  };

  const { records, failures } = await attachBatchAttachmentsWithClient(
    { uploads: [] },
    items,
    { uploadAsset },
  );
  assert.equal(records.length, 0);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].title, 'Failing Certificate');
  assert.match(failures[0].error, /storage is full/);
});
