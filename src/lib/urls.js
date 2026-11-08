const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

export function isSafeHttpUrl(value) {
  if (typeof value !== 'string' || CONTROL_CHARACTERS.test(value)) return false;
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch (error) {
    return false;
  }
}

export function isSafeHttpsUrl(value) {
  if (!isSafeHttpUrl(value)) return false;
  return new URL(value).protocol === 'https:';
}

export function isSafeImagePath(value) {
  if (typeof value !== 'string' || CONTROL_CHARACTERS.test(value)) return false;
  if (isSafeHttpUrl(value)) {
    const configuredSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
    if (!configuredSupabaseUrl) return false;
    try {
      const imageUrl = new URL(value);
      const projectUrl = new URL(configuredSupabaseUrl);
      return (
        imageUrl.protocol === 'https:' &&
        imageUrl.origin === projectUrl.origin &&
        imageUrl.pathname.startsWith('/storage/v1/object/public/public-media/portfolio/')
      );
    } catch {
      return false;
    }
  }
  if (!value.startsWith('/') || value.startsWith('//')) return false;
  if (value.includes('\\')) return false;
  return !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value);
}

export function sampledPath(path, isSample) {
  if (!isSample) return path;
  const hashIndex = path.indexOf('#');
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : '';
  const base = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}sample=1${hash}`;
}

export function mailtoSafeAddress(value) {
  if (typeof value !== 'string' || CONTROL_CHARACTERS.test(value)) return null;
  const trimmed = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null;
}
