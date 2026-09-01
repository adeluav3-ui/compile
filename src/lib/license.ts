/**
 * School Edition license check + grace-period enforcement.
 *
 * How it works:
 *  1. The Electron app calls /api/school/license/check daily (when online).
 *  2. On success the server returns the school's video decryption key and
 *     the current timestamp. The app stores LAST_CHECK_AT in SQLite.
 *  3. Before starting any video playback, the app reads LAST_CHECK_AT and
 *     compares it to now. If gap > GRACE_DAYS the key is discarded and
 *     playback is blocked until a successful check occurs.
 *  4. This enforcement is purely local — no network call is needed at
 *     playback time. Works fully offline within the grace window.
 */

export const GRACE_DAYS = 7;
export const GRACE_MS = GRACE_DAYS * 24 * 60 * 60 * 1000;

/** Returns true if the last successful license check is still within the grace window. */
export function isWithinGrace(lastCheckAt: Date | null): boolean {
  if (!lastCheckAt) return false;
  return Date.now() - lastCheckAt.getTime() < GRACE_MS;
}
