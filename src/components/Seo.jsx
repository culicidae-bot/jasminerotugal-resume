import { useEffect } from 'react';
import { isTodo } from '../lib/format.js';
import { isSafeImagePath } from '../lib/urls.js';
import { useSite } from '../lib/site-context.js';

function setNamedMeta(attribute, name, value) {
  let element = document.head.querySelector(`meta[${attribute}="${name}"]`);
  if (!value) {
    if (element) element.remove();
    return;
  }
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', value);
}

export default function Seo({ title, description }) {
  const { content } = useSite();

  useEffect(() => {
    document.title = title;
    setNamedMeta('name', 'description', description);
    setNamedMeta('property', 'og:title', title);
    setNamedMeta('property', 'og:description', description);

    const ogImage = content.meta.ogImage;
    const usableImage =
      ogImage &&
      isSafeImagePath(ogImage.src) &&
      typeof ogImage.alt === 'string' &&
      ogImage.alt.trim() &&
      !isTodo(ogImage.alt);

    if (usableImage) {
      const absoluteUrl = new URL(ogImage.src, window.location.origin).href;
      setNamedMeta('property', 'og:image', absoluteUrl);
      setNamedMeta('property', 'og:image:alt', ogImage.alt);
      setNamedMeta('property', 'og:image:width', String(ogImage.width));
      setNamedMeta('property', 'og:image:height', String(ogImage.height));
    } else {
      setNamedMeta('property', 'og:image', '');
      setNamedMeta('property', 'og:image:alt', '');
      setNamedMeta('property', 'og:image:width', '');
      setNamedMeta('property', 'og:image:height', '');
    }
  }, [content.meta.ogImage, description, title]);

  return null;
}
