import { useEffect, useId, useMemo, useState } from 'react';
import { designSettings as defaultDesign, presets } from '../data/design.js';
import { useSite } from '../lib/site-context.js';
import '../admin.css';
import { applyDesignTokens, normalizeDatabaseDesign } from '../lib/design-settings.js';
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

const tabs = [
  ['profile', 'Profile'],
  ['skills', 'Skills'],
  ['certificates', 'Certificates'],
  ['eligibility', 'Eligibility'],
  ['experience', 'Experience'],
  ['education', 'Education'],
  ['projects', 'Projects'],
  ['design', 'Design'],
];

const listFields = {
  skills: [
    { key: 'name', label: 'Skill name' },
    { key: 'proficiency', label: 'Proficiency (0–100)', type: 'number' },
    { key: 'label', label: 'Proficiency label' },
  ],
  certificates: [
    { key: 'title', label: 'Certificate title' },
    { key: 'type', label: 'Type (certification, training, workshop, seminar, award)' },
    { key: 'issuer', label: 'Issuing organization' },
    { key: 'dateEarned', label: 'Date earned', type: 'date' },
    { key: 'verifyUrl', label: 'Verification URL' },
  ],
  eligibility: [
    { key: 'title', label: 'Eligibility or certification title' },
    { key: 'issuer', label: 'Issuing organization' },
    { key: 'dateConferred', label: 'Date conferred', type: 'date' },
  ],
  experience: [
    { key: 'role', label: 'Position / role' },
    { key: 'organization', label: 'Organization' },
    { key: 'period', label: 'Duration / period' },
    { key: 'responsibilities', label: 'Responsibilities (one per line)', type: 'lines' },
    { key: 'accomplishments', label: 'Accomplishments (one per line)', type: 'lines' },
  ],
  projects: [
    { key: 'title', label: 'Project title' },
    { key: 'role', label: 'Your role' },
    { key: 'purpose', label: 'Purpose' },
    { key: 'summary', label: 'Description' },
    { key: 'technologies', label: 'Technologies (one per line)', type: 'lines' },
    { key: 'features', label: 'Key features (one per line)', type: 'lines' },
    { key: 'contributions', label: 'Your contributions (one per line)', type: 'lines' },
    { key: 'projectUrl', label: 'Live project URL' },
    { key: 'sourceUrl', label: 'Source code URL' },
  ],
};

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

