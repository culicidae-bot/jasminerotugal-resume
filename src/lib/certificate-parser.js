/**
 * Certificate text extraction and field recognition.
 * Pure parser — no browser globals, no heavy dependencies.
 * Used by both the browser OCR pipeline and Node unit tests.
 */

const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/g;
const MAX_FIELD_LENGTH = 240;

export function normalizeLines(rawText) {
  const text = String(rawText ?? '')
    .normalize('NFKC')
    .replace(/\r\n?/g, '\n');
  return text
    .split('\n')
    .map((line) => line.replace(CONTROL_CHARACTERS, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 200);
}

function clean(value, max = MAX_FIELD_LENGTH) {
  if (typeof value !== 'string') return '';
  const text = value.replace(CONTROL_CHARACTERS, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > max ? text.slice(0, max - 1).trimEnd() : text;
}

const MONTHS = {
  january: 1, jan: 1, feb: 2, february: 2, march: 3, mar: 3, april: 4, apr: 4,
  may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8, september: 9, sep: 9, sept: 9,
  october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};
const MONTH_NAME = Object.keys(MONTHS).join('|');

function toISODate(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return '';
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return '';
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const DATE_PATTERNS = [
  {
    regex: new RegExp(`\\b(${MONTH_NAME})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, 'gi'),
    parse: (match) => toISODate(match[3], MONTHS[match[1].toLowerCase()], match[2]),
  },
  {
    regex: new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTH_NAME})\\.?,?\\s+(\\d{4})\\b`, 'gi'),
    parse: (match) => toISODate(match[3], MONTHS[match[2].toLowerCase()], match[1]),
  },
  {
    regex: /\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/g,
    parse: (match) => toISODate(match[1], match[2], match[3]),
  },
  {
    regex: /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/g,
    parse: (match, context) => {
      const first = Number(match[1]);
      const second = Number(match[2]);
      const dayFirst = first > 12;
      const monthFirst = second > 12 || !dayFirst;
      context.ambiguous = first <= 12 && second <= 12;
      if (monthFirst) return toISODate(match[3], match[1], match[2]);
      return toISODate(match[3], match[2], match[1]);
    },
  },
  {
    regex: /\b(\d{4})\b(?=\s*(?:to|until|-|–|—|through)|\s*$)/g,
    parse: () => '',
  },
];
const DATE_KEYWORDS = /\b(issued|awarded|conferred|granted|earned|presented|dated?|conferment)\b/i;
const EXPIRY_KEYWORDS = /\b(expires?|valid\s+until|through|until|valid\s+thru)\b/i;

export function findDates(lines) {
  const candidates = [];
  for (const [index, line] of lines.entries()) {
    const context = { ambiguous: false };
    for (const { regex, parse } of DATE_PATTERNS) {
      regex.lastIndex = 0;
      let match = regex.exec(line);
      while (match) {
        const iso = parse(match, context);
        if (iso) {
          candidates.push({
            iso,
            lineIndex: index,
            keywordScore: DATE_KEYWORDS.test(line) ? 2 : 0,
            expiry: EXPIRY_KEYWORDS.test(line),
            ambiguous: context.ambiguous,
          });
        }
        match = regex.exec(line);
      }
    }
  }
  return candidates;
}

export function pickDate(candidates, lineCount) {
  if (!candidates.length) return { value: '', confidence: 'missing', note: 'No date could be recognized.' };
  const usable = candidates.filter((candidate) => !candidate.expiry);
  const pool = usable.length ? usable : candidates;
  const scored = [...pool].sort((a, b) => (b.keywordScore - a.keywordScore) || (a.lineIndex - b.lineIndex));
  const best = scored[0];
  const ambiguous = best.ambiguous;
  const notes = [];
  if (candidates.length > 1 && pool.length > 1) {
    notes.push('Multiple dates recognized — the issue-like date was selected; please confirm.');
  }
  if (ambiguous) notes.push('Ambiguous numeric date format — please confirm the day and month order.');
  return {
    value: best.iso,
    confidence: best.keywordScore >= 2 && !ambiguous ? 'high' : ambiguous ? 'low' : 'medium',
    note: notes.join(' ') || undefined,
  };
}

export function findVerifyUrl(lines) {
  let best = null;
  for (const line of lines) {
    const httpIndex = line.search(/https?\s*:\s*\/\//i);
    if (httpIndex === -1) continue;
    const tail = line.slice(httpIndex).replace(/[.,;:!?)]+$/, '');
    const compact = tail.replace(/\s+/g, '');
    const match = compact.match(/https?:\/\/[^\s"'<>()]+/i);
    if (!match) continue;
    const url = clean(match[0], 400);
    const score = /(verify|valid|certif|cred|badge|registry|issue|accred)/i.test(url) ? 2 : 1;
    if (!best || score > best.score) best = { url, score, confidence: score === 2 ? 'high' : 'medium' };
  }
  return best
    ? { value: best.url, confidence: best.confidence }
    : { value: '', confidence: 'missing', note: 'No verification URL could be recognized.' };
}

export function findCredentialId(lines) {
  const keywordPattern = /(identity|credential|certificate|cert(?:ificate)?|cred(?:ential)?)(?:\s+(?:id|number|no\.?|num|#))?[\s._-]*[:#][\s._-]*([A-Za-z0-9][A-Za-z0-9_./-]{3,})/i;
  for (const line of lines) {
    if (/https?:\/\//i.test(line)) continue;
    const match = line.match(keywordPattern);
    if (match && /\d/.test(match[2])) return { value: clean(match[2], 60), confidence: 'medium' };
  }
  const standalone = /\b([A-Z]{2,6}[-/]\d{3,}(?:[-/]\d+)*)\b/;
  for (const line of lines) {
    if (/https?:\/\//i.test(line)) continue;
    const match = line.match(standalone);
    if (match) return { value: clean(match[1], 60), confidence: 'medium' };
  }
  return { value: '', confidence: 'missing' };
}

const ORG_KEYWORDS = /(institute|institution|academy|university|college|polytechnic|association|foundation|society|council|chapter|center|centre|department|ministry|office|school|board|corporation|company|technologies|solutions|services|systems|international|global|inc\b|llc\b|ltd\b|corp\b|gmbh\b|co\b)/i;
const ISSUER_ANNOUNCE = /(presented|awarded|conferred|granted|issued|given)\s+(to|by|upon)/i;

export function findIssuer(lines, excludeLines = []) {
  const excluded = new Set(excludeLines);
  const candidates = [];
  for (const [index, line] of lines.entries()) {
    if (excluded.has(index)) continue;
    if (!ORG_KEYWORDS.test(line)) continue;
    if (/https?:\/\//i.test(line)) continue;
    if (/\d{4}\s*[-–]/.test(line)) continue;
    const wordCount = line.split(/\s+/).filter(Boolean).length;
    if (wordCount > 12) continue;
    let score = 3;
    if (/\b(inc|llc|ltd|corp|gmbh|co)\b\.?/i.test(line)) score += 2;
    if (/(university|college|institute|academy|school|polytechnic)/i.test(line)) score += 2;
    if (/(association|foundation|society|council|chapter|board|ministry|department|office)/i.test(line)) score += 1;
    if (ISSUER_ANNOUNCE.test(line)) score += 1;
    if (/^(this|issued|presented|awarded)/i.test(line)) score -= 1;
    candidates.push({ index, line, score });
  }
  if (!candidates.length) {
    return { value: '', confidence: 'missing', note: 'Issuing organization could not be recognized.' };
  }

  const wordsOf = (line) => new Set(line.toLowerCase().split(/\s+/).filter((word) => word.length > 2 && !['the', 'and', 'of'].includes(word)));
  const sharesHalf = (first, second) => {
    const a = wordsOf(first.line);
    const b = wordsOf(second.line);
    if (!a.size || !b.size) return false;
    const shared = [...a].filter((word) => b.has(word)).length;
    return shared > 0 && shared / Math.min(a.size, b.size) >= 0.5;
  };
  const families = [];
  for (const candidate of candidates) {
    const home = families.find((family) => sharesHalf(family.representative, candidate));
    if (home) {
      if (candidate.line.length > home.representative.line.length) home.representative = candidate;
    } else {
      families.push({ representative: candidate });
    }
  }
  families.sort((a, b) => b.representative.score - a.representative.score || a.representative.index - b.representative.index);
  const [best, runnerUp] = families.map((family) => family.representative);
  if (runnerUp && runnerUp.score >= best.score - 1) {
    return {
      value: clean(best.line, 160),
      confidence: 'low',
      note: 'Multiple possible organizations were detected — please confirm the issuer.',
    };
  }
  return {
    value: clean(best.line, 160),
    confidence: best.score >= 5 ? 'high' : 'medium',
  };
}

function titleCase(text) {
  const small = new Set(['of', 'the', 'and', 'in', 'for', 'to', 'a', 'an', '&']);
  return text
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && small.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

function findRecipient(lines) {
  const announcement = /(awarded|granted|presented|conferred|given)\s+(this\s+)?(certificate|diploma|recognition|award)?(?:\s+(to|upon|for)\s*)?/i;
  for (const [index, line] of lines.entries()) {
    const match = line.match(announcement);
    if (!match) continue;
    const remainder = line.slice(match.index + match[0].length).trim();
    const nearby = [lines[index - 1], lines[index + 1], lines[index + 2], lines[index + 3]];
    const candidates = [remainder, ...nearby.filter(Boolean)].filter(Boolean);
    for (const candidate of candidates) {
      const name = candidate.split(/\s+(?:for|in|on|who|of|that|has|was|hereby|certif)\b/i)[0].trim();
      const words = name.split(/\s+/).filter(Boolean);
      if (words.length >= 2 && words.length <= 5 && words.every((word) => /^[A-Z][a-zA-Z'.-]*$/.test(word))) {
        return { value: clean(name, 120), confidence: 'high' };
      }
      if (words.length >= 2 && words.length <= 6 && /^[A-Z][a-zA-Z'.-]*(\s+[A-Z][a-zA-Z'.-]*)+\s*$/.test(name)) {
        return { value: clean(name, 120), confidence: 'low', note: 'Recipient name recognized with low confidence — please confirm.' };
      }
    }
  }
  return { value: '', confidence: 'missing', note: 'Recipient could not be recognized.' };
}

function findTitle(lines, { excludedLines } = {}) {
  const excluded = new Set(excludedLines);
  for (const [index, line] of lines.entries()) {
    if (excluded.has(index)) continue;
    const match = line.match(/(certificate of [a-z][a-z\s&-]{1,60})/i);
    if (match) {
      return { value: clean(titleCase(match[1])), confidence: 'high', lineIndex: index };
    }
  }
  const TITLE_WORDS = /\b(certificate|certification|diploma|achievement|completion|attendance|participation|recognition|excellence|award)\b/i;
  const REJECT_WORDS = /\b(no\.?|number|credential|https?|www|\d{2,4}[-/]\d{1,2}|issued|awarded|presented|expires?|valid)\b/i;
  const candidates = [...lines.entries()]
    .filter(([index, line]) => !excluded.has(index) && line.length >= 8 && line.length <= 100 && !/https?:\/\//i.test(line))
    .map(([index, line]) => {
      let score = Math.min(line.length, 40);
      if (TITLE_WORDS.test(line)) score += 40;
      if (REJECT_WORDS.test(line)) score -= 60;
      return { index, line, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.line.length - b.line.length);
  const best = candidates[0];
  if (best) {
    return {
      value: clean(titleCase(best.line)),
      confidence: best.score >= 60 ? 'medium' : 'low',
      lineIndex: best.index,
      note: best.score >= 60 ? undefined : 'Title recognized with low confidence — please confirm.',
    };
  }
  return { value: '', confidence: 'missing', note: 'Certificate title could not be recognized.' };
}

const TYPE_KEYWORDS = [
  { type: 'Award', regex: /\b(award|achievement|outstanding|excellence|honor|dean'?s?\s+list|scholar(?:ship)?|plaque)\b/i },
  { type: 'Workshop', regex: /\bworkshop(?:s|ped)?\b/i },
  { type: 'Seminar', regex: /\bseminar(?:s)?\b/i },
  { type: 'Training', regex: /\btraining\b|\bbootcamp\b|\bcourse(?:\s+completion)?\b/i },
];
const TECH_KEYWORDS = /\b(it\b|information technology|cyber|network|security|linux|python|java|cloud|data|computer|software|developer|programming)\b/i;
const CERTIFICATE_KEYWORDS = /\b(certificat(?:e|es|ion|ed|ing)|certification)\b/i;

export function suggestCertificateType(rawText) {
  const text = String(rawText ?? '');
  for (const { type, regex } of TYPE_KEYWORDS) {
    if (regex.test(text)) return { value: type, confidence: 'high', reason: 'matched keyword' };
  }
  if (CERTIFICATE_KEYWORDS.test(text) && TECH_KEYWORDS.test(text)) {
    return { value: 'IT Certification', confidence: 'medium', reason: 'certificate wording with IT topics' };
  }
  if (CERTIFICATE_KEYWORDS.test(text)) {
    return { value: '', confidence: 'low', reason: 'certificate wording without IT topics' };
  }
  return { value: '', confidence: 'missing', reason: 'no type keywords found' };
}

export function parseCertificateText(rawText) {
  const lines = normalizeLines(rawText);
  const flat = lines.join('\n');
  const notes = [];

  const excludedForIssuer = [];
  const title = findTitle(lines);
  if (title.lineIndex !== undefined) excludedForIssuer.push(title.lineIndex);

  const recipient = findRecipient(lines);
  if (recipient.note) notes.push(recipient.note);

  const date = pickDate(findDates(lines), lines.length);
  if (date.note) notes.push(date.note);

  const issuer = findIssuer(lines, excludedForIssuer);
  if (issuer.note) notes.push(issuer.note);

  const verifyUrl = findVerifyUrl(lines);
  if (verifyUrl.note) notes.push(verifyUrl.note);

  const credentialId = findCredentialId(lines);

  const suggestion = suggestCertificateType(flat);
  if (suggestion.confidence === 'low' || suggestion.confidence === 'missing') {
    notes.push('Certificate type could not be suggested confidently — please choose one.');
  }

  return {
    lines,
    rawText: flat,
    fields: {
      title: { value: title.value, confidence: title.confidence, note: title.note },
      issuer: { value: issuer.value, confidence: issuer.confidence, note: issuer.note },
      recipient: { value: recipient.value, confidence: recipient.confidence, note: recipient.note },
      dateEarned: { value: date.value, confidence: date.confidence, note: date.note },
      verifyUrl: { value: verifyUrl.value, confidence: verifyUrl.confidence, note: verifyUrl.note },
      credentialId: { value: credentialId.value, confidence: credentialId.confidence, note: credentialId.note },
      type: { value: suggestion.value, confidence: suggestion.confidence, reason: suggestion.reason },
    },
    notes,
  };
}
