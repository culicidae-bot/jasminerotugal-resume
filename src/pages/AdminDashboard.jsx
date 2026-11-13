import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { designSettings as defaultDesign, presets } from '../data/design.js';
import { useSite } from '../lib/site-context.js';
import '../admin.css';
import { applyDesignTokens, normalizeDatabaseDesign, sectionVisibilityIds } from '../lib/design-settings.js';
import {
  applyRecordEdit,
  beginRecordEdit,
  cancelRecordEdit,
  updateRecordEdit,
} from '../lib/admin-records.js';
import {
  loadPortfolioDraft,
  loadPendingPublicAssetCleanupWithClient,
  mergePublishedPortfolioContent,
  publishPortfolioContent,
  resolvePortfolioAssetUrl,
  retryPublicAssetCleanup,
  savePortfolioDesign,
  savePortfolioDraft,
  unpublishPortfolioContent,
  uploadPortfolioAsset,
} from '../lib/portfolio-content.js';
import { getSupabaseClient } from '../lib/supabase.js';
import {
  FEATURED_LIMITS,
  RESUME_SOFT_LIMITS,
  selectFeatured,
  selectResume,
  sortByPriority,
  isResumeSelected,
  splitRecords,
} from '../lib/prioritize.js';
import { getResumePageCount, planResumeSections } from '../lib/resume.js';
import { countPublicProjectScreenshots } from '../lib/public-sections.js';
import { userFacingMessage, successMessages } from '../lib/messages.js';
import BatchImportWorkspace from '../components/BatchImportWorkspace.jsx';

const ACHIEVEMENT_TYPES = ['Achievement', 'Award'];
const SKILL_CATEGORY_OPTIONS = [
  'Technical',
  'Networking',
  'Cybersecurity',
  'Programming & Development',
  'Professional',
];

const navGroups = [
  {
    label: 'Overview',
    items: [
      ['overview', 'Overview'],
      ['preview', 'Preview'],
    ],
  },
  {
    label: 'Import',
    items: [
      ['import', 'Batch import'],
    ],
  },
  {
    label: 'Content',
    items: [
      ['profile', 'Profile'],
      ['skills', 'Skills'],
      ['certificates', 'Certificates'],
      ['achievements', 'Achievements'],
      ['eligibility', 'Eligibility'],
      ['experience', 'Experience'],
      ['education', 'Education'],
      ['projects', 'Projects'],
      ['security', 'Security focus'],
    ],
  },
  {
    label: 'Site',
    items: [
      ['design', 'Design'],
      ['settings', 'Website settings'],
    ],
  },
];

const sectionVisibilityLabels = {
  hero: 'Hero / profile banner',
  about: 'About me',
  skills: 'Skills',
  certificates: 'Certificates',
  eligibility: 'Eligibility',
  experience: 'Experience',
  projects: 'Projects',
  education: 'Education',
  security: 'Security practice',
  contact: 'Contact',
};

const listFields = {
  skills: [
    { key: 'category', label: 'Category', options: SKILL_CATEGORY_OPTIONS },
    { key: 'name', label: 'Skill name' },
    { key: 'proficiency', label: 'Proficiency (0–100)', type: 'number', min: 0, max: 100 },
    { key: 'label', label: 'Proficiency label' },
    { key: 'featured', label: 'Feature on Website', type: 'boolean' },
    { key: 'resume', label: 'Include in Resume', type: 'boolean' },
    { key: 'priority', label: 'Display Priority (lower shows first)', type: 'number', min: 0, max: 10000, allowEmpty: true },
  ],
  certificates: [
    { key: 'title', label: 'Certificate title' },
    { key: 'type', label: 'Type (certification, training, workshop, seminar)', options: ['IT Certification', 'Training', 'Workshop', 'Seminar', 'Certification'] },
    { key: 'issuer', label: 'Issuing organization' },
    { key: 'dateEarned', label: 'Date earned', type: 'date' },
    { key: 'verifyUrl', label: 'Verification URL' },
    { key: 'featured', label: 'Feature on Website', type: 'boolean' },
    { key: 'resume', label: 'Include in Resume', type: 'boolean' },
    { key: 'priority', label: 'Display Priority (lower shows first)', type: 'number', min: 0, max: 10000, allowEmpty: true },
  ],
  achievements: [
    { key: 'title', label: 'Achievement title' },
    { key: 'issuer', label: 'Issuing organization' },
    { key: 'dateEarned', label: 'Date earned', type: 'date' },
    { key: 'verifyUrl', label: 'Verification URL' },
    { key: 'featured', label: 'Feature on Website', type: 'boolean' },
    { key: 'resume', label: 'Include in Resume', type: 'boolean' },
    { key: 'priority', label: 'Display Priority (lower shows first)', type: 'number', min: 0, max: 10000, allowEmpty: true },
  ],
  eligibility: [
    { key: 'title', label: 'Eligibility or certification title' },
    { key: 'issuer', label: 'Issuing organization' },
    { key: 'dateConferred', label: 'Date conferred', type: 'date' },
    { key: 'status', label: 'Status', options: ['Completed', 'In progress', 'Planned'] },
    { key: 'verifyUrl', label: 'Verification URL' },
    { key: 'extra', label: 'Additional details' },
    { key: 'resume', label: 'Include in Resume', type: 'boolean' },
    { key: 'priority', label: 'Display Priority (lower shows first)', type: 'number', min: 0, max: 10000, allowEmpty: true },
  ],
  experience: [
    { key: 'role', label: 'Position / role' },
    { key: 'organization', label: 'Organization' },
    { key: 'period', label: 'Duration / period' },
    { key: 'summary', label: 'Summary' },
    { key: 'responsibilities', label: 'Responsibilities (one per line)', type: 'lines' },
    { key: 'accomplishments', label: 'Accomplishments (one per line)', type: 'lines' },
    { key: 'featured', label: 'Feature on Website', type: 'boolean' },
    { key: 'resume', label: 'Include in Resume', type: 'boolean' },
    { key: 'priority', label: 'Display Priority (lower shows first)', type: 'number', min: 0, max: 10000, allowEmpty: true },
  ],
  projects: [
    { key: 'title', label: 'Project title' },
    { key: 'type', label: 'Project type' },
    { key: 'year', label: 'Year' },
    { key: 'role', label: 'Your role' },
    { key: 'purpose', label: 'Purpose' },
    { key: 'summary', label: 'Description' },
    { key: 'technologies', label: 'Technologies (one per line)', type: 'lines' },
    { key: 'features', label: 'Key features (one per line)', type: 'lines' },
    { key: 'contributions', label: 'Your contributions (one per line)', type: 'lines' },
    { key: 'projectUrl', label: 'Live project URL' },
    { key: 'sourceUrl', label: 'Source code URL' },
    { key: 'featured', label: 'Feature on Website', type: 'boolean' },
    { key: 'resume', label: 'Include in Resume', type: 'boolean' },
    { key: 'priority', label: 'Display Priority (lower shows first)', type: 'number', min: 0, max: 10000, allowEmpty: true },
  ],
  securityProfiles: [
    { key: 'name', label: 'Profile name' },
    { key: 'detail', label: 'Description' },
    { key: 'url', label: 'Profile URL' },
  ],
  securityWriteups: [
    { key: 'title', label: 'Write-up title' },
    { key: 'summary', label: 'Summary' },
  ],
};

const CERTIFICATE_FILTER = (record) => !ACHIEVEMENT_TYPES.includes(record?.type);
const ACHIEVEMENT_FILTER = (record) => ACHIEVEMENT_TYPES.includes(record?.type);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readPath(value, path) {
  return path.split('.').reduce((current, key) => current?.[key], value);
}

function updatePath(value, path, nextValue) {
  const result = clone(value);
  const keys = path.split('.');
  let cursor = result;
  for (const key of keys.slice(0, -1)) cursor = cursor[key];
  cursor[keys[keys.length - 1]] = nextValue;
  return result;
}

function formatTimestamp(value) {
  if (!value) return 'Not recorded yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded yet';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function useAssetPreviewUrl(src) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setUrl('');
    setError('');
    if (!src) return () => { active = false; };

    resolvePortfolioAssetUrl(src)
      .then((previewUrl) => {
        if (active) setUrl(previewUrl);
      })
      .catch((previewError) => {
        if (active) setError(previewError.message);
      });

    return () => { active = false; };
  }, [src]);

  return { url, error };
}

