export const CREDENTIAL_ROTATION_INTERVAL = 2500;

/**
 * Automatic credential rotation only makes sense with more than one
 * record when the user has not requested reduced motion.
 */
export function canAutoRotate(reducedMotion, count) {
  return !reducedMotion && Number.isInteger(count) && count > 1;
}

export function nextCredentialIndex(current, count) {
  if (!Number.isInteger(count) || count <= 0) return 0;
  return ((Number(current) || 0) + 1) % count;
}
