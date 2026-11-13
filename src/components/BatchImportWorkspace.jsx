import { useCallback, useMemo, useRef, useState } from 'react';
import {
  BATCH_LIMITS,
  batchSummary,
  buildRecordFromExtraction,
  fileKindOf,
  mapCategoryToType,
  prepareBatch,
  validateBatchFile,
  formatLimitNote,
} from '../lib/batch-import.js';
import { extractPdfPages, segmentPdfPages } from '../lib/pdf-segmenter.js';
import { parseCertificateText } from '../lib/certificate-parser.js';
import { classifyDocument } from '../lib/document-classifier.js';
import { findDuplicateRecord, findIntraBatchDuplicates } from '../lib/duplicate-detection.js';

const MAX_BATCH = BATCH_LIMITS.MAX_FILES;

const STATUS_LABELS = {
  queued: 'Queued',
  processing: 'Processing…',
  complete: 'Ready to review',
  'needs-review': 'Needs review',
  approved: 'Approved',
  skipped: 'Skipped',
  failed: 'Error',
  rejected: 'Rejected',
};

function ConfidenceChip({ level }) {
  const resolved = ['high', 'medium', 'low', 'missing'].includes(level) ? level : 'missing';
  const label = { high: 'High', medium: 'Medium', low: 'Low', missing: 'Not found' }[resolved];
  return <span className={`confidence-chip confidence-${resolved}`}>{label}</span>;
}

function DestinationToggle({ value, onChange }) {
  return (
    <fieldset className="batch-destination">
      <legend>Destination</legend>
      {['certificate', 'achievement'].map((option) => (
        <label key={option} className={`batch-destination-option${value === option ? ' is-active' : ''}`}>
          <input
            type="radio"
            name="batch-destination"
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
          />
          <span>{option === 'certificate' ? 'Certificate' : 'Achievement'}</span>
        </label>
      ))}
    </fieldset>
  );
}

function CategorySelect({ value, onChange }) {
  return (
    <label className="admin-field">
      <span>Category</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {['Certification', 'Training', 'Seminar', 'Workshop', 'Webinar', 'Conference',
          'Competition', 'CTF', 'Hackathon', 'Award', 'Academic Recognition', 'Participation',
          'Volunteer Recognition', 'Other'].map((category) => (
          <option key={category} value={category}>{category}</option>
        ))}
      </select>
    </label>
  );
}

