import { isTodo } from '../lib/format.js';
import { isSafeImagePath } from '../lib/urls.js';

export function isUsableImage(image) {
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
  const usable = isUsableImage(image);
  if (!usable) return null;

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
