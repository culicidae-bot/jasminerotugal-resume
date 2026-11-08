const svgProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
  focusable: 'false',
};

function TypeGlyph({ type }) {
  if (type === 'Training') {
    return (
      <svg {...svgProps}>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z" />
        <path d="M4 5.5v15" />
        <path d="M8 7h8" />
      </svg>
    );
  }
  if (type === 'Workshop') {
    return (
      <svg {...svgProps}>
        <path d="M14.5 6.5a4 4 0 0 0-5.7 5.7L4 17l3 3 4.8-4.8a4 4 0 0 0 5.7-5.7l-2.3 2.3-3-3Z" />
      </svg>
    );
  }
  if (type === 'Seminar') {
    return (
      <svg {...svgProps}>
        <rect x="3" y="4" width="18" height="12" rx="1.5" />
        <path d="M8 20h8M12 16v4" />
        <path d="M7 8h6" />
      </svg>
    );
  }
  if (type === 'Award') {
    return (
      <svg {...svgProps}>
        <circle cx="12" cy="9" r="5" />
        <path d="m8.8 13-1.3 7L12 18l4.5 2-1.3-7" />
      </svg>
    );
  }
  return (
    <svg {...svgProps}>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

function StatusGlyph({ status }) {
  if (status === 'issuer-verifiable') {
    return (
      <svg {...svgProps}>
        <path d="M10 13a4.5 4.5 0 0 0 6.4.4l2-2a4.5 4.5 0 0 0-6.4-6.4L10.8 6.2" />
        <path d="M14 11a4.5 4.5 0 0 0-6.4-.4l-2 2a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2" />
      </svg>
    );
  }
  if (status === 'document-on-file') {
    return (
      <svg {...svgProps}>
        <path d="M6 3h8l4 4v14H6Z" />
        <path d="M14 3v4h4M9 12h6M9 16h6" />
      </svg>
    );
  }
  return (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

export function TypeIcon({ type }) {
  return <TypeGlyph type={type} />;
}

export function StatusIcon({ status }) {
  return <StatusGlyph status={status} />;
}

export function ExternalIcon() {
  return (
    <svg {...svgProps}>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 13v6H5V6h6" />
    </svg>
  );
}
