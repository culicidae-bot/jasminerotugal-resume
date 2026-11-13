export const FEATURED_LIMITS = Object.freeze({
  skills: 8,
  certificates: 3,
  achievements: 2,
  projects: 3,
  experience: 2,
});

export const RESUME_SOFT_LIMITS = Object.freeze({
  skills: 10,
  certificates: 6,
  achievements: 4,
  projects: 3,
  experience: null,
  eligibility: null,
});

export const DEFAULT_PRIORITY = 1000;

export function priorityOf(item) {
  const raw = item?.priority;
  if (raw === null || raw === undefined) return DEFAULT_PRIORITY;
  if (typeof raw === 'string' && raw.trim() === '') return DEFAULT_PRIORITY;
  const value = Number(raw);
  return Number.isFinite(value) ? value : DEFAULT_PRIORITY;
}

/**
 * Stable ordering: lower priority first; ties keep insertion order.
 * An optional tieBreak(a, b) may return <0/0/>0 to break ties.
 */
export function sortByPriority(items, tieBreak = null) {
  return [...(Array.isArray(items) ? items : [])]
    .map((item, position) => ({ item, position }))
    .sort((a, b) => {
      const diff = priorityOf(a.item) - priorityOf(b.item);
      if (diff !== 0) return diff;
      if (tieBreak) return tieBreak(a.item, b.item);
      return a.position - b.position;
    })
    .map(({ item }) => item);
}

export function isFeatured(item) {
  return item?.featured === true;
}

/** Legacy records without a resume flag are included by default. */
export function isResumeSelected(item) {
  return item?.resume !== false;
}

/**
 * Homepage selection. Records explicitly marked `featured: true` win;
 * ties break by priority. When nothing is marked, fall back to the
 * top-N by priority so the homepage is never silently empty.
 */
export function selectFeatured(items, limit, tieBreak = null) {
  const sorted = sortByPriority(items, tieBreak);
  const marked = sorted.filter(isFeatured);
  return (marked.length ? marked : sorted).slice(0, limit);
}

/**
 * Resume selection. Records with resume === false are excluded.
 * Explicitly selected records (resume === true) are always included.
 * Legacy records (no flag) fill the remaining slots up to the soft limit,
 * keeping global priority order. When no soft limit applies, every eligible
 * record is included.
 */
export function selectResume(items, softLimit, tieBreak = null) {
  const sorted = sortByPriority(items, tieBreak);
  const included = new Set(sorted.filter((item) => item?.resume === true));
  if (Number.isFinite(softLimit)) {
    for (const item of sorted) {
      if (included.size >= softLimit) break;
      if (item?.resume === false) continue;
      if (item?.resume === true) continue; // already in the set
      included.add(item);
    }
    return sorted.filter((item) => included.has(item));
  }
  return sorted.filter(isResumeSelected);
}

export const isAchievementRecord = (record) =>
  ['Achievement', 'Award'].includes(record?.type);

export function splitRecords(records) {
  const list = Array.isArray(records) ? records : [];
  return {
    certificates: list.filter((record) => !isAchievementRecord(record)),
    achievements: list.filter(isAchievementRecord),
  };
}