function DraftAssetLink({ src, children }) {
  const { url, error } = useAssetPreviewUrl(src);
  if (error) return <span role="status">Preview unavailable: {error}</span>;
  if (!url) return <span>Preparing private preview…</span>;
  return <a href={url} target="_blank" rel="noreferrer">{children}</a>;
}

function DraftAssetImage({ src, alt, className }) {
  const { url, error } = useAssetPreviewUrl(src);
  if (error) return <span role="status">Preview unavailable: {error}</span>;
  if (!url) return <span>Preparing private preview…</span>;
  return <img className={className} src={url} alt={alt} />;
}

function TextField({ label, value, onChange, multiline = false, type = 'text', hint, options }) {
  const generatedId = useId();
  const id = `admin-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${generatedId}`;
  const listId = options ? `${id}-options` : undefined;
  const Control = multiline ? 'textarea' : 'input';
  return (
    <div className="admin-field">
      <label htmlFor={id}>{label}</label>
      <Control
        id={id}
        type={multiline ? undefined : type}
        value={value ?? ''}
        list={listId}
        onChange={(event) => onChange(event.target.value)}
        rows={multiline ? 4 : undefined}
      />
      {options ? (
        <datalist id={listId}>
          {options.map((option) => <option key={option} value={option} />)}
        </datalist>
      ) : null}
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

function CheckboxField({ label, checked, onChange, hint }) {
  const generatedId = useId();
  const id = `admin-checkbox-${generatedId}`;
  return (
    <div className="admin-field admin-checkbox-field">
      <label htmlFor={id} className="admin-checkbox-label">
        <input
          id={id}
          type="checkbox"
          checked={Boolean(checked)}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{label}</span>
      </label>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

function RecordListEditor({
  draft,
  path,
  fields,
  title,
  onChange,
  onUploadError,
  allowScreenshots = false,
  allowCertificateFile = false,
  onEditingChange = () => {},
  recordFilter = null,
  fixedType = '',
  addLabel = '',
  emptyTitle = 'No entries yet. Add one when you are ready.',
}) {
  const allRecords = readPath(draft, path) || [];
  const entries = allRecords
    .map((record, index) => ({ record, index }))
    .filter((entry) => (recordFilter ? recordFilter(entry.record) : true));
  const [editing, setEditing] = useState(null);
  const [attachmentState, setAttachmentState] = useState('idle');
  const [extraction, setExtraction] = useState(null);
  const lastCertificateFileRef = useRef(null);
  const autoFilledRef = useRef({});

  function addRecord() {
    const record = { id: crypto.randomUUID() };
    for (const field of fields) record[field.key] = field.type === 'lines' ? [] : field.type === 'boolean' ? false : '';
    if (fixedType) record.type = fixedType;
    else if (allowCertificateFile) record.type = '';
    if (allowScreenshots) record.screenshots = [];
    setAttachmentState('idle');
    setExtraction(null);
    autoFilledRef.current = {};
    setEditing({ key: `new:${record.id}`, index: allRecords.length, original: null, value: record });
    onEditingChange(path, true);
  }

  function startEditing(record, index) {
    setAttachmentState('idle');
    setExtraction(null);
    autoFilledRef.current = {};
    setEditing(beginRecordEdit(record, record.id ? `id:${record.id}` : `index:${index}`, index));
    onEditingChange(path, true);
  }

  function updateField(key, value) {
    setEditing((current) => updateRecordEdit(current, key, value));
  }

  function updateScreenshots(editKey, images) {
    setEditing((current) => current?.key === editKey
      ? { ...current, value: { ...current.value, screenshots: [...(current.value.screenshots || []), ...images] } }
      : current);
  }

  function commitEdit() {
    try {
      const nextRecords = applyRecordEdit(allRecords, editing);
      onChange((current) => updatePath(current, path, nextRecords));
      setEditing(null);
      onEditingChange(path, false);
    } catch (error) {
      onUploadError(error.message);
    }
  }

  function cancelEdit() {
    setEditing(cancelRecordEdit(editing));
    onEditingChange(path, false);
  }

  function removeRecord(record, index) {
    const key = record.id ? `id:${record.id}` : `index:${index}`;
    if (editing?.key === key) cancelEdit();
    onChange((current) => updatePath(
      current,
      path,
      (readPath(current, path) || []).filter((_, position) => position !== index),
    ));
  }

  async function addScreenshots(editKey, title, files) {
    const newImages = [];
    for (const file of Array.from(files)) {
      const src = await uploadPortfolioAsset(file);
      newImages.push({
        src,
        alt: `Screenshot of ${title || 'project'}`,
        width: 1440,
        height: 900,
        focalPoint: 'center',
        loading: 'lazy',
      });
    }
    updateScreenshots(editKey, newImages);
  }

  async function runExtraction(file) {
    if (!file) return;
    lastCertificateFileRef.current = file;
    const { extractCertificateDocument } = await import('../lib/certificate-ocr.js');
    setExtraction({ status: 'working', progress: 0, message: 'Preparing…', summary: null });
    try {
      const summary = await extractCertificateDocument(file, {
        onProgress: (message) => {
          setExtraction((current) => (
            current?.status === 'working'
              ? { ...current, progress: message.progress ?? current.progress, message: message.status ?? current.message }
              : current
          ));
        },
      });
      setExtraction({ status: 'done', progress: 1, message: '', summary });
      setEditing((current) => {
        if (!current) return current;
        const nextValue = { ...current.value };
        const nextAutoFilled = { ...autoFilledRef.current };
        const fill = (fieldKey) => {
          const extracted = summary.fields[fieldKey]?.value;
          if (!extracted) return;
          const untouched = !nextValue[fieldKey] || autoFilledRef.current[fieldKey];
          if (untouched) {
            nextValue[fieldKey] = extracted;
            nextAutoFilled[fieldKey] = true;
          }
        };
        fill('title');
        fill('issuer');
        fill('dateEarned');
        fill('verifyUrl');
        const suggestedType = summary.fields.type?.value;
        if (suggestedType && (!nextValue.type || autoFilledRef.current.type)) {
          nextValue.type = suggestedType;
          nextAutoFilled.type = true;
        }
        const recipient = summary.fields.recipient?.value;
        const credentialId = summary.fields.credentialId?.value;
        if (recipient || credentialId) {
          nextValue.extracted = {
            recipient: recipient || undefined,
            credentialId: credentialId || undefined,
            method: summary.method,
          };
        }
        autoFilledRef.current = nextAutoFilled;
        return { ...current, value: nextValue };
      });
    } catch (error) {
      setExtraction({ status: 'error', progress: 0, message: error?.message || 'Extraction failed.', summary: null });
    }
  }

  async function addCertificateFile(editKey, title, file) {
    const src = await uploadPortfolioAsset(file, { kind: 'certificate' });
    setEditing((current) => current?.key === editKey ? {
      ...current,
      value: {
        ...current.value,
        publicFile: {
          src,
          alt: `${title || 'Certificate'} document`,
          width: 1200,
          height: 1600,
          mimeType: file.type,
        },
      },
    } : current);
    void runExtraction(file);
  }

  useEffect(() => () => onEditingChange(path, false), [onEditingChange, path]);

  function renderAssetReferences(record) {
    return (
      <>
        {record.publicFile?.src ? <p><DraftAssetLink src={record.publicFile.src}>Open uploaded document</DraftAssetLink></p> : null}
        {(record.screenshots || []).map((image, imageIndex) => (
          <p key={`${image.src}-${imageIndex}`}><DraftAssetLink src={image.src}>Screenshot {imageIndex + 1}</DraftAssetLink></p>
        ))}
      </>
    );
  }

  function renderEditForm(value, key) {
    return (
      <>
        <div className="admin-form-grid">
          {fields.map((field) => {
            const fieldValue = value[field.key];
            if (field.type === 'boolean') {
              return (
                <CheckboxField
                  key={field.key}
                  label={field.label}
                  checked={Boolean(fieldValue)}
                  onChange={(nextValue) => updateField(field.key, nextValue)}
                />
              );
            }
            const shownValue = field.type === 'lines' ? (Array.isArray(fieldValue) ? fieldValue.join('\n') : '') : fieldValue;
            return (
              <TextField
                key={field.key}
                label={field.label}
                type={field.type === 'number' || field.type === 'date' ? field.type : 'text'}
                multiline={field.type === 'lines' || field.key === 'summary' || field.key === 'purpose'}
                value={shownValue}
                options={field.options}
                onChange={(nextValue) => {
                  const parsedValue = field.type === 'lines'
                    ? nextValue.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
                    : field.type === 'number'
                      ? nextValue.trim() === '' && field.allowEmpty
                        ? ''
                        : Math.min(field.max ?? 100, Math.max(field.min ?? 0, Number(nextValue) || 0))
                      : nextValue;
                  updateField(field.key, parsedValue);
                }}
              />
            );
          })}
        </div>
        {allowScreenshots ? (
          <div className="admin-field">
            <label htmlFor={`project-images-${key}`}>Project screenshots</label>
            <input
              id={`project-images-${key}`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => {
                if (event.target.files?.length) {
                  addScreenshots(key, value.title, event.target.files).catch((error) => onUploadError(error.message));
                }
                event.target.value = '';
              }}
            />
            <small>{(value.screenshots || []).length} uploaded; add at least 2 screenshots for each project.</small>
            {(value.screenshots || []).map((image, imageIndex) => (
              <p key={`${image.src}-${imageIndex}`}>
                <DraftAssetLink src={image.src}>Screenshot {imageIndex + 1}</DraftAssetLink>
                {' · '}
                <button
                  className="text-button"
                  type="button"
                  onClick={() => updateField('screenshots', value.screenshots.filter((_, position) => position !== imageIndex))}
                >
                  Remove
                </button>
              </p>
            ))}
          </div>
        ) : null}
        {allowCertificateFile ? (
          <div className="admin-field admin-attachment">
            <label htmlFor={`certificate-file-${key}`}>
              {value.publicFile?.src ? 'Replace certificate attachment' : 'Certificate attachment'} (JPG, PNG, WebP, or PDF)
            </label>
            <input
              id={`certificate-file-${key}`}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              disabled={attachmentState === 'uploading'}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setAttachmentState('uploading');
                  addCertificateFile(key, value.title, file)
                    .then(() => setAttachmentState('done'))
                    .catch((error) => {
                      setAttachmentState('idle');
                      onUploadError(error.message);
                    });
                }
                event.target.value = '';
              }}
            />
            <small>Up to 2 MB for images, 10 MB for PDFs. Attachments are private drafts until you publish.</small>
            {attachmentState === 'uploading' ? <p role="status">Uploading attachment…</p> : null}
            {attachmentState === 'done' ? <p role="status">Attachment saved to the private draft.</p> : null}
            {value.publicFile?.src ? (
              <div className="attachment-preview">
                {value.publicFile?.mimeType?.startsWith('image/') ? (
                  <DraftAssetImage className="attachment-thumb" src={value.publicFile.src} alt={value.publicFile.alt || ''} />
                ) : (
                  <DraftAssetLink src={value.publicFile.src}>Open uploaded document</DraftAssetLink>
                )}
                <div className="attachment-actions">
                  <button className="text-button" type="button" onClick={() => updateField('publicFile', null)}>Remove attachment</button>
                </div>
              </div>
            ) : null}

            {extraction ? (
              <div className="extraction-panel" role="region" aria-label="Extracted certificate information">
                <div className="extraction-heading">
                  <h4>Review extracted information</h4>
                  {extraction.status === 'working' ? <span className="extraction-badge extraction-badge-ok">Reading…</span> : null}
                  {extraction.status === 'done' ? <span className="extraction-badge extraction-badge-ok">Extracted — please review</span> : null}
                  {extraction.status === 'error' ? <span className="extraction-badge extraction-badge-error">Extraction failed</span> : null}
                </div>
                {extraction.status === 'working' ? (
                  <p className="extraction-progress" role="status">{extraction.message} · {Math.round((extraction.progress ?? 0) * 100)}%</p>
                ) : null}
                {extraction.status === 'error' ? (
                  <p className="extraction-progress" role="alert">{extraction.message}</p>
                ) : null}
                {extraction.status === 'done' && extraction.summary ? (
                  <>
                    <ul className="extraction-list">
                      {[
                        ['Title', extraction.summary.fields.title],
                        ['Issuer', extraction.summary.fields.issuer],
                        ['Date earned', extraction.summary.fields.dateEarned],
                        ['Recipient', extraction.summary.fields.recipient],
                        ['Credential ID', extraction.summary.fields.credentialId],
                        ['Verification URL', extraction.summary.fields.verifyUrl],
                        ['Suggested type', extraction.summary.fields.type],
                      ].map(([label, field]) => (
                        <li className="extraction-row" key={label}>
                          <span className="extraction-row-label">{label}</span>
                          <span className="extraction-row-value">{field?.value || '—'}</span>
                          <span className={`confidence-chip confidence-${field?.confidence ?? 'missing'}`}>
                            {field?.confidence === 'high' && 'High'}
                            {field?.confidence === 'medium' && 'Medium'}
                            {field?.confidence === 'low' && 'Low — check'}
                            {(field?.confidence === 'missing' || !field?.confidence) && 'Not found'}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {extraction.summary.notes?.length ? (
                      <ul className="extraction-notes">
                        {extraction.summary.notes.map((note, index) => <li key={index}>{note}</li>)}
                      </ul>
                    ) : null}
                    <div className="admin-form-actions">
                      <button className="admin-button" type="button" onClick={() => lastCertificateFileRef.current && runExtraction(lastCertificateFileRef.current)}>Extract again</button>
                      <button className="admin-button" type="button" onClick={() => setExtraction(null)}>Dismiss review</button>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="admin-form-actions">
          <button className="admin-button admin-button-primary" type="button" onClick={commitEdit}>Update</button>
          <button className="admin-button" type="button" onClick={cancelEdit}>Cancel</button>
        </div>
      </>
    );
  }

  return (
    <section className="editor-section">
      <div className="editor-section-heading">
        <div>
          <h2>{title}</h2>
          <p>Unpublished records stay hidden from recruiters.</p>
        </div>
        <button className="admin-button" type="button" disabled={Boolean(editing)} onClick={addRecord}>
          {addLabel || `Add ${title.toLowerCase()}`}
        </button>
      </div>
      {entries.length === 0 && !editing ? <p className="admin-empty">{emptyTitle}</p> : null}
      <div className="record-list">
        {entries.map(({ record, index }) => {
          const key = record.id ? `id:${record.id}` : `index:${index}`;
          const isEditing = editing?.key === key;
          const value = isEditing ? editing.value : record;
          return (
            <fieldset className="record-card" key={key}>
              <legend>{value.title || value.name || value.role || `${title} ${index + 1}`}{value.featured ? ' ★' : ''}</legend>
              {isEditing ? (
                renderEditForm(value, key)
              ) : (
                <>
                  <dl className="admin-record-summary">
                    {fields.map((field) => {
                      const fieldValue = record[field.key];
                      const textValue = typeof fieldValue === 'boolean'
                        ? (fieldValue ? 'Yes' : '')
                        : Array.isArray(fieldValue) ? fieldValue.join(', ') : fieldValue;
                      return textValue ? (
                        <div key={field.key}>
                          <dt>{field.label}</dt>
                          <dd>{textValue}</dd>
                        </div>
                      ) : null;
                    })}
                  </dl>
                  {renderAssetReferences(record)}
                  <div className="admin-form-actions">
                    <button className="admin-button" type="button" onClick={() => startEditing(record, index)}>Edit</button>
                    <button className="admin-button admin-button-danger" type="button" onClick={() => removeRecord(record, index)}>Remove entry</button>
                  </div>
                </>
              )}
            </fieldset>
          );
        })}
        {editing && !editing.original ? (
          <fieldset className="record-card" key={editing.key}>
            <legend>{editing.value.title || editing.value.name || `${title} ${allRecords.length + 1}`}</legend>
            {renderEditForm(editing.value, editing.key)}
          </fieldset>
        ) : null}
      </div>
    </section>
  );
}

function OverviewStat({ label, value, detail }) {
  return (
    <div className="admin-stat-card">
      <p className="admin-stat-value">{value}</p>
      <p className="admin-stat-label">{label}</p>
      {detail ? <p className="admin-stat-detail">{detail}</p> : null}
    </div>
  );
}

function PreviewPanel({ draft, onGoToTab }) {
  const [pageCount, setPageCount] = useState(null);
  const [pageCountError, setPageCountError] = useState('');

  useEffect(() => {
    let active = true;
    setPageCount(null);
    setPageCountError('');
    getResumePageCount(draft)
      .then((count) => {
        if (active) setPageCount(count);
      })
      .catch((error) => {
        if (active) setPageCountError(error.message);
      });
    return () => {
      active = false;
    };
  }, [draft]);

  const summary = useMemo(() => {
    const split = splitRecords(draft.certificates || []);
    const resumeIncludes = (items, softLimit) => selectResume(items || [], softLimit);
    return {
      skills: { included: resumeIncludes(draft.skills, RESUME_SOFT_LIMITS.skills).length, total: draft.skills?.length || 0 },
      experience: {
        included: ['work', 'internship', 'volunteer', 'academic']
          .reduce((total, group) => total + resumeIncludes(draft.experience?.[group], RESUME_SOFT_LIMITS.experience).length, 0),
        total: ['work', 'internship', 'volunteer', 'academic']
          .reduce((total, group) => total + (draft.experience?.[group]?.length || 0), 0),
      },
      projects: { included: resumeIncludes(draft.projects, RESUME_SOFT_LIMITS.projects).length, total: draft.projects?.length || 0 },
      certificates: { included: resumeIncludes(split.certificates, RESUME_SOFT_LIMITS.certificates).length, total: split.certificates.length },
      achievements: { included: resumeIncludes(split.achievements, RESUME_SOFT_LIMITS.achievements).length, total: split.achievements.length },
      eligibility: { included: resumeIncludes(draft.eligibility, RESUME_SOFT_LIMITS.eligibility).length, total: draft.eligibility?.length || 0 },
      featured: {
        skills: selectFeatured(draft.skills || [], FEATURED_LIMITS.skills),
        projects: selectFeatured(draft.projects || [], FEATURED_LIMITS.projects),
        certificates: selectFeatured(split.certificates, FEATURED_LIMITS.certificates),
        achievements: selectFeatured(split.achievements, FEATURED_LIMITS.achievements),
      },
    };
  }, [draft]);

  const excludedFromResume = useMemo(() => {
    const buckets = [
      ['skills', draft.skills],
      ['projects', draft.projects],
      ['certificates', (draft.certificates || []).filter((record) => !ACHIEVEMENT_TYPES.includes(record?.type))],
      ['achievements', (draft.certificates || []).filter((record) => ACHIEVEMENT_TYPES.includes(record?.type))],
      ['eligibility', draft.eligibility],
    ];
    return buckets.flatMap(([bucket, items]) =>
      (items || []).filter((item) => !isResumeSelected(item)).map((item) => ({
        bucket,
        name: item.name || item.title || item.role || 'Untitled',
      })),
    );
  }, [draft]);

  const nameOf = (item) => item.name || item.title || `${item.role} — ${item.organization}` || 'Untitled';

  return (
    <section className="editor-section">
      <div className="editor-section-heading">
        <div>
          <h2>Preview</h2>
          <p>What the public site and your generated resume will show. Built from your draft — the public site uses the last published version.</p>
        </div>
        <a className="admin-button admin-button-primary" href="/preview" target="_blank" rel="noopener noreferrer">Open public preview</a>
      </div>

      <div className="admin-preview-grid">
        <div className="admin-overview-panel">
          <h3>Resume selection (draft)</h3>
          <p className="admin-overview-note">
            Records marked “Include in Resume” — plus legacy records until you say otherwise —
            regenerate the public PDF on your next publish.
          </p>
          <dl className="admin-record-summary">
            <div><dt>Skills</dt><dd>{summary.skills.included} of {summary.skills.total}</dd></div>
            <div><dt>Experience entries</dt><dd>{summary.experience.included} of {summary.experience.total}</dd></div>
            <div><dt>Projects</dt><dd>{summary.projects.included} of {summary.projects.total}</dd></div>
            <div><dt>Certificates</dt><dd>{summary.certificates.included} of {summary.certificates.total}</dd></div>
            <div><dt>Achievements</dt><dd>{summary.achievements.included} of {summary.achievements.total}</dd></div>
            <div><dt>Eligibility</dt><dd>{summary.eligibility.included} of {summary.eligibility.total}</dd></div>
          </dl>
          <p className="admin-resume-pages" role="status">
            {pageCountError
              ? `Resume length estimate unavailable: ${pageCountError}`
              : pageCount === null
                ? 'Estimating resume length…'
                : `Estimated resume length: ${pageCount} page${pageCount === 1 ? '' : 's'}`}
          </p>
          {excludedFromResume.length ? (
            <>
              <h4 className="admin-checklist-title">Excluded from the resume</h4>
              <ul className="admin-checklist">
                {excludedFromResume.map((item, index) => (
                  <li key={index} className="is-pending">
                    <span className="admin-check-mark" aria-hidden="true">–</span>
                    <span>{item.name} <span className="admin-muted">({item.bucket})</span></span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        <div className="admin-overview-panel">
          <h3>Featured on the homepage (draft)</h3>
          <p className="admin-overview-note">
            Records marked “Feature on Website” fill these slots; the rest stay available through
            the View all links.
          </p>
          {[
            ['skills', summary.featured.skills, 'Skills', 'skills'],
            ['certificates', summary.featured.certificates, 'Certificates', 'certificates'],
            ['achievements', summary.featured.achievements, 'Achievements', 'achievements'],
            ['projects', summary.featured.projects, 'Projects', 'projects'],
          ].map(([bucket, items, label, tab]) => (
            <div key={bucket} className="admin-preview-bucket">
              <h4 className="admin-checklist-title">
                {label} — {items.length} shown
                <button type="button" className="text-button" onClick={() => onGoToTab(tab)}>edit</button>
              </h4>
              {items.length ? (
                <ul className="admin-preview-list">
                  {items.map((item, index) => <li key={index}>{nameOf(item)}</li>)}
                </ul>
              ) : (
                <p className="admin-muted">No {label.toLowerCase()} published yet.</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="admin-overview-panel admin-preview-resume">
        <h3>Resume outline (draft)</h3>
        <p className="admin-overview-note">Line-by-line outline of the PDF that will be generated on publish.</p>
        <ol className="admin-resume-outline">
          {planResumeSections(draft).map((section, index) => (
            <li key={index}>
              <span className="admin-resume-outline-title">{section.title || section.id}</span>
              <span className="admin-muted">
                {section.id === 'header' || section.id === 'more' || section.id === 'summary'
                  ? '1 block'
                  : `${section.entries?.length ?? section.groups?.length ?? 0} entries`}
              </span>
            </li>
          ))}
        </ol>
        <p className="admin-overview-note">
          The public resume always reflects the last <em>published</em> content. Publish when the selection looks right.
        </p>
      </div>
    </section>
  );
}

export default function AdminDashboard({ onLogout }) {
  const site = useSite();
  const { content, design, onPublishedContentChange, onDesignChange } = site;
  const [draft, setDraft] = useState(() => clone(content));
  const [savedDraft, setSavedDraft] = useState(() => clone(content));
  const [editRevision, setEditRevision] = useState(0);
  const [openRecordEditors, setOpenRecordEditors] = useState({});
  const [designDraft, setDesignDraft] = useState(() => ({
    theme_mode: design.activePreset || defaultDesign.activePreset,
    font_scale: design.typography?.scale || defaultDesign.typography.scale,
    content_width: design.contentWidth || defaultDesign.contentWidth,
    section_spacing: design.sectionSpacing || defaultDesign.sectionSpacing,
    section_padding: design.padding || 88,
    hero_variant: design.heroVariant || defaultDesign.heroVariant,
    background_color: design.palette?.background || presets[design.activePreset]?.colors.bg || '#0E1116',
    surface_color: design.palette?.surface || presets[design.activePreset]?.colors.surface || '#161C24',
    primary_color: design.palette?.primary || presets[design.activePreset]?.colors.primary || '#9B83F5',
    text_color: design.palette?.text || presets[design.activePreset]?.colors.text || '#E8EEF5',
    font_url: design.fontUrl || '',
    section_visibility: { ...defaultDesign.sectionVisibility, ...(design.sectionVisibility || {}) },
    skills_layout: design.skillsLayout || defaultDesign.skillsLayout,
    projects_layout: design.projectsLayout || defaultDesign.projectsLayout,
    certificates_layout: design.certificatesLayout || defaultDesign.certificatesLayout,
  }));
  const [activeTab, setActiveTab] = useState('overview');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadState, setLoadState] = useState('loading');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isPublished, setIsPublished] = useState(false);
  const [contentUpdatedAt, setContentUpdatedAt] = useState(null);
  const [needsAssetCleanup, setNeedsAssetCleanup] = useState(false);
  const [cleanupPaths, setCleanupPaths] = useState([]);

  const preset = useMemo(() => presets[designDraft.theme_mode] || presets['graphite-violet'], [designDraft.theme_mode]);
  const hasUncommittedRecordEdit = Object.values(openRecordEditors).some(Boolean);
  const reportRecordEditing = useCallback((path, isOpen) => {
    setOpenRecordEditors((current) => ({ ...current, [path]: isOpen }));
  }, []);

  const stats = useMemo(() => {
    const certificates = (draft.certificates || []).filter(CERTIFICATE_FILTER);
    const achievements = (draft.certificates || []).filter(ACHIEVEMENT_FILTER);
    const educationEntries = ['tertiary', 'secondary', 'elementary']
      .filter((level) => {
        const entry = draft.education?.[level];
        return Boolean(entry && (entry.institution || entry.course || entry.yearGraduated || entry.achievement));
      }).length;
    const experienceEntries = ['work', 'internship', 'volunteer', 'academic']
      .reduce((total, group) => total + ((draft.experience?.[group] || []).length), 0);
    return {
      projects: (draft.projects || []).length,
      certificates: certificates.length,
      achievements: achievements.length,
      skills: (draft.skills || []).length,
      education: educationEntries,
      experience: experienceEntries,
    };
  }, [draft]);

  const readiness = useMemo(() => {
    const projects = draft.projects || [];
    const projectsReady = projects.length > 0 && projects.every(
      (project) => Array.isArray(project.screenshots) && project.screenshots.length >= 2,
    );
    return [
      { label: 'Professional photo uploaded', done: Boolean(draft.hero?.portrait?.src), tab: 'profile' },
      { label: 'Resume override uploaded (optional; otherwise generated on publish)', done: Boolean(draft.resumePath), tab: 'settings' },
      { label: 'Professional email set', done: Boolean(draft.contact?.email), tab: 'profile' },
      { label: 'At least one skill listed', done: (draft.skills || []).length > 0, tab: 'skills' },
      { label: 'Every project has at least 2 screenshots', done: projectsReady, tab: 'projects' },
    ];
  }, [draft]);

  useEffect(() => {
    let active = true;
    async function loadAdminContent() {
      setLoadState('loading');
      setStatus('');
      try {
        const { content: saved, published, cleanupNeeded, updatedAt } = await loadPortfolioDraft();
        if (!active) return;
        const loadedDraft = saved ? mergePublishedPortfolioContent(content, saved) : clone(content);
        setDraft(loadedDraft);
        setSavedDraft(clone(loadedDraft));
        setIsPublished(published);
        setContentUpdatedAt(updatedAt || null);
        setNeedsAssetCleanup(Boolean(cleanupNeeded));
        setLoadState('ready');

        try {
          const pendingCleanupPaths = await loadPendingPublicAssetCleanupWithClient(getSupabaseClient());
          if (!active) return;
          setCleanupPaths(pendingCleanupPaths);
          setNeedsAssetCleanup(Boolean(cleanupNeeded) || pendingCleanupPaths.length > 0);
        } catch (error) {
          if (active) {
            setStatus(userFacingMessage(error, 'cleanup'));
          }
        }
      } catch (error) {
        if (!active) return;
        setLoadState('error');
        setStatus(userFacingMessage(error, 'load'));
      }
    }

    loadAdminContent();
    return () => {
      active = false;
    };
  }, [loadAttempt]);

  useEffect(() => {
    let timer;
    const resetTimer = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        onLogout();
      }, 20 * 60 * 1000);
    };
    const events = ['pointerdown', 'keydown', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      window.clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [onLogout]);

  async function saveDraft() {
    if (hasUncommittedRecordEdit) {
      setStatus('Update or cancel the open record before saving the draft.');
      return;
    }
    setBusy(true);
    setStatus('');
    try {
      await savePortfolioDraft(draft);
      setSavedDraft(clone(draft));
      setContentUpdatedAt(new Date().toISOString());
      setStatus(successMessages.draftSaved);
    } catch (error) {
      setStatus(userFacingMessage(error, 'save'));
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (hasUncommittedRecordEdit) {
      setStatus('Update or cancel the open record before publishing.');
      return;
    }
    const incompleteProjects = draft.projects.filter(
      (project) => countPublicProjectScreenshots(project) < 2,
    );
    if (incompleteProjects.length) {
      setActiveTab('projects');
      const names = incompleteProjects
        .map((project) => `"${project.title?.trim() || 'Untitled project'}"`)
        .join(', ');
      setStatus(
        `Add at least 2 valid screenshots with descriptions before publishing: ${names}.`,
      );
      return;
    }

    setBusy(true);
    setStatus('');
    try {
      const { content: publishedContent, warnings, cleanupCandidates } =
        await publishPortfolioContent(draft);
      setSavedDraft(clone(draft));
      setIsPublished(true);
      setContentUpdatedAt(new Date().toISOString());
      onPublishedContentChange(publishedContent);
      setCleanupPaths(cleanupCandidates);
      setNeedsAssetCleanup(cleanupCandidates.length > 0);
      setStatus(warnings.length ? `Published successfully. ${warnings.length} item${warnings.length === 1 ? '' : 's'} need attention — you can retry the cleanup below.` : successMessages.published);
    } catch (error) {
      setStatus(userFacingMessage(error, 'publish'));
    } finally {
      setBusy(false);
    }
  }

  async function unpublish() {
    setBusy(true);
    setStatus('');
    try {
      const { cleanupError, content: privateDraft, cleanupCandidates, retainedPaths } =
        await unpublishPortfolioContent();
      if (privateDraft) setDraft(privateDraft);
      if (privateDraft) setSavedDraft(clone(privateDraft));
      setIsPublished(false);
      setContentUpdatedAt(new Date().toISOString());
      setCleanupPaths(cleanupCandidates);
      setNeedsAssetCleanup(Boolean(cleanupError) || cleanupCandidates.length > 0);
      onPublishedContentChange(null);
      setStatus(
        cleanupError
          ? 'Your portfolio is no longer public. Some cleanup tasks remain — you can retry below.'
          : retainedPaths.length
            ? 'Your portfolio is no longer public. Some media remain referenced by other content.'
            : successMessages.unpublished,
      );
    } catch (error) {
      setStatus(userFacingMessage(error, 'unpublish'));
    } finally {
      setBusy(false);
    }
  }

  async function retryAssetCleanup() {
    if (!cleanupPaths.length) {
      await unpublish();
      return;
    }

    setBusy(true);
    setStatus('');
    try {
      const { pendingPaths, retainedPaths } = await retryPublicAssetCleanup(cleanupPaths);
      setCleanupPaths(pendingPaths);
      setNeedsAssetCleanup(pendingPaths.length > 0);
      setStatus(
        pendingPaths.length
          ? 'Some cleanup is still in progress. You can retry again shortly.'
          : retainedPaths.length
            ? 'Cleanup is complete. Some assets remain referenced by published content.'
            : 'Cleanup is complete.',
      );
    } catch (error) {
      setStatus(userFacingMessage(error, 'cleanup'));
    } finally {
      setBusy(false);
    }
  }

  async function saveDesign() {
    setBusy(true);
    setStatus('');
    try {
      const { settings: publishedSettings, cleanupError, cleanupCandidates } =
        await savePortfolioDesign(designDraft);
      if (cleanupCandidates.length) {
        setCleanupPaths(cleanupCandidates);
        setNeedsAssetCleanup(true);
      } else {
        setCleanupPaths([]);
        setNeedsAssetCleanup(false);
      }
      setDesignDraft((current) => ({ ...current, ...publishedSettings }));
      const nextDesign = normalizeDatabaseDesign(publishedSettings);
      applyDesignTokens(nextDesign);
      onDesignChange(nextDesign);
      setStatus(
        cleanupError
          ? 'Design saved and published, but some older assets could not be removed. You can retry the cleanup below.'
          : 'Design settings saved and published.',
      );
    } catch (error) {
      setStatus(userFacingMessage(error, 'design'));
    } finally {
      setBusy(false);
    }
  }

  async function uploadProfilePhoto(file) {
    const src = await uploadPortfolioAsset(file);
    const next = updatePath(draft, 'hero.portrait', {
      ...(draft.hero.portrait || {}),
      src,
      alt: draft.hero.portrait?.alt || `${draft.hero.name} professional portrait`,
      width: 960,
      height: 1200,
      focalPoint: 'upper-center',
      loading: 'eager',
    });
    setDraft(next);
    setStatus(successMessages.photoUploaded);
  }

  async function uploadAboutImage(file) {
    const src = await uploadPortfolioAsset(file);
    const next = updatePath(draft, 'about.image', {
      ...(draft.about.image || {}),
      src,
      alt: draft.about.image?.alt || '',
      width: 1440,
      height: 960,
      focalPoint: 'center',
      loading: 'lazy',
    });
    setDraft(next);
    setStatus(successMessages.aboutImageUploaded);
  }

  async function uploadResume(file) {
    const url = await uploadPortfolioAsset(file, { kind: 'resume' });
    setDraft((current) => ({ ...current, resumePath: url }));
    setStatus(successMessages.resumeUploaded);
  }

  async function uploadFont(file) {
    const url = await uploadPortfolioAsset(file, { kind: 'font' });
    setDesignDraft((current) => ({ ...current, font_url: url }));
    setStatus(successMessages.fontUploaded);
  }

  function updateDesign(key, value) {
    setDesignDraft((current) => ({
      ...current,
      [key]: value,
      ...(key === 'theme_mode' && presets[value]
        ? {
            background_color: presets[value].colors.bg,
            surface_color: presets[value].colors.surface,
            primary_color: presets[value].colors.primary,
            text_color: presets[value].colors.text,
          }
        : {}),
    }));
  }

  function toggleSectionVisibility(id, visible) {
    setDesignDraft((current) => ({
      ...current,
      section_visibility: { ...defaultDesign.sectionVisibility, ...(current.section_visibility || {}), [id]: visible },
    }));
  }

  function discardContentEdits() {
    setDraft(clone(savedDraft));
    setEditRevision((current) => current + 1);
    setOpenRecordEditors({});
    setStatus('Unsaved portfolio edits were discarded.');
  }

  const badgeCounts = {
    skills: stats.skills,
    certificates: stats.certificates,
    achievements: stats.achievements,
    eligibility: (draft.eligibility || []).length,
    experience: stats.experience,
    projects: stats.projects,
    security: (draft.securityFocus?.profiles || []).length + (draft.securityFocus?.writeups || []).length,
  };

  return (
    <main id="main" tabIndex="-1" className="admin-dashboard admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <p className="admin-kicker">Private area</p>
          <p className="admin-sidebar-title">Portfolio admin</p>
          <p className="admin-sidebar-subtitle">Content manager</p>
        </div>
        <nav className="admin-sidebar-nav" aria-label="Admin sections">
          {navGroups.map((group) => (
            <div className="admin-sidebar-group" key={group.label}>
              <p className="admin-sidebar-group-label">{group.label}</p>
              {group.items.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={activeTab === id ? 'admin-side-link is-active' : 'admin-side-link'}
                  aria-current={activeTab === id ? 'page' : undefined}
                  onClick={() => setActiveTab(id)}
                >
                  <span>{label}</span>
                  {badgeCounts[id] ? <span className="admin-side-badge">{badgeCounts[id]}</span> : null}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="admin-sidebar-foot">
          <div className={`admin-publish-state${isPublished ? ' is-published' : ''}`}>
            <span className="admin-publish-dot" aria-hidden="true" />
            {isPublished ? 'Published' : 'Draft only'}
          </div>
          <a className="admin-side-link admin-side-link-subtle" href="/preview" target="_blank" rel="noopener noreferrer">Preview draft ↗</a>
          <a className="admin-side-link admin-side-link-subtle" href="/" target="_blank" rel="noopener noreferrer">View public site ↗</a>
          <button className="admin-button admin-button-block" type="button" onClick={onLogout}>Log out</button>
        </div>
      </aside>

      <div className="admin-main">
        {loadState !== 'ready' ? (
          <section className="editor-section" aria-labelledby="admin-load-title">
            <h2 id="admin-load-title">
              {loadState === 'loading' ? 'Loading your saved portfolio…' : 'We couldn’t load your saved portfolio'}
            </h2>
            <p role="status" aria-live="polite">
              {loadState === 'loading'
                ? 'Your saved content is loading. Editing and publishing are paused until it is ready.'
                : status}
            </p>
            {loadState === 'error' ? (
              <button
                className="admin-button admin-button-primary"
                type="button"
                onClick={() => setLoadAttempt((current) => current + 1)}
              >
                Retry loading
              </button>
            ) : null}
          </section>
        ) : (
          <>
      {activeTab === 'overview' ? (
        <section className="editor-section">
          <div className="editor-section-heading">
            <div>
              <h2>Overview</h2>
              <p>Snapshot of your portfolio content. Nothing here is visible publicly until you publish.</p>
            </div>
            <a className="admin-button admin-button-primary" href="/preview" target="_blank" rel="noopener noreferrer">Preview draft</a>
          </div>
          <div className="admin-stat-grid">
            <OverviewStat label="Projects" value={stats.projects} detail="published after next release" />
            <OverviewStat label="Certificates" value={stats.certificates} detail="credential records" />
            <OverviewStat label="Achievements" value={stats.achievements} detail="awards & recognitions" />
            <OverviewStat label="Skills" value={stats.skills} detail="across all categories" />
            <OverviewStat label="Education entries" value={stats.education} detail="tertiary / secondary / elementary" />
            <OverviewStat label="Experience entries" value={stats.experience} detail="work, OJT, volunteer, academic" />
          </div>
          <div className="admin-overview-grid">
            <div className="admin-overview-panel">
              <h3>Publish status</h3>
              <p>
                {isPublished
                  ? 'Your portfolio is published. Recruiters see the last published version.'
                  : 'Your portfolio is not published. Recruiters cannot see your draft content.'}
              </p>
              <dl className="admin-record-summary">
                <div>
                  <dt>Last content save</dt>
                  <dd>{formatTimestamp(contentUpdatedAt)}</dd>
                </div>
                <div>
                  <dt>Visibility</dt>
                  <dd>{isPublished ? 'Published' : 'Hidden (draft only)'}</dd>
                </div>
                <div>
                  <dt>Assets pending cleanup</dt>
                  <dd>{needsAssetCleanup ? `${cleanupPaths.length || 'Some'} asset(s) queued` : 'None'}</dd>
                </div>
              </dl>
              <div className="admin-form-actions">
                {needsAssetCleanup ? (
                  <button className="admin-button" type="button" disabled={busy} onClick={retryAssetCleanup}>Retry public asset cleanup</button>
                ) : null}
                {isPublished ? (
                  <button className="admin-button admin-button-danger" type="button" disabled={busy} onClick={unpublish}>Unpublish</button>
                ) : (
                  <button className="admin-button admin-button-primary" type="button" disabled={busy} onClick={publish}>Publish to recruiters</button>
                )}
              </div>
            </div>
            <div className="admin-overview-panel">
              <h3>Launch readiness</h3>
              <ul className="admin-checklist">
                {readiness.map((item) => (
                  <li key={item.label} className={item.done ? 'is-done' : 'is-pending'}>
                    <span className="admin-check-mark" aria-hidden="true">{item.done ? '✓' : '!'}</span>
                    <button type="button" className="text-button" onClick={() => setActiveTab(item.tab)}>
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="admin-overview-note">
                Preview the draft exactly as it will appear publicly, then publish when everything checks out.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === 'preview' ? (
        <PreviewPanel draft={draft} onGoToTab={setActiveTab} />
      ) : null}

      {activeTab === 'import' ? (
        <BatchImportWorkspace
          draft={draft}
          existingRecords={draft.certificates}
          onClose={() => setActiveTab('overview')}
          onImport={(approved) => {
            const next = { ...draft };
            const existingIds = new Set((next.certificates || []).map((r) => r.id));
            const certs = [...(next.certificates || [])];
            let skipped = 0;
            for (const { record, destination } of approved) {
              if (existingIds.has(record.id)) { skipped += 1; continue; }
              if (destination === 'achievement') {
                certs.push({ ...record, type: 'Achievement', destination: 'achievement' });
              } else {
                const type = record.type && record.type !== 'Other' ? record.type : 'IT Certification';
                certs.push({ ...record, type, destination: 'certificate' });
              }
            }
            next.certificates = certs;
            setDraft(next);
            setEditRevision((current) => current + 1);
            setStatus(successMessages.imported);
            setActiveTab('certificates');
          }}
        />
      ) : null}

      {activeTab === 'profile' ? (
        <section className="editor-section">
          <h2>Profile</h2>
          <p>Use truthful, recruiter-ready details. Changes remain drafts until published.</p>
          <div className="admin-form-grid">
            {[
              ['hero.name', 'Full name'],
              ['hero.title', 'Professional headline'],
              ['hero.eyebrow', 'Short tagline above your name'],
              ['hero.brandDetail', 'Header subtitle (optional)'],
              ['hero.focus', 'Short introduction'],
              ['about.introduction', 'About me'],
              ['about.careerObjective', 'Career objective'],
              ['about.educationSummary', 'Education summary'],
              ['contact.email', 'Professional email'],
              ['contact.github', 'GitHub profile URL'],
              ['contact.linkedin', 'LinkedIn profile URL'],
            ].map(([path, label]) => (
              <TextField
                key={path}
                label={label}
                type={path === 'contact.email' ? 'email' : 'text'}
                multiline={['hero.focus', 'about.introduction', 'about.careerObjective', 'about.educationSummary'].includes(path)}
                value={readPath(draft, path) || ''}
                onChange={(value) => setDraft((current) => updatePath(current, path, value))}
                hint={
                  path === 'hero.brandDetail'
                    ? 'Short line under your name in the header. Leave empty to show only your name.'
                    : path === 'contact.email'
                      ? 'Shown publicly as a clickable email link. Leave blank to hide it.'
                      : path === 'contact.github' || path === 'contact.linkedin'
                        ? 'Use the full https:// profile URL. Leave blank to hide it.'
                        : undefined
                }
              />
            ))}
            <TextField
              label="Areas of interest in IT (one per line)"
              multiline
              value={(draft.about.interests || []).join('\n')}
              onChange={(value) => setDraft((current) => updatePath(current, 'about.interests', value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)))}
            />
            <TextField
              label="Portrait image description"
              value={draft.hero.portrait?.alt || ''}
              onChange={(value) => setDraft((current) => updatePath(current, 'hero.portrait.alt', value))}
              hint="Describe the photo for screen readers. Keep it factual."
            />
          </div>
          <div className="admin-upload-row">
            {draft.hero.portrait?.src ? (
              <DraftAssetImage className="admin-photo-preview" src={draft.hero.portrait.src} alt={draft.hero.portrait.alt || ''} />
            ) : (
              <p className="admin-empty">No photo uploaded yet.</p>
            )}
            <label className="admin-upload">
              <span>Upload professional photo</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  if (event.target.files?.[0]) uploadProfilePhoto(event.target.files[0]).catch((error) => setStatus(userFacingMessage(error, 'upload')));
                  event.target.value = '';
                }}
              />
            </label>
          </div>
          <TextField
            label="About image description"
            value={draft.about.image?.alt || ''}
            onChange={(value) => setDraft((current) => updatePath(current, 'about.image.alt', value))}
            hint="Describe the image for screen readers. Keep it factual."
          />
          <div className="admin-upload-row">
            {draft.about.image?.src ? (
              <DraftAssetImage className="admin-photo-preview" src={draft.about.image.src} alt={draft.about.image?.alt || ''} />
            ) : (
              <p className="admin-empty">No About image uploaded yet.</p>
            )}
            <label className="admin-upload">
              <span>Upload About image</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  if (event.target.files?.[0]) uploadAboutImage(event.target.files[0]).catch((error) => setStatus(userFacingMessage(error, 'upload')));
                  event.target.value = '';
                }}
              />
            </label>
            {draft.about.image?.src ? (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setDraft((current) => updatePath(current, 'about.image.src', null));
                  setStatus(successMessages.assetRemoved);
                }}
              >
                Remove About image
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {activeTab === 'skills' ? (
        <RecordListEditor key={`skills-${editRevision}`} addLabel="Add skill" title="Skills" path="skills" draft={draft} fields={listFields.skills} onChange={setDraft} onUploadError={(error) => setStatus(userFacingMessage(error, 'upload'))} onEditingChange={reportRecordEditing} emptyTitle="No skills yet. Add the ones you can genuinely substantiate." />
      ) : null}
      {activeTab === 'certificates' ? (
        <RecordListEditor key={`certificates-${editRevision}`} addLabel="Add certificate" title="Certificates" path="certificates" draft={draft} fields={listFields.certificates} onChange={setDraft} onUploadError={(error) => setStatus(userFacingMessage(error, 'upload'))} onEditingChange={reportRecordEditing} allowCertificateFile recordFilter={CERTIFICATE_FILTER} emptyTitle="No certificates yet. Add certificates with their issuing organization and date." />
      ) : null}
      {activeTab === 'achievements' ? (
        <RecordListEditor key={`achievements-${editRevision}`} addLabel="Add achievement" title="Achievements" path="certificates" draft={draft} fields={listFields.achievements} onChange={setDraft} onUploadError={(error) => setStatus(userFacingMessage(error, 'upload'))} onEditingChange={reportRecordEditing} allowCertificateFile recordFilter={ACHIEVEMENT_FILTER} fixedType="Achievement" emptyTitle="No achievements yet. Add genuine awards or recognitions only." />
      ) : null}
      {activeTab === 'eligibility' ? (
        <RecordListEditor key={`eligibility-${editRevision}`} addLabel="Add eligibility record" title="Eligibility and certifications" path="eligibility" draft={draft} fields={listFields.eligibility} onChange={setDraft} onUploadError={(error) => setStatus(userFacingMessage(error, 'upload'))} onEditingChange={reportRecordEditing} emptyTitle="No eligibility records yet. Only Completed records are shown publicly; planned or in-progress credentials stay hidden." />
      ) : null}
      {activeTab === 'experience' ? (
        <div className="editor-stack">
          {[
            ['work', 'Work experience'],
            ['internship', 'Internship / OJT'],
            ['volunteer', 'Volunteer experience'],
            ['academic', 'Relevant academic and cybersecurity activities'],
          ].map(([category, label]) => (
            <RecordListEditor
              key={`${category}-${editRevision}`}
              addLabel="Add entry"
              title={label}
              path={`experience.${category}`}
              draft={draft}
              fields={listFields.experience}
              onChange={setDraft}
              onUploadError={(error) => setStatus(userFacingMessage(error, 'upload'))}
              onEditingChange={reportRecordEditing}
              emptyTitle={`No ${category === 'academic' ? 'academic or CTF activities' : `${category} experience`} published yet.`}
            />
          ))}
        </div>
      ) : null}
      {activeTab === 'education' ? (
        <section className="editor-section">
          <h2>Education</h2>
          <div className="admin-form-grid">
            {['tertiary', 'secondary', 'elementary'].map((level) => (
              <fieldset className="record-card" key={level}>
                <legend>{level[0].toUpperCase()}{level.slice(1)} education</legend>
                {['institution', 'course', 'yearGraduated', 'achievement'].map((field) => (
                  <TextField
                    key={field}
                    label={field === 'yearGraduated' ? 'Year graduated / expected' : `${field[0].toUpperCase()}${field.slice(1)}`}
                    value={draft.education[level][field] || ''}
                    onChange={(value) => setDraft((current) => updatePath(current, `education.${level}.${field}`, value))}
                  />
                ))}
              </fieldset>
            ))}
          </div>
        </section>
      ) : null}
      {activeTab === 'projects' ? (
        <RecordListEditor key={`projects-${editRevision}`} addLabel="Add project" title="Projects" path="projects" draft={draft} fields={listFields.projects} onChange={setDraft} onUploadError={(error) => setStatus(userFacingMessage(error, 'upload'))} onEditingChange={reportRecordEditing} allowScreenshots emptyTitle="No projects yet. Add genuine academic, CTF, or personal projects with at least two screenshots each." />
      ) : null}
      {activeTab === 'security' ? (
        <div className="editor-stack">
          <RecordListEditor key={`security-profiles-${editRevision}`} addLabel="Add profile" title="Lab and CTF profiles" path="securityFocus.profiles" draft={draft} fields={listFields.securityProfiles} onChange={setDraft} onUploadError={(error) => setStatus(userFacingMessage(error, 'upload'))} onEditingChange={reportRecordEditing} emptyTitle="No lab or CTF profiles yet." />
          <RecordListEditor key={`security-writeups-${editRevision}`} addLabel="Add write-up" title="Write-ups" path="securityFocus.writeups" draft={draft} fields={listFields.securityWriteups} onChange={setDraft} onUploadError={(error) => setStatus(userFacingMessage(error, 'upload'))} onEditingChange={reportRecordEditing} emptyTitle="No write-ups yet." />
        </div>
      ) : null}
      {activeTab === 'design' ? (
        <section className="editor-section">
          <h2>Visual design</h2>
          <p>Choose a preset, then adjust colors, typography, spacing, hero layout, and section visibility.</p>
          <div className="admin-form-grid">
            <div className="admin-field">
              <label htmlFor="design-preset">Color preset</label>
              <select id="design-preset" value={designDraft.theme_mode} onChange={(event) => updateDesign('theme_mode', event.target.value)}>
                {Object.values(presets).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor="design-font">Font style</label>
              <select id="design-font" value={designDraft.font_scale} onChange={(event) => updateDesign('font_scale', event.target.value)}>
                <option value="editorial">Editorial serif</option>
                <option value="modern">Modern sans-serif</option>
                <option value="mono">Monospaced</option>
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor="design-width">Content width</label>
              <select id="design-width" value={designDraft.content_width} onChange={(event) => updateDesign('content_width', event.target.value)}>
                <option value="narrow">Narrow</option>
                <option value="standard">Standard</option>
                <option value="wide">Wide</option>
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor="design-spacing">Section spacing</label>
              <select id="design-spacing" value={designDraft.section_spacing} onChange={(event) => updateDesign('section_spacing', event.target.value)}>
                <option value="compact">Compact</option>
                <option value="roomy">Roomy</option>
                <option value="airy">Airy</option>
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor="design-hero">Hero layout</label>
              <select id="design-hero" value={designDraft.hero_variant} onChange={(event) => updateDesign('hero_variant', event.target.value)}>
                <option value="split">Photo beside introduction</option>
                <option value="centered">Centered</option>
                <option value="cover">Cover image</option>
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor="design-skills-layout">Skills layout</label>
              <select id="design-skills-layout" value={designDraft.skills_layout} onChange={(event) => updateDesign('skills_layout', event.target.value)}>
                <option value="rows">Single column</option>
                <option value="two-columns">Two columns</option>
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor="design-projects-layout">Projects layout</label>
              <select id="design-projects-layout" value={designDraft.projects_layout} onChange={(event) => updateDesign('projects_layout', event.target.value)}>
                <option value="stacked">Stacked</option>
                <option value="two-column">Two columns</option>
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor="design-certificates-layout">Certificates layout</label>
              <select id="design-certificates-layout" value={designDraft.certificates_layout} onChange={(event) => updateDesign('certificates_layout', event.target.value)}>
                <option value="table">Compact list</option>
                <option value="thumbnails">Thumbnails</option>
              </select>
            </div>
            <TextField label="Section padding (40–160 px)" type="number" value={designDraft.section_padding} onChange={(value) => updateDesign('section_padding', Math.min(160, Math.max(40, Number(value) || 40)))} />
            {[
              ['background_color', 'Background'],
              ['surface_color', 'Card background'],
              ['primary_color', 'Accent'],
              ['text_color', 'Text'],
            ].map(([key, label]) => (
              <div className="admin-field admin-color-field" key={key}>
                <label htmlFor={`color-${key}`}>{label} color</label>
                <input id={`color-${key}`} type="color" value={designDraft[key] || preset.colors.bg} onChange={(event) => updateDesign(key, event.target.value)} />
                <code>{designDraft[key]}</code>
              </div>
            ))}
          </div>
          <fieldset className="record-card admin-visibility-card">
            <legend>Section visibility</legend>
            <p className="admin-visibility-hint">Hidden sections never render publicly, even if they have content.</p>
            <div className="admin-visibility-grid">
              {sectionVisibilityIds.map((id) => (
                <CheckboxField
                  key={id}
                  label={sectionVisibilityLabels[id] || id}
                  checked={designDraft.section_visibility?.[id] !== false}
                  onChange={(checked) => toggleSectionVisibility(id, checked)}
                />
              ))}
            </div>
          </fieldset>
          <div className="admin-upload-row">
            <label className="admin-upload">
              <span>Upload WOFF2 font (optional)</span>
              <input type="file" accept=".woff2,font/woff2" onChange={(event) => {
                if (event.target.files?.[0]) uploadFont(event.target.files[0]).catch((error) => setStatus(userFacingMessage(error, 'upload')));
                event.target.value = '';
              }} />
            </label>
            {designDraft.font_url ? <DraftAssetLink src={designDraft.font_url}>Open font draft</DraftAssetLink> : null}
            {designDraft.font_url ? <button className="text-button" type="button" onClick={() => updateDesign('font_url', '')}>Use selected font style instead</button> : null}
          </div>
          {needsAssetCleanup ? (
            <button className="admin-button" type="button" disabled={busy} onClick={retryAssetCleanup}>Retry public asset cleanup</button>
          ) : null}
          <button className="admin-button admin-button-primary" type="button" disabled={busy} onClick={saveDesign}>Save design</button>
        </section>
      ) : null}
      {activeTab === 'settings' ? (
        <section className="editor-section">
          <div className="editor-section-heading">
            <div>
              <h2>Website settings</h2>
              <p>Search appearance, contact form subject, and the optional resume override. Profile details and contact links are managed on the Profile tab. Saved with your draft; publish when ready.</p>
            </div>
          </div>
          <div className="admin-form-grid">
            <TextField label="Home page search title" value={draft.meta.homeTitle} onChange={(value) => setDraft((current) => updatePath(current, 'meta.homeTitle', value))} hint="Leave empty to derive the title from your name and headline." />
            <TextField label="Home page search description" multiline value={draft.meta.homeDescription} onChange={(value) => setDraft((current) => updatePath(current, 'meta.homeDescription', value))} hint="Leave empty to use your short introduction." />
            <TextField label="Certificates page search title" value={draft.meta.certificatesTitle} onChange={(value) => setDraft((current) => updatePath(current, 'meta.certificatesTitle', value))} hint="Leave empty to derive the title from your name." />
            <TextField label="Certificates page search description" multiline value={draft.meta.certificatesDescription} onChange={(value) => setDraft((current) => updatePath(current, 'meta.certificatesDescription', value))} />
            <TextField label="Not found page title" value={draft.meta.notFoundTitle} onChange={(value) => setDraft((current) => updatePath(current, 'meta.notFoundTitle', value))} />
            <TextField label="Not found page description" multiline value={draft.meta.notFoundDescription} onChange={(value) => setDraft((current) => updatePath(current, 'meta.notFoundDescription', value))} />
            <TextField label="Contact form subject line" value={draft.contactSubject} onChange={(value) => setDraft((current) => updatePath(current, 'contactSubject', value))} />
          </div>
          <div className="admin-upload-row">
            <label className="admin-upload">
              <span>Upload resume PDF (optional override)</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={(event) => {
                  if (event.target.files?.[0]) uploadResume(event.target.files[0]).catch((error) => setStatus(userFacingMessage(error, 'upload')));
                  event.target.value = '';
                }}
              />
            </label>
            {draft.resumePath ? <DraftAssetLink src={draft.resumePath}>Open current resume</DraftAssetLink> : null}
            {draft.resumePath ? <button className="text-button" type="button" onClick={() => setDraft((current) => ({ ...current, resumePath: '' }))}>Clear override and generate automatically</button> : null}
            <p className="admin-settings-note">The public resume PDF is generated automatically from your published content on every publish. Uploading a PDF here overrides that behavior until you clear the upload.</p>
          </div>
        </section>
      ) : null}

      {activeTab !== 'design' && activeTab !== 'overview' ? (
        <footer className="admin-publish-bar">
          <p>{isPublished ? 'Your portfolio is published. Draft edits are not public until you publish.' : 'Your current edits are a private draft.'}</p>
          <div>
            <a className="admin-button" href="/preview" target="_blank" rel="noopener noreferrer">Preview draft</a>
            <button className="admin-button" type="button" disabled={busy} onClick={discardContentEdits}>Discard edits</button>
            <button className="admin-button" type="button" disabled={busy} onClick={saveDraft}>Save draft</button>
            <button className="admin-button admin-button-primary" type="button" disabled={busy} onClick={publish}>Publish to recruiters</button>
            {isPublished ? <button className="admin-button admin-button-danger" type="button" disabled={busy} onClick={unpublish}>Unpublish</button> : null}
            {needsAssetCleanup ? <button className="admin-button" type="button" disabled={busy} onClick={retryAssetCleanup}>Retry public asset cleanup</button> : null}
          </div>
        </footer>
      ) : null}
      {status ? <p className="admin-status" role="status" aria-live="polite">{status}</p> : null}
          </>
        )}
      </div>
    </main>
  );
}