export default function BatchImportWorkspace({ draft, onImport, onClose, existingRecords }) {
  const [files, setFiles] = useState([]);
  const [segmentStates, setSegmentStates] = useState({});
  const [busy, setBusy] = useState(false);
  const [batchNote, setBatchNote] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const addFiles = useCallback(async (incoming) => {
    const list = Array.from(incoming ?? []);
    if (files.length + list.length > MAX_BATCH) {
      setBatchNote(`Batches are limited to ${MAX_BATCH} files.`);
      return;
    }
    const prepared = await prepareBatch(list);
    setFiles((current) => [...current, ...prepared]);
    setBatchNote('');
  }, [files.length]);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    setDragActive(false);
    void addFiles(event.dataTransfer?.files);
  }, [addFiles]);

  const processFile = useCallback(async (entry) => {
    setSegmentStates((current) => ({ ...current, [entry.id]: { ...(current[entry.id] ?? {}), status: 'processing', progress: 0 } }));
    try {
      if (entry.kind === 'pdf') {
        const { pages, limitExceeded } = await extractPdfPages(entry.file, {
          onProgress: ({ status, progress }) => setSegmentStates((current) => ({
            ...current,
            [entry.id]: { ...(current[entry.id] ?? {}), status: 'processing', progress, note: status },
          })),
        });
        const segments = segmentPdfPages(pages);
        const parsedSegments = segments.map((segment) => {
          const text = segment.texts.join('\n');
          const fields = parseCertificateText(text).fields;
          const classification = classifyDocument(text);
          return { segment, text, fields, classification };
        });
        setSegmentStates((current) => ({
          ...current,
          [entry.id]: { status: 'complete', progress: 1, limitExceeded, segments: parsedSegments },
        }));
      } else {
        // Single image: one segment.
        const { extractCertificateDocument } = await import('../lib/certificate-ocr.js');
        const result = await extractCertificateDocument(entry.file, {
          onProgress: ({ progress, status }) => setSegmentStates((current) => ({
            ...current,
            [entry.id]: { ...(current[entry.id] ?? {}), status: 'processing', progress, note: status },
          })),
        });
        const classification = classifyDocument(result.rawText);
        const segment = {
          id: `img-${entry.id}`,
          pageStart: 0,
          pageEnd: 0,
          pages: [0],
          texts: [result.rawText],
          confidence: 'high',
          startScore: 0,
          pageRangeLabel: 'page 1',
        };
        setSegmentStates((current) => ({
          ...current,
          [entry.id]: {
            status: 'complete',
            progress: 1,
            limitExceeded: false,
            segments: [{ segment, text: result.rawText, fields: result.fields, classification }],
          },
        }));
      }
    } catch (error) {
      setSegmentStates((current) => ({
        ...current,
        [entry.id]: { ...(current[entry.id] ?? {}), status: 'failed', error: error?.message ?? 'Processing failed.' },
      }));
    }
  }, []);

  const processBatch = useCallback(async () => {
    setBusy(true);
    // Sequential by design.
    for (const entry of files) {
      if (entry.status === 'rejected') continue;
      // eslint-disable-next-line no-await-in-loop
      await processFile(entry);
    }
    setBusy(false);
  }, [files, processFile]);

  const updateSegment = useCallback((fileId, segmentId, patch) => {
    setSegmentStates((current) => {
      const entry = current[fileId];
      if (!entry) return current;
      return {
        ...current,
        [fileId]: {
          ...entry,
          segments: entry.segments.map((item) => (
            item.segment.id === segmentId ? { ...item, ...patch } : item
          )),
        },
      };
    });
  }, []);

  const setDestination = useCallback((fileId, segmentId, destination) => updateSegment(fileId, segmentId, { destination }), [updateSegment]);
  const setCategory = useCallback((fileId, segmentId, category) => updateSegment(fileId, segmentId, { category }), [updateSegment]);
  const toggleInclude = useCallback((fileId, segmentId) => updateSegment(fileId, segmentId, { included: true, status: 'approved' }), [updateSegment]);

  const summary = useMemo(() => {
    const entries = Object.values(segmentStates).flatMap((state) => (state.segments ?? []).map((item) => ({ status: item.status })));
    return batchSummary(entries);
  }, [segmentStates]);

  const intraBatchDuplicates = useMemo(() => {
    const all = [];
    for (const entry of files) {
      const state = segmentStates[entry.id];
      if (!state?.segments) continue;
      for (const item of state.segments) all.push(item);
    }
    const pairs = findIntraBatchDuplicates(all);
    // Map each duplicated segment id to the ids it duplicates.
    const map = new Map();
    for (const { a, b } of pairs) {
      const aId = all[a]?.segment?.id;
      const bId = all[b]?.segment?.id;
      if (aId && bId) {
        if (!map.has(aId)) map.set(aId, new Set());
        if (!map.has(bId)) map.set(bId, new Set());
        map.get(aId).add(bId);
        map.get(bId).add(aId);
      }
    }
    return map;
  }, [files, segmentStates]);

  const records = useMemo(() => {
    const out = [];
    for (const entry of files) {
      const state = segmentStates[entry.id];
      if (!state?.segments) continue;
      for (const item of state.segments) {
        if (item.status !== 'approved' && !item.keepBoth) continue;
        const record = buildRecordFromExtraction({
          id: item.segment.id,
          title: item.fields.title?.value,
          issuer: item.fields.issuer?.value,
          dateEarned: item.fields.dateEarned?.value,
          verifyUrl: item.fields.verifyUrl?.value,
          category: item.category ?? item.classification.category,
          destination: item.destination ?? item.classification.destination,
          featured: false,
          resume: false,
        });
        record.destination = item.destination ?? item.classification.destination;
        record.category = item.category ?? item.classification.category;
        record.categoryConfidence = item.classification.categoryConfidence;
        record.destinationConfidence = item.classification.destinationConfidence;
        out.push(record);
      }
    }
    return out;
  }, [files, segmentStates]);

  const [importedSegmentIds] = useState(() => new Set());

  const handleImport = useCallback(() => {
    if (!records.length) return;
    const fresh = records.filter((record) => !importedSegmentIds.has(record.id));
    for (const record of fresh) importedSegmentIds.add(record.id);
    if (!fresh.length) return;
    onImport?.(fresh.map((record) => ({ record, destination: record.destination })));
  }, [records, onImport, importedSegmentIds]);

  return (
    <section className="batch-import" aria-labelledby="batch-title">
      <div className="editor-section-heading">
        <div>
          <h2 id="batch-title">Import certificates & achievements</h2>
          <p>Upload one or many PDFs and images. Everything is processed locally; nothing is published or uploaded until you approve the records and save the draft.</p>
        </div>
        <button type="button" className="text-button" onClick={onClose}>Close</button>
      </div>

      <div
        className={`batch-drop${dragActive ? ' is-drag' : ''}`}
        role="button"
        tabIndex={0}
        aria-label="Drop PDF or image files here, or press Enter to browse"
        onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click(); }}
      >
        <p><strong>Drag and drop</strong> PDF, JPG, PNG or WebP files here</p>
        <p className="admin-muted">{formatLimitNote()}</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="application/pdf,image/jpeg,image/png,image/webp"
          hidden
          onChange={(event) => { void addFiles(event.target.files); event.target.value = ''; }}
        />
      </div>

      {batchNote ? <p className="batch-note" role="status">{batchNote}</p> : null}

      {files.length ? (
        <div className="batch-file-list">
          {files.map((entry) => {
            const state = segmentStates[entry.id] ?? {};
            const status = state.status ?? entry.status ?? 'queued';
            return (
              <fieldset className="batch-file" key={entry.id}>
                <legend>{entry.file?.name ?? 'unnamed'} <span className="admin-muted">{entry.size ? `· ${(entry.size / 1024).toLocaleString()} KB` : ''}</span></legend>
                <div className="batch-file-meta">
                  <span className={`batch-status batch-status-${status}`}>{STATUS_LABELS[status] ?? status}</span>
                  {state.note ? <span className="admin-muted">{state.note}</span> : null}
                  {state.limitExceeded ? <span className="admin-muted">Page limit reached — some pages were skipped.</span> : null}
                </div>
                {entry.status === 'rejected' ? <p className="field-error" role="alert">{entry.error}</p> : null}
                {state.error ? <p className="field-error" role="alert">{state.error}</p> : null}

                {state.segments?.map((item) => (
                  <div className="batch-segment" key={item.segment.id}>
                    <div className="batch-segment-heading">
                      <span className="batch-range">{item.segment.pageRangeLabel}</span>
                      <span className={`batch-confidence batch-confidence-${item.classification.destinationConfidence}`}>{item.classification.destinationConfidence}</span>
                    </div>
                    <div className="admin-form-grid">
                      <label className="admin-field">
                        <span>Title</span>
                        <input
                          value={item.fields.title?.value ?? ''}
                          onChange={(event) => updateSegment(entry.id, item.segment.id, { fields: { ...item.fields, title: { ...item.fields.title, value: event.target.value } } })}
                        />
                      </label>
                      <label className="admin-field">
                        <span>Issuer</span>
                        <input
                          value={item.fields.issuer?.value ?? ''}
                          onChange={(event) => updateSegment(entry.id, item.segment.id, { fields: { ...item.fields, issuer: { ...item.fields.issuer, value: event.target.value } } })}
                        />
                      </label>
                      <label className="admin-field">
                        <span>Recipient</span>
                        <input value={item.fields.recipient?.value ?? ''} readOnly />
                      </label>
                      <label className="admin-field">
                        <span>Date earned</span>
                        <input type="date" value={item.fields.dateEarned?.value ?? ''} onChange={(event) => updateSegment(entry.id, item.segment.id, { fields: { ...item.fields, dateEarned: { ...item.fields.dateEarned, value: event.target.value } } })} />
                      </label>
                      <label className="admin-field">
                        <span>Credential ID</span>
                        <input value={item.fields.credentialId?.value ?? ''} readOnly />
                      </label>
                      <label className="admin-field">
                        <span>Verification URL</span>
                        <input value={item.fields.verifyUrl?.value ?? ''} onChange={(event) => updateSegment(entry.id, item.segment.id, { fields: { ...item.fields, verifyUrl: { ...item.fields.verifyUrl, value: event.target.value } } })} />
                      </label>
                    </div>
                    <DestinationToggle
                      value={item.destination ?? item.classification.destination}
                      onChange={(destination) => updateSegment(entry.id, item.segment.id, { destination })}
                    />
                    <CategorySelect
                      value={item.category ?? item.classification.category}
                      onChange={(category) => updateSegment(entry.id, item.segment.id, { category })}
                    />
                    {intraBatchDuplicates.has(item.segment.id) ? (
                      <div className="batch-duplicate-note">
                        <p className="field-error" role="alert">
                          Possible duplicate of another file in this batch ({intraBatchDuplicates.get(item.segment.id).size} match{intraBatchDuplicates.get(item.segment.id).size === 1 ? '' : 'es'}).
                        </p>
                        <p className="admin-muted">
                          title <em>{item.fields.title?.value || '—'}</em>, issuer <em>{item.fields.issuer?.value || '—'}</em>, credential <em>{item.fields.credentialId?.value || '—'}</em>
                        </p>
                      </div>
                    ) : null}
                    <div className="admin-form-actions">
                      <button type="button" className="admin-button admin-button-primary" onClick={() => updateSegment(entry.id, item.segment.id, { status: 'approved', included: true })}>Approve for import</button>
                      <button type="button" className="admin-button" onClick={() => updateSegment(entry.id, item.segment.id, { status: 'approved', included: true, keepBoth: true })}>Keep both</button>
                      <button type="button" className="admin-button" onClick={() => updateSegment(entry.id, item.segment.id, { status: 'skipped' })}>Skip</button>
                    </div>
                  </div>
                ))}
              </fieldset>
            );
          })}
        </div>
      ) : (
        <p className="admin-muted">No files queued yet.</p>
      )}

      {summary.total ? (
        <div className="batch-summary">
          <h3>Batch summary</h3>
          <dl className="admin-record-summary">
            <div><dt>Total</dt><dd>{summary.total}</dd></div>
            <div><dt>Queued</dt><dd>{summary.queued}</dd></div>
            <div><dt>Processing</dt><dd>{summary.processing}</dd></div>
            <div><dt>Approved</dt><dd>{summary.approved}</dd></div>
            <div><dt>Needs review</dt><dd>{summary.needsReview}</dd></div>
            <div><dt>Failed</dt><dd>{summary.failed}</dd></div>
          </dl>
        </div>
      ) : null}

      {files.length ? (
        <div className="admin-form-actions">
          <button type="button" className="admin-button admin-button-primary" disabled={busy} onClick={processBatch}>Process batch</button>
          <button type="button" className="admin-button" disabled={busy || !records.length} onClick={handleImport}>Import {records.length} approved record{records.length === 1 ? '' : 's'} into draft</button>
        </div>
      ) : null}
    </section>
  );
}