function TextField({ label, value, onChange, multiline = false, type = 'text', hint }) {
  const generatedId = useId();
  const id = `admin-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${generatedId}`;
  const Control = multiline ? 'textarea' : 'input';
  return (
    <div className="admin-field">
      <label htmlFor={id}>{label}</label>
      <Control
        id={id}
        type={multiline ? undefined : type}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        rows={multiline ? 4 : undefined}
      />
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
}) {
  const records = readPath(draft, path);

  function updateRecord(index, key, value) {
    const next = [...records];
    next[index] = { ...next[index], [key]: value };
    onChange(updatePath(draft, path, next));
  }

  function addRecord() {
    const record = { id: crypto.randomUUID() };
    for (const field of fields) record[field.key] = field.type === 'lines' ? [] : '';
    if (allowScreenshots) record.screenshots = [];
    onChange(updatePath(draft, path, [...records, record]));
  }

  function removeRecord(index) {
    onChange(updatePath(draft, path, records.filter((_, position) => position !== index)));
  }

  async function addScreenshots(index, files) {
    const newImages = [];
    for (const file of Array.from(files)) {
      const src = await uploadPortfolioAsset(file);
      newImages.push({
        src,
        alt: `Screenshot of ${records[index].title || 'project'}`,
        width: 1440,
        height: 900,
        focalPoint: 'center',
        loading: 'lazy',
      });
    }
    updateRecord(index, 'screenshots', [...(records[index].screenshots || []), ...newImages]);
  }

  async function addCertificateFile(index, file) {
    const src = await uploadPortfolioAsset(file, { kind: 'certificate' });
    updateRecord(index, 'publicFile', {
      src,
      alt: `${records[index].title || 'Certificate'} document`,
      width: 1200,
      height: 1600,
      mimeType: file.type,
    });
  }

  return (
    <section className="editor-section">
      <div className="editor-section-heading">
        <div>
          <h2>{title}</h2>
          <p>Unpublished records stay hidden from recruiters.</p>
        </div>
        <button className="admin-button" type="button" onClick={addRecord}>Add {title.toLowerCase()}</button>
      </div>
      {records.length === 0 ? <p className="admin-empty">No entries yet. Add one when you are ready.</p> : null}
      <div className="record-list">
        {records.map((record, index) => (
          <fieldset className="record-card" key={record.id || `${path}-${index}`}>
            <legend>{record.title || `${title} ${index + 1}`}</legend>
            <div className="admin-form-grid">
              {fields.map((field) => {
                const value = record[field.key];
                const shownValue = field.type === 'lines' ? (Array.isArray(value) ? value.join('\n') : '') : value;
                return (
                  <TextField
                    key={field.key}
                    label={field.label}
                    type={field.type === 'number' || field.type === 'date' ? field.type : 'text'}
                    multiline={field.type === 'lines' || field.key === 'summary' || field.key === 'purpose'}
                    value={shownValue}
                    onChange={(nextValue) => {
                      const parsedValue = field.type === 'lines'
                        ? nextValue.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
                        : field.type === 'number'
                          ? Math.min(100, Math.max(0, Number(nextValue) || 0))
                          : nextValue;
                      updateRecord(index, field.key, parsedValue);
                    }}
                  />
                );
              })}
            </div>
            {allowScreenshots ? (
              <div className="admin-field">
                <label htmlFor={`project-images-${index}`}>Project screenshots</label>
                <input
                  id={`project-images-${index}`}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(event) => {
                    if (event.target.files?.length) {
                      addScreenshots(index, event.target.files).catch((error) => {
                        onUploadError(error.message);
                      });
                    }
                    event.target.value = '';
                  }}
                />
                <small>{(record.screenshots || []).length} uploaded; add at least 2 screenshots for each project.</small>
                {(record.screenshots || []).length ? (
                  <ul className="uploaded-file-list">
                    {record.screenshots.map((image, imageIndex) => (
                      <li key={`${image.src}-${imageIndex}`}>
                        <DraftAssetLink src={image.src}>Screenshot {imageIndex + 1}</DraftAssetLink>
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => updateRecord(index, 'screenshots', record.screenshots.filter((_, position) => position !== imageIndex))}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {allowCertificateFile ? (
                  <div className="admin-field">
                    <label htmlFor={`certificate-file-${index}`}>Certificate image or PDF</label>
                    <input
                      id={`certificate-file-${index}`}
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      onChange={(event) => {
                        if (event.target.files?.[0]) {
                          addCertificateFile(index, event.target.files[0]).catch((error) => onUploadError(error.message));
                        }
                        event.target.value = '';
                      }}
                    />
                    {record.publicFile?.src ? (
                      <p>
                        <DraftAssetLink src={record.publicFile.src}>Open uploaded document</DraftAssetLink>
                        {' · '}
                        <button className="text-button" type="button" onClick={() => updateRecord(index, 'publicFile', null)}>Remove file</button>
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
            <button className="admin-button admin-button-danger" type="button" onClick={() => removeRecord(index)}>
              Remove entry
            </button>
          </fieldset>
        ))}
      </div>
    </section>
  );
}

export default function AdminDashboard({ onLogout }) {
  const site = useSite();
  const { content, design, onPublishedContentChange, onDesignChange } = site;
  const [draft, setDraft] = useState(() => clone(content));
  const [designDraft, setDesignDraft] = useState(() => ({
    theme_mode: design.activePreset || defaultDesign.activePreset,
    font_scale: design.typography?.scale || defaultDesign.typography.scale,
    content_width: design.contentWidth || defaultDesign.contentWidth,
    section_spacing: design.sectionSpacing || defaultDesign.sectionSpacing,
    section_padding: design.padding || 88,
    hero_variant: design.heroVariant || defaultDesign.heroVariant,
    background_color: design.palette?.background || presets[design.activePreset]?.colors.bg || '#121116',
    surface_color: design.palette?.surface || presets[design.activePreset]?.colors.surface || '#1A1920',
    primary_color: design.palette?.primary || presets[design.activePreset]?.colors.primary || '#6D3FD8',
    text_color: design.palette?.text || presets[design.activePreset]?.colors.text || '#ECEAF2',
    font_url: design.fontUrl || '',
  }));
  const [activeTab, setActiveTab] = useState('profile');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [needsAssetCleanup, setNeedsAssetCleanup] = useState(false);
  const [cleanupPaths, setCleanupPaths] = useState([]);

  const preset = useMemo(() => presets[designDraft.theme_mode] || presets['graphite-violet'], [designDraft.theme_mode]);

  useEffect(() => {
    let active = true;
    Promise.all([loadPortfolioDraft(), loadPendingPublicAssetCleanupWithClient()])
      .then(([{ content: saved, published, cleanupNeeded }, pendingCleanupPaths]) => {
        if (!active) return;
        if (saved) setDraft((current) => mergePublishedPortfolioContent(current, saved));
        setIsPublished(published);
        setCleanupPaths(pendingCleanupPaths);
        setNeedsAssetCleanup(cleanupNeeded || pendingCleanupPaths.length > 0);
      })
      .catch((error) => {
        if (active) setStatus(`Could not load saved content: ${error.message}`);
      });
    return () => {
      active = false;
    };
  }, []);

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
    setBusy(true);
    setStatus('');
    try {
      await savePortfolioDraft(draft);
      setStatus(
        isPublished
          ? 'Draft saved. Your current published portfolio remains visible until you publish or unpublish.'
          : 'Draft saved. It is not visible to recruiters until you publish it.',
      );
    } catch (error) {
      setStatus(`Could not save draft: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    const incompleteProject = draft.projects.find(
      (project) => !Array.isArray(project.screenshots) || project.screenshots.length < 2,
    );
    if (incompleteProject) {
      setActiveTab('projects');
      setStatus(`Add at least 2 screenshots to "${incompleteProject.title || 'each project'}" before publishing.`);
      return;
    }

    setBusy(true);
    setStatus('');
    try {
      const { content: publishedContent, warnings, cleanupCandidates } =
        await publishPortfolioContent(draft);
      setIsPublished(true);
      onPublishedContentChange(publishedContent);
      setCleanupPaths(cleanupCandidates);
      setNeedsAssetCleanup(cleanupCandidates.length > 0);
      setStatus(
        warnings.length
          ? `Portfolio published with cleanup warnings: ${warnings.join(' ')}`
          : 'Your portfolio updates are published.',
      );
    } catch (error) {
      setStatus(`Could not publish changes: ${error.message}`);
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
      setIsPublished(false);
      setCleanupPaths(cleanupCandidates);
      setNeedsAssetCleanup(Boolean(cleanupError) || cleanupCandidates.length > 0);
      onPublishedContentChange(null);
      setStatus(
        cleanupError
          ? `Portfolio is unpublished, but cleanup did not finish: ${cleanupError.message}${cleanupCandidates.length ? ` ${cleanupCandidates.length} public asset(s) remain queued and may still be accessible.` : ''}`
          : retainedPaths.length
            ? `Portfolio unpublished. ${retainedPaths.length} asset(s) remain public because other published content references them.`
            : 'Portfolio unpublished and unreferenced public assets removed.',
      );
    } catch (error) {
      setStatus(`Could not unpublish portfolio content: ${error.message}`);
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
          ? `${pendingPaths.length} public asset(s) remain queued for cleanup.`
          : retainedPaths.length
            ? `Cleanup is complete. ${retainedPaths.length} asset(s) remain public because other published content references them.`
            : 'Unreferenced public assets have been removed.',
      );
    } catch (error) {
      setStatus(`Could not remove unreferenced public assets: ${error.message}`);
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
          ? `Design settings published, but some old public assets could not be removed: ${cleanupError.message}`
          : 'Design settings saved and published.',
      );
    } catch (error) {
      setStatus(`Could not save design settings: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function uploadProfilePhoto(file) {
    const src = await uploadPortfolioAsset(file);
    const next = updatePath(draft, 'hero.portrait', {
      ...(draft.hero.portrait || {}),
      src,
      alt: draft.hero.portrait?.alt?.startsWith('[TODO:') ? `${draft.hero.name} professional portrait` : draft.hero.portrait?.alt || `${draft.hero.name} professional portrait`,
      width: 960,
      height: 1200,
      focalPoint: 'upper-center',
      loading: 'eager',
    });
    setDraft(next);
    setStatus('Photo uploaded. Publish your portfolio to show it to recruiters.');
  }

  async function uploadResume(file) {
    const url = await uploadPortfolioAsset(file, { kind: 'resume' });
    setDraft((current) => ({ ...current, resumePath: url }));
    setStatus('Resume uploaded. Publish your portfolio to make the new file available.');
  }

  async function uploadFont(file) {
    const url = await uploadPortfolioAsset(file, { kind: 'font' });
    setDesignDraft((current) => ({ ...current, font_url: url }));
    setStatus('Font uploaded. Save design settings to apply it.');
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

  return (
    <main className="admin-dashboard">
      <header className="admin-dashboard-header">
        <div>
          <p className="admin-kicker">Private area</p>
          <h1>Portfolio editor</h1>
          <p>Manage the information and public design shown to recruiters.</p>
        </div>
        <button className="admin-button" type="button" onClick={onLogout}>Log out of all devices</button>
      </header>

      <nav className="admin-tabs" aria-label="Portfolio editor sections">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={activeTab === id ? 'admin-tab is-active' : 'admin-tab'}
            aria-current={activeTab === id ? 'page' : undefined}
            onClick={() => setActiveTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {activeTab === 'profile' ? (
        <section className="editor-section">
          <h2>Profile and contact</h2>
          <p>Use truthful, recruiter-ready details. Changes remain drafts until published.</p>
          <div className="admin-form-grid">
            {[
              ['hero.name', 'Full name'],
              ['hero.title', 'Professional title'],
              ['hero.eyebrow', 'Short headline'],
              ['hero.focus', 'Short introduction'],
              ['about.introduction', 'About me'],
              ['about.careerObjective', 'Career objective'],
              ['about.educationSummary', 'Education summary'],
              ['contact.email', 'Professional email'],
              ['contact.github', 'GitHub URL'],
              ['contact.linkedin', 'LinkedIn URL'],
            ].map(([path, label]) => (
              <TextField
                key={path}
                label={label}
                multiline={['hero.focus', 'about.introduction', 'about.careerObjective', 'about.educationSummary'].includes(path)}
                type={path === 'contact.email' ? 'email' : 'text'}
                value={readPath(draft, path)}
                onChange={(value) => setDraft((current) => updatePath(current, path, value))}
              />
            ))}
            <TextField
              label="Areas of interest (one per line)"
              multiline
              value={(draft.about.interests || []).join('\n')}
              onChange={(value) => setDraft((current) => updatePath(current, 'about.interests', value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)))}
            />
            <TextField
              label="Portrait image description"
              value={draft.hero.portrait?.alt || ''}
              onChange={(value) => setDraft((current) => updatePath(current, 'hero.portrait.alt', value))}
            />
          </div>
          <div className="admin-upload-row">
            <label className="admin-upload">
              <span>Upload professional photo</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  if (event.target.files?.[0]) uploadProfilePhoto(event.target.files[0]).catch((error) => setStatus(error.message));
                  event.target.value = '';
                }}
              />
            </label>
            {draft.hero.portrait?.src ? <DraftAssetImage className="admin-photo-preview" src={draft.hero.portrait.src} alt={draft.hero.portrait.alt || ''} /> : null}
            <label className="admin-upload">
              <span>Upload resume PDF</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={(event) => {
                  if (event.target.files?.[0]) uploadResume(event.target.files[0]).catch((error) => setStatus(error.message));
                  event.target.value = '';
                }}
              />
            </label>
            {draft.resumePath ? <DraftAssetLink src={draft.resumePath}>Open current resume</DraftAssetLink> : null}
          </div>
        </section>
      ) : null}

      {activeTab === 'skills' ? (
        <RecordListEditor title="Skills" path="skills" draft={draft} fields={listFields.skills} onChange={setDraft} onUploadError={setStatus} />
      ) : null}
      {activeTab === 'certificates' ? (
        <RecordListEditor title="Certificates and achievements" path="certificates" draft={draft} fields={listFields.certificates} onChange={setDraft} onUploadError={setStatus} allowCertificateFile />
      ) : null}
      {activeTab === 'eligibility' ? (
        <RecordListEditor title="Eligibility records" path="eligibility" draft={draft} fields={listFields.eligibility} onChange={setDraft} onUploadError={setStatus} />
      ) : null}
      {activeTab === 'experience' ? (
        <div className="editor-stack">
          {['work', 'internship', 'volunteer'].map((category) => (
            <RecordListEditor
              key={category}
              title={`${category[0].toUpperCase()}${category.slice(1)} experience`}
              path={`experience.${category}`}
              draft={draft}
              fields={listFields.experience}
              onChange={setDraft}
              onUploadError={setStatus}
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
        <RecordListEditor title="Projects" path="projects" draft={draft} fields={listFields.projects} onChange={setDraft} onUploadError={setStatus} allowScreenshots />
      ) : null}
      {activeTab === 'design' ? (
        <section className="editor-section">
          <h2>Visual design</h2>
          <p>Choose a preset, then adjust colors, typography, spacing, and hero layout.</p>
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
          <div className="admin-upload-row">
            <label className="admin-upload">
              <span>Upload WOFF2 font (optional)</span>
              <input type="file" accept=".woff2,font/woff2" onChange={(event) => {
                if (event.target.files?.[0]) uploadFont(event.target.files[0]).catch((error) => setStatus(error.message));
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

      {activeTab !== 'design' ? (
        <footer className="admin-publish-bar">
          <p>{isPublished ? 'Your portfolio is published. Draft edits are not public until you publish.' : 'Your current edits are a private draft.'}</p>
          <div>
            <button className="admin-button" type="button" disabled={busy} onClick={saveDraft}>Save draft</button>
            <button className="admin-button admin-button-primary" type="button" disabled={busy} onClick={publish}>Publish to recruiters</button>
            {isPublished ? <button className="admin-button admin-button-danger" type="button" disabled={busy} onClick={unpublish}>Unpublish</button> : null}
            {needsAssetCleanup ? <button className="admin-button" type="button" disabled={busy} onClick={retryAssetCleanup}>Retry public asset cleanup</button> : null}
          </div>
        </footer>
      ) : null}
      {status ? <p className="admin-status" role="status" aria-live="polite">{status}</p> : null}
    </main>
  );
}
