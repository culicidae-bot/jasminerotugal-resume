/**
 * Explainable, local-only document classification.
 *
 * Two independent dimensions:
 *   destination: 'certificate' | 'achievement'
 *   category:    Certification | Training | Seminar | Workshop | Webinar | Conference |
 *                Competition | CTF | Hackathon | Award | Academic Recognition |
 *                Participation | Volunteer Recognition | Other
 *
 * Every suggestion carries a confidence level and the evidence that produced it,
 * so the administrator can review instead of trusting a guess. Ambiguous
 * documents are marked `needsReview: true` rather than classified confidently.
 * Nothing here calls an external API or sends document text anywhere.
 */

export const DESTINATIONS = Object.freeze(['certificate', 'achievement']);

export const CATEGORIES = Object.freeze([
  'Certification',
  'Training',
  'Seminar',
  'Workshop',
  'Webinar',
  'Conference',
  'Competition',
  'CTF',
  'Hackathon',
  'Award',
  'Academic Recognition',
  'Participation',
  'Volunteer Recognition',
  'Other',
]);

const ACHIEVEMENT_MARKERS = [
  { pattern: /\b(winner|won|champion|first\s*place|1st\s*place|grand\s+prize|gold\s+medal|best\s+(paper|presentation|project|solution))\b/i, weight: 4, label: 'winning language' },
  { pattern: /\b(place|placed|placement)\s*(1st|2nd|3rd|first|second|third|\d+(?:st|nd|rd|th))\b/i, weight: 3, label: 'placement language' },
  { pattern: /\b(runner[\s-]?up|finalist|semifinalist|distinguished|honorable\s+mention|top\s*(three|five|ten)|podium)\b/i, weight: 3, label: 'finalist language' },
  { pattern: /\b(award(?:ed|s)?|prize|medal|trophy|plaque|laureate|citation)\b/i, weight: 3, label: 'award language' },
  { pattern: /\b(academic|dean'?s?\s+list|magna\s+cum\s+laude|summa\s+cum\s+laude|cum\s+laude|highest\s+honors?|honor(?:s|roll)|distinction|distinguished\s+graduate)\b/i, weight: 3, label: 'academic distinction language' },
  { pattern: /\b(recognized|recognition|accolade|outstanding|excellence|exemplary|meritorious)\b/i, weight: 2, label: 'recognition language' },
  { pattern: /\b(scholarship|fellowship|stipend)\b/i, weight: 2, label: 'scholarship language' },
  { pattern: /\bvolunteer(ed|ing)?\b/i, weight: 1, label: 'volunteer context' },
  { pattern: /\b(top|best)\s+(speaker|presenter|paper)\b/i, weight: 2, label: 'award for speaker/paper' },
];

const CERTIFICATE_MARKERS = [
  { pattern: /\b(certificat(e|ion|ed|es)|certification)\b/i, weight: 1, label: 'certificate signal' },
  { pattern: /\b(completion|complete(?:d|s)|attendance|attended|participat(?:e|ed|es|ing)|presence)\b/i, weight: 2, label: 'completion/attendance language' },
  { pattern: /\b(course|training|seminar|workshop|webinar|conference|bootcamp|symposium|summit|convention|masterclass)\b/i, weight: 2, label: 'event-type language' },
  { pattern: /\b(issued|awarded\s+(on|this)\s+certificat|certificate\s+of\s+participation|certificate\s+of\s+attendance|certificate\s+of\s+completion|in\s+recognition\s+of)\b/i, weight: 2, label: 'formal certificate wording' },
  { pattern: /\b(continuing\s+education|CPD|CEU|credit\s+hours?)\b/i, weight: 1, label: 'CE credit wording' },
];

const COMPETITION_MARKERS = [
  { pattern: /\b(capture\s*the\s*flag|ctf)\b/i, weight: 5, label: 'CTF reference' },
  { pattern: /\b(hackathon|hack\s*fest)\b/i, weight: 5, label: 'hackathon reference' },
  { pattern: /\b(competit|contest|olympiad|championship|open\s+(?:challenge|problem))\b/i, weight: 3, label: 'competition language' },
  { pattern: /\b(challenge|ctf|pwn|pwn2own|vsctf|picoctf|cybercom|defcon)\b/i, weight: 3, label: 'capture-the-flag style reference' },
  { pattern: /\b(decipher|forensics|reversing|cryptography|web\s+exploitation)\b/i, weight: 2, label: 'cybersecurity competition domain' },
];

const CTF_CATEGORY = /\bcapture\s*the\s*flag|ctf\b/i;
const HACKATHON_CATEGORY = /\bhackathon|hack\s*fest/i;
const WORKSHOP_CATEGORY = /\bworkshop/i;
const SEMINAR_CATEGORY = /\bseminar/i;
const WEBINAR_CATEGORY = /\bwebinar/i;
const CONFERENCE_CATEGORY = /\bconference|convention|summit|symposium/i;
const TRAINING_CATEGORY = /\btraining|bootcamp|course|masterclass|class\b/i;
const CERTIFICATION_CATEGORY = /\bcertif/i;

export function classifyDocument(rawText) {
  const text = String(rawText ?? '');
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);

  const evidence = [];

  let achievementScore = 0;
  let certificateScore = 0;
  for (const { pattern, weight, label } of ACHIEVEMENT_MARKERS) {
    if (pattern.test(text)) { achievementScore += weight; evidence.push(`+${weight} ${label}`); }
  }
  for (const { pattern, weight, label } of CERTIFICATE_MARKERS) {
    if (pattern.test(text)) { certificateScore += weight; evidence.push(`+${weight} ${label}`); }
  }

  // Competition/CTF context without winning language leans toward certificate.
  const hasCompetition = COMPETITION_MARKERS.some(({ pattern }) => pattern.test(text));
  if (hasCompetition) {
    certificateScore += 2;
    evidence.push('+2 competition context');
  }

  // A clear win overrides everything; ties or small deltas mean "needs review".
  const delta = achievementScore - certificateScore;
  let destination = 'certificate';
  let destinationConfidence = 'medium';
  let needsReview = false;

  if (delta >= 3) {
    destination = 'achievement';
    destinationConfidence = achievementScore >= 6 ? 'high' : 'medium';
  } else if (delta <= -3) {
    destination = 'certificate';
    destinationConfidence = certificateScore >= 5 ? 'high' : 'medium';
  } else {
    destinationConfidence = 'low';
    needsReview = true;
    destination = delta >= 0 ? 'achievement' : 'certificate';
  }

  const category = classifyCategory(text, { destination });

  return {
    destination,
    destinationConfidence,
    destinationEvidence: evidence.slice(0, 12),
    category: category.value,
    categoryConfidence: category.confidence,
    categoryEvidence: category.evidence,
    needsReview,
    scores: { achievement: achievementScore, certificate: certificateScore },
  };
}

function classifyCategory(text, { destination } = {}) {
  const evidence = [];
  const hasCompetition = COMPETITION_MARKERS.some(({ pattern }) => pattern.test(text));

  // Terminal categories first — an explicit award wins for achievements.
  if (destination === 'achievement' && /\b(award|prize|medal|winner|plac(?:ed|ement)|finalist|runner[\s-]?up|champion|grand\s+prize|first\s*place|1st\s*place|gold\s+medal|honor|citation|trophy|scholarship|fellowship)\b/i.test(text)) {
    evidence.push('explicit award/placement language');
    return { value: 'Award', confidence: 'high', evidence };
  }
  if (/\b(academic|dean'?s?\s+list|magna\s+cum\s+laude|summa\s+cum\s+laude|cum\s+laude|highest\s+honors?|honor(?:s|roll)|distinction|academic\s+excellence|distinguished\s+graduate)\b/i.test(text)) {
    evidence.push('academic distinction language');
    return { value: 'Academic Recognition', confidence: 'high', evidence };
  }

  if (CTF_CATEGORY.test(text)) { evidence.push('capture-the-flag reference'); return { value: 'CTF', confidence: 'high', evidence }; }
  if (HACKATHON_CATEGORY.test(text)) { evidence.push('hackathon reference'); return { value: 'Hackathon', confidence: 'high', evidence }; }
  if (hasCompetition) { evidence.push('competition language'); return { value: 'Competition', confidence: 'high', evidence }; }
  if (SEMINAR_CATEGORY.test(text)) { evidence.push('seminar reference'); return { value: 'Seminar', confidence: 'high', evidence }; }
  if (WORKSHOP_CATEGORY.test(text)) { evidence.push('workshop reference'); return { value: 'Workshop', confidence: 'high', evidence }; }
  if (WEBINAR_CATEGORY.test(text)) { evidence.push('webinar reference'); return { value: 'Webinar', confidence: 'high', evidence }; }
  if (CONFERENCE_CATEGORY.test(text)) { evidence.push('conference reference'); return { value: 'Conference', confidence: 'high', evidence }; }
  if (TRAINING_CATEGORY.test(text)) { evidence.push('training reference'); return { value: 'Training', confidence: 'medium', evidence }; }

  // Volunteer context — keep it explicit rather than inferring service.
  if (/\bvolunteer(ed|ing)?\b/i.test(text) && /(recognition|appreciation|service|contribution|award|certificate)/i.test(text)) {
    evidence.push('volunteer recognition language');
    return { value: 'Volunteer Recognition', confidence: 'medium', evidence };
  }

  if (CERTIFICATION_CATEGORY.test(text)) { evidence.push('certification wording'); return { value: 'Certification', confidence: 'medium', evidence }; }
  if (destination === 'achievement') { evidence.push('achievement destination without stronger signals'); return { value: 'Award', confidence: 'low', evidence }; }
  evidence.push('no strong category keywords');
  return { value: 'Other', confidence: 'low', evidence };
}
