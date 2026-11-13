function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function identity(content) {
  const name = text(content?.hero?.name);
  const title = text(content?.hero?.title);
  return { name, title };
}

/**
 * Resolve page metadata from admin-managed content. Explicit SEO fields win;
 * otherwise the title and description are derived from the published profile
 * so the owner never has to maintain the same identity in two places.
 */
export function resolveSeo(content, page = 'home') {
  const { name, title } = identity(content);
  const meta = content?.meta || {};
  const fallbackName = name || 'Portfolio';

  if (page === 'certificates') {
    return {
      title:
        text(meta.certificatesTitle) ||
        (name ? `Certificates — ${name}` : 'Certificates'),
      description:
        text(meta.certificatesDescription) ||
        (name
          ? `Certificate register for ${name}, including type, issuer, date earned, and the source of each record.`
          : 'Certificate register including type, issuer, date earned, and the source of each record.'),
    };
  }

  if (page === 'not-found') {
    return {
      title:
        text(meta.notFoundTitle) ||
        (name ? `Page not found — ${name}` : 'Page not found'),
      description:
        text(meta.notFoundDescription) || 'The requested page does not exist.',
    };
  }

  return {
    title:
      text(meta.homeTitle) ||
      (name && title ? `${name} — ${title}` : fallbackName),
    description:
      text(meta.homeDescription) ||
      text(content?.hero?.focus) ||
      text(content?.about?.introduction) ||
      (name ? `Professional portfolio of ${name}.` : 'Professional portfolio.'),
  };
}


export function resolveCanonicalUrl(siteOrigin, pathname = '/') {
  if (typeof siteOrigin !== 'string' || !siteOrigin.trim()) return null;

  try {
    const origin = new URL(siteOrigin.trim());
    if (
      origin.protocol !== 'https:' ||
      origin.username ||
      origin.password ||
      origin.pathname !== '/' ||
      origin.search ||
      origin.hash
    ) {
      return null;
    }

    const path = typeof pathname === 'string' && pathname.startsWith('/') && !pathname.startsWith('//')
      ? pathname.split(/[?#]/, 1)[0] || '/'
      : '/';
    return new URL(path, origin.origin).href;
  } catch {
    return null;
  }
}
