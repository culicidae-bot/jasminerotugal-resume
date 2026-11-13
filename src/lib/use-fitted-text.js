import { useEffect } from 'react';

/**
 * Shrinks an element's font size until its content fits the element's
 * width on a single line. The element never wraps; the minimum size is the
 * floor. Preserves the semantic element it is applied to.
 */
export function useFittedText(ref, { minSize = 16, step = 0.94 } = {}) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    let frame = 0;
    function fit() {
      element.style.fontSize = '';
      element.style.whiteSpace = 'nowrap';

      const base = Number.parseFloat(getComputedStyle(element).fontSize);
      if (!Number.isFinite(base) || base <= 0) return;

      let size = base;
      element.style.fontSize = `${size}px`;
      while (element.scrollWidth > element.clientWidth && size > minSize) {
        size = Math.max(minSize, size * step);
        element.style.fontSize = `${size}px`;
      }
    }

    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    }

    fit();

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    resizeObserver?.observe(element);
    const mutationObserver = typeof MutationObserver !== 'undefined'
      ? new MutationObserver(schedule)
      : null;
    mutationObserver?.observe(element, { childList: true, characterData: true, subtree: true });
    window.addEventListener('resize', schedule);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, [ref, minSize, step]);
}
