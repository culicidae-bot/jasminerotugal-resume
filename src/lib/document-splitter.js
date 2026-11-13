/**
 * PDF page segmentation: group consecutive pages that belong to the same
 * certificate/achievement and split apart unrelated documents.
 *
 * Deterministic and transparent — no ML required. When signals are ambiguous,
 * pages stay in one segment flagged `confidence: 'low'` for human review;
 * the administrator can always split/merge afterwards.
 */

const TITLE_PATTERN = /\b(certificate|diploma|award|recognition|commendation|certification|certificate\s+of\s+(completion|participation|attendance|achievement|appreciation))\b/i;
const AWARD_PATTERN = /\b(awarded|winner|won|place\s*(1st|2nd|3rd|first|second|third)|finalist|honor)/i;
const HEADER_WORDS = /\b(certificate\s+of\s+(completion|participation|attendance|achievement|appreciation)|award\s+for|given\s+to|presented\s+to|diploma)\b/i;
const ORG_PATTERN = /(institute|university|academy|association|foundation|society|council|college|department|inc\b|llc\b|ltd\b|corp\b|corporation|company)/i;
const RECIPIENT_PATTERN = /(awarded|presented|granted|conferred)\s+(to|upon)/i;
const CONTINUATION_PATTERN = /^(\s*(page\s+\d+|continued|cont\.|…)|\s*[-–—]\s*\d+\s*[-–—]\s*$)/i;
const BLANK_PAGE_WORDS = 6;

function rangeLabel(segment) {
  return segment.pageStart === segment.pageEnd
    ? `page ${segment.pageStart + 1}`
    : `pages ${segment.pageStart + 1}–${segment.pageEnd + 1}`;
}

function words(text) {
  return String(text ?? '').trim().split(/\s+/).filter(Boolean);
}

function startScore(page, previousPage) {
  const trimmed = String(page?.text ?? '').trim();
  const wordCount = words(trimmed).length;
  const lower = trimmed.toLowerCase();

  if (wordCount < BLANK_PAGE_WORDS || /^(?:[\W_]|\s)*$/.test(trimmed)) return -10;
  if (CONTINUATION_PATTERN.test(trimmed)) return -5;

  let score = 0;
  if (HEADER_WORDS.test(lower)) score += 5;
  if (TITLE_PATTERN.test(lower)) score += 3;
  if (AWARD_PATTERN.test(lower)) score += 2;
  if (ORG_PATTERN.test(lower)) score += 1;
  if (RECIPIENT_PATTERN.test(lower)) score += 2;

  // A short page with a title is a likely cover/document-start page.
  if (wordCount <= 35 && TITLE_PATTERN.test(lower)) score += 2;

  // Repeated lines across pages suggest one logical document, not a boundary.
  if (previousPage) {
    const normalizeLine = (line) => line.trim().toLowerCase().replace(/\s+/g, ' ');
    const current = trimmed.split('\n').map(normalizeLine).filter(Boolean);
    const previous = String(previousPage.text ?? '').split('\n').map(normalizeLine).filter(Boolean);
    const overlap = current.filter((line) => previous.includes(line)).length;
    if (overlap >= 2) score -= 3;
  }

  return score;
}

export function segmentPages(pages) {
  const safePages = (Array.isArray(pages) ? pages : [])
    .map((page, fallback) => ({ ...page, index: Number(page?.index ?? fallback), text: String(page?.text ?? '') }))
    .sort((a, b) => a.index - b.index);

  if (safePages.length === 0) return [];

  const segments = [];
  let current = null;

  for (const page of safePages) {
    const previous = current ? current.pages[current.pages.length - 1] ?? null : null;
    const previousPage = previous === null ? null : safePages.find((item) => item.index === previous) ?? null;
    const score = startScore(page, previousPage);
    const startsNew = !current || score >= 4;

    if (startsNew) {
      if (current) segments.push(current);
      current = {
        id: `seg-${page.index}-${Math.random().toString(36).slice(2, 7)}`,
        pageStart: page.index,
        pageEnd: page.index,
        pages: [page.index],
        texts: [page.text],
        confidence: score >= 6 ? 'high' : score >= 4 ? 'medium' : 'low',
        startScore: score,
      };
    } else {
      current.pageEnd = page.index;
      current.pages.push(page.index);
      current.texts.push(page.text);
      if (score < 0) current.confidence = 'low';
      else if (current.confidence === 'high' && score < 3) current.confidence = 'medium';
    }
  }
  if (current) segments.push(current);

  return segments.map((segment) => ({
    ...segment,
    pageRangeLabel: rangeLabel(segment),
  }));
}

/** Split `pageIndices` out of `segmentId` into a new segment. Returns a new array; never mutates. */
export function splitSegment(segments, segmentId, pageIndices) {
  const list = segments.map((segment) => ({ ...segment, pages: [...segment.pages], texts: [...segment.texts] }));
  const target = list.find((segment) => segment.id === segmentId);
  if (!target) return list;

  const wanted = new Set(pageIndices.map(Number));
  const textByPage = new Map(target.pages.map((page, i) => [page, target.texts[i] ?? '']));
  const moving = target.pages.filter((page) => wanted.has(page));
  if (moving.length === 0 || moving.length === target.pages.length) return list;

  target.pages = target.pages.filter((page) => !wanted.has(page));
  target.texts = target.pages.map((page) => textByPage.get(page) ?? '');
  target.pageStart = Math.min(...target.pages);
  target.pageEnd = Math.max(...target.pages);
  target.confidence = 'low';
  target.manual = true;

  const created = {
    id: `seg-manual-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    pageStart: Math.min(...moving),
    pageEnd: Math.max(...moving),
    pages: [...moving].sort((a, b) => a - b),
    texts: [...moving].sort((a, b) => a - b).map((page) => textByPage.get(page) ?? ''),
    confidence: 'low',
    startScore: 0,
    manual: true,
  };

  return [...list, created]
    .sort((a, b) => a.pageStart - b.pageStart)
    .map((segment) => ({ ...segment, pageRangeLabel: rangeLabel(segment) }));
}

/** Merge two adjacent (or any) segments into one. Returns a new array; never mutates. */
export function mergeSegments(segments, firstId, secondId) {
  const first = segments.find((segment) => segment.id === firstId);
  const second = segments.find((segment) => segment.id === secondId);
  if (!first || !second || first.id === second.id) return segments.slice();

  const textByPage = new Map();
  for (const segment of [first, second]) {
    segment.pages.forEach((page, i) => textByPage.set(page, segment.texts[i] ?? ''));
  }

  const pages = [...new Set([...first.pages, ...second.pages])].sort((a, b) => a - b);
  const merged = {
    id: first.id,
    pageStart: Math.min(...pages),
    pageEnd: Math.max(...pages),
    pages,
    texts: pages.map((page) => textByPage.get(page) ?? ''),
    confidence: 'low',
    startScore: 0,
    manual: true,
  };

  return segments
    .filter((segment) => segment.id !== first.id && segment.id !== second.id)
    .concat(merged)
    .sort((a, b) => a.pageStart - b.pageStart)
    .map((segment) => ({ ...segment, pageRangeLabel: rangeLabel(segment) }));
}
