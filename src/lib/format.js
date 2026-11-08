const dateFormatter = new Intl.DateTimeFormat('en-PH', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

export function formatDate(value) {
  if (typeof value !== 'string' || !value || isTodo(value)) return null;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return dateFormatter.format(parsed);
}

export function isTodo(value) {
  return typeof value === 'string' && value.trim().startsWith('[TODO:');
}

export function pluralize(count, singular, plural) {
  return count === 1 ? singular : plural;
}
