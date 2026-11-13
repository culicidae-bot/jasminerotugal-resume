import { useEffect, useId, useState } from 'react';
import { useSite } from '../lib/site-context.js';
import { isSafeImagePath } from '../lib/urls.js';

const STATIC_RESUME_PATH = '/resume/RotugalJasmine.pdf';

export default function ResumeButton() {
  const { content } = useSite();
  const [resume, setResume] = useState({ state: 'checking', path: '' });
  const noteId = useId();

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const candidate = isSafeImagePath(content.resumePath)
      ? content.resumePath
      : STATIC_RESUME_PATH;

    async function isAvailable(path) {
      try {
        const response = await fetch(path, {
          method: 'HEAD',
          cache: 'no-store',
          signal: controller.signal,
        });
        const type = (response.headers.get('content-type') || '').toLowerCase();
        return response.ok && type.includes('application/pdf');
      } catch {
        return false;
      }
    }

    setResume({ state: 'checking', path: '' });
    isAvailable(candidate).then(async (available) => {
      if (!active) return;
      if (available) {
        setResume({ state: 'available', path: candidate });
        return;
      }
      if (candidate !== STATIC_RESUME_PATH && (await isAvailable(STATIC_RESUME_PATH))) {
        if (active) setResume({ state: 'available', path: STATIC_RESUME_PATH });
        return;
      }
      if (active) setResume({ state: 'missing', path: '' });
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [content.resumePath]);

  if (resume.state === 'available') {
    return (
      <div className="resume-action">
        <a
          className="button button-primary"
          href={resume.path}
          download="RotugalJasmine.pdf"
        >
          {content.ui.downloadResume}
        </a>
        <p className="asset-note" id={noteId}>
          {content.ui.resumeAvailable}
        </p>
      </div>
    );
  }

  const note =
    resume.state === 'checking' ? content.ui.resumeChecking : content.ui.resumeUnavailable;

  return (
    <div className="resume-action">
      <button
        type="button"
        className="button button-secondary"
        disabled
        aria-describedby={noteId}
      >
        {content.ui.downloadResume}
      </button>
      <p className="asset-note" id={noteId}>
        {note}
      </p>
    </div>
  );
}
