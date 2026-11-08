import { useEffect, useId, useState } from 'react';
import { useSite } from '../lib/site-context.js';

export default function ResumeButton() {
  const { content } = useSite();
  const [state, setState] = useState('checking');
  const noteId = useId();

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetch(content.resumePath, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((response) => {
        const type = (response.headers.get('content-type') || '').toLowerCase();
        if (active) {
          setState(response.ok && type.includes('application/pdf') ? 'available' : 'missing');
        }
      })
      .catch(() => {
        if (active) setState('missing');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [content.resumePath]);

  if (state === 'available') {
    return (
      <div className="resume-action">
        <a className="button button-secondary" href={content.resumePath} download>
          {content.ui.downloadResume}
        </a>
        <p className="asset-note" id={noteId}>
          {content.ui.resumeAvailable}
        </p>
      </div>
    );
  }

  const note =
    state === 'checking' ? content.ui.resumeChecking : content.ui.resumeUnavailable;

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
