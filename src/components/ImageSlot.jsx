import { isTodo } from '../lib/format.js';
import { isSafeImagePath } from '../lib/urls.js';
import { useSite } from '../lib/site-context.js';

function isUsableImage(image) {
  return Boolean(
    image &&
      typeof image === 'object' &&
      isSafeImagePath(image.src) &&
      typeof image.alt === 'string' &&
      image.alt.trim() &&
      !isTodo(image.alt) &&
      Number.isFinite(image.width) &&
      image.width > 0 &&
      Number.isFinite(image.height) &&
      image.height > 0,
  );
}

export default function ImageSlot({ image, kind, eager = false }) {
  const { content } = useSite();
  const usable = isUsableImage(image);
  const detail =
    image && typeof image.alt === 'string' && image.alt.trim()
      ? image.alt
      : content.ui.imageMissing;

  if (!usable) {
    return (
      <div className={`image-slot image-slot-${kind} image-placeholder`} data-kind={kind}>
        <span className="placeholder-rule" aria-hidden="true" />
        <span className="placeholder-label">{content.ui.imagePlaceholder}</span>
        <span className="placeholder-detail">{detail}</span>
      </div>
    );
  }

  return (
    <div className={`image-slot image-slot-${kind}`} data-kind={kind}>
      <img
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        loading={eager || image.loading === 'eager' ? 'eager' : 'lazy'}
        decoding="async"
        data-focal={image.focalPoint || 'center'}
      />
    </div>
  );
}
