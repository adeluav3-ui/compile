/**
 * DELIVERY_MODE controls whether the School Edition runs the full offline
 * pipeline (download → encrypt → local decrypt-and-stream) or the online
 * pilot mode (live proxy through our route, no local file handling).
 *
 * Values:
 *   DELIVERY_MODE=online   — pilot/cloud mode (default when not set)
 *   DELIVERY_MODE=offline  — full Electron offline build
 *
 * This is the single source of truth. Do not scatter ad-hoc LOCAL_DB_PATH
 * checks across routes to determine delivery behavior — read this instead.
 * LOCAL_DB_PATH remains the mechanism for opening the SQLite database; it
 * does not independently determine delivery mode.
 */
export function isOnlineDelivery(): boolean {
  return process.env.DELIVERY_MODE !== "offline";
}
