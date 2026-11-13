/**
 * User-facing message helpers.
 *
 * Administrator-facing copy uses plain, professional language.
 * Technical details (SQL errors, policy names, keys, tokens, internal URLs)
 * are kept in developer logs; the UI shows the same stable message either way.
 */

const GENERIC_MESSAGES = {
  loadFailed: 'We couldn’t load your saved portfolio information. Please check your connection and try again.',
  saveFailed: 'Your changes couldn’t be saved. Please try again. Your existing saved information remains unchanged.',
  publishFailed: 'We couldn’t publish your changes. Your current public portfolio remains unchanged.',
  unpublishFailed: 'We couldn’t unpublish your portfolio. You can try again or contact the administrator.',
  authFailed: 'Your sign-in could not be completed. Please verify your credentials and try again.',
  unavailable: 'Sign-in is temporarily unavailable. Please try again shortly.',
  cleanupFailed: 'Some older public assets need attention. You can retry the cleanup from this screen.',
  invalidData: 'Saved portfolio information is incomplete or unreadable. Please restore a known-good backup before continuing.',
  designFailed: 'These design settings couldn’t be saved. Please try again.',
  uploadFailed: 'The file couldn’t be uploaded. Please try again with a different file.',
  forbidden: 'This account does not have permission to manage this portfolio.',
  retry: 'We couldn’t complete that action. Please try again.',
};

/**
 * Map an internal error to an administrator-safe message.
 * Returns the most specific applicable message, never the raw error text.
 */
export function userFacingMessage(error, context = 'retry') {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const lower = message.toLowerCase();

  // Authentication / authorization signals → short auth copy
  if (context === 'auth') {
    if (lower.includes('mfa') || lower.includes('aal') || lower.includes('authenticator') || lower.includes('jwt') || lower.includes('permission') || lower.includes('rls') || lower.includes('policy') || lower.includes('unauthorized') || lower.includes('not authorized')) {
      return GENERIC_MESSAGES.authFailed;
    }
    return GENERIC_MESSAGES.authFailed;
  }

  // Configuration-time and missing-resource signals → context-aware
  if (lower.includes('not configured') || lower.includes('placeholder') || lower.includes('missing')) {
    if (context === 'save') return GENERIC_MESSAGES.saveFailed;
    if (context === 'publish') return GENERIC_MESSAGES.publishFailed;
    if (context === 'unpublish') return GENERIC_MESSAGES.unpublishFailed;
    if (context === 'design') return GENERIC_MESSAGES.designFailed;
    if (context === 'upload') return GENERIC_MESSAGES.uploadFailed;
    if (context === 'cleanup') return GENERIC_MESSAGES.cleanupFailed;
    return GENERIC_MESSAGES.loadFailed;
  }

  // Invalid saved data
  if (lower.includes('invalid') && (lower.includes('json') || lower.includes('saved portfolio'))) {
    return GENERIC_MESSAGES.invalidData;
  }
  if (lower.includes('restore a valid backup')) return GENERIC_MESSAGES.invalidData;

  // Network / fetch / connection signals
  if (lower.includes('fetch') || lower.includes('network') || lower.includes('connect') || lower.includes('timeout')) {
    return GENERIC_MESSAGES.loadFailed;
  }

  // Permission/policy errors → context-aware professional copy
  if (lower.includes('rls') || lower.includes('policy') || lower.includes('permission denied') || lower.includes('jwt') || lower.includes('unauthorized') || lower.includes('not authorized') || lower.includes('mfa') || lower.includes('aal') || lower.includes('authenticator')) {
    if (context === 'save') return GENERIC_MESSAGES.saveFailed;
    if (context === 'publish') return GENERIC_MESSAGES.publishFailed;
    if (context === 'unpublish') return GENERIC_MESSAGES.unpublishFailed;
    if (context === 'design') return GENERIC_MESSAGES.designFailed;
    if (context === 'upload') return GENERIC_MESSAGES.uploadFailed;
    if (context === 'cleanup') return GENERIC_MESSAGES.cleanupFailed;
    return GENERIC_MESSAGES.loadFailed;
  }

  // Fallback to context-specific professional copy
  if (context === 'save') return GENERIC_MESSAGES.saveFailed;
  if (context === 'publish') return GENERIC_MESSAGES.publishFailed;
  if (context === 'unpublish') return GENERIC_MESSAGES.unpublishFailed;
  if (context === 'design') return GENERIC_MESSAGES.designFailed;
  if (context === 'upload') return GENERIC_MESSAGES.uploadFailed;
  if (context === 'cleanup') return GENERIC_MESSAGES.cleanupFailed;
  if (context === 'auth') return GENERIC_MESSAGES.authFailed;
  return GENERIC_MESSAGES.retry;
}

/** Stable copy for successful high-stakes actions. */
export const successMessages = {
  draftSaved: 'Your changes have been saved successfully.',
  published: 'Your portfolio has been published successfully.',
  unpublished: 'Your portfolio is no longer published.',
  imported: 'Records have been imported into the draft. Review and save before publishing.',
  photoUploaded: 'Profile photo uploaded. Publish your portfolio to show it to recruiters.',
  aboutImageUploaded: 'About image uploaded. Publish your portfolio to show it to recruiters.',
  assetRemoved: 'The image was removed from the draft. Re-publish to update the public site.',
  resumeUploaded: 'Resume uploaded. Publish your portfolio to make the new file available.',
  fontUploaded: 'Font uploaded. Save design settings to apply it.',
};
