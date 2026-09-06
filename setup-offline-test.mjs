/**
 * Simulates the Electron app's one-time license activation sequence:
 *   1. Calls the license check endpoint (or reads SCHOOL_VIDEO_KEY directly)
 *   2. Creates the local SQLite DB (same schema as getLocalDb())
 *   3. Writes video_key + last_check_at into local_auth_config
 *
 * Run once after adding LOCAL_DB_PATH, MEDIA_DIR, SCHOOL_VIDEO_KEY to .env.local,
 * then restart the dev server so it picks up the new vars.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── Load .env.local ──────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(resolve(__dirname, ".env.local"), "utf8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const val = trimmed.slice(eq + 1).trim();
  if (!process.env[key]) process.env[key] = val;
}

const dbPath = process.env.LOCAL_DB_PATH;
const videoKey = process.env.SCHOOL_VIDEO_KEY;

if (!dbPath) { console.error("LOCAL_DB_PATH not set"); process.exit(1); }
if (!videoKey) { console.error("SCHOOL_VIDEO_KEY not set"); process.exit(1); }
if (!/^[0-9a-f]{64}$/.test(videoKey)) {
  console.error(`SCHOOL_VIDEO_KEY must be exactly 64 lowercase hex chars. Got: "${videoKey}"`);
  process.exit(1);
}

// ── Open / create the SQLite DB ─────────────────────────────────────────────
const Database = (await import("better-sqlite3")).default;
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS local_credentials (
    user_id   TEXT PRIMARY KEY,
    email     TEXT NOT NULL UNIQUE,
    username  TEXT UNIQUE,
    pw_hash   TEXT NOT NULL,
    role      TEXT NOT NULL,
    school_id TEXT NOT NULL,
    class_id  TEXT,
    name      TEXT NOT NULL,
    cached_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS local_auth_config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS video_sync (
    lesson_id     TEXT PRIMARY KEY,
    status        TEXT NOT NULL DEFAULT 'pending',
    video_source  TEXT,
    source_url    TEXT,
    local_path    TEXT,
    error_text    TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    progress_pct  INTEGER NOT NULL DEFAULT 0,
    updated_at    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS class_lesson_progress (
    lesson_id              TEXT NOT NULL,
    class_id               TEXT NOT NULL,
    last_position_seconds  INTEGER NOT NULL DEFAULT 0,
    updated_at             INTEGER NOT NULL,
    PRIMARY KEY (lesson_id, class_id)
  );
`);

// Idempotent column migrations (same as getLocalDb)
for (const stmt of [
  "ALTER TABLE video_sync ADD COLUMN video_source TEXT",
  "ALTER TABLE video_sync ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE video_sync ADD COLUMN progress_pct INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE local_credentials ADD COLUMN username TEXT",
]) {
  try { db.exec(stmt); } catch { /* column already exists */ }
}

// ── Write video_key + timestamp (what Electron stores after license check) ──
db.prepare("INSERT OR REPLACE INTO local_auth_config (key, value) VALUES (?, ?)").run("video_key", videoKey);
db.prepare("INSERT OR REPLACE INTO local_auth_config (key, value) VALUES (?, ?)").run("last_check_at", Date.now().toString());

// ── Verify ───────────────────────────────────────────────────────────────────
const stored = db.prepare("SELECT value FROM local_auth_config WHERE key = 'video_key'").get();
const storedCheck = db.prepare("SELECT value FROM local_auth_config WHERE key = 'last_check_at'").get();

console.log("✓ DB created:", dbPath);
console.log("✓ video_key stored:", stored?.value ?? "(missing)");
console.log("✓ last_check_at stored:", new Date(Number(storedCheck?.value)).toISOString());
console.log("");
console.log("Next steps:");
console.log("  1. Restart the dev server (Ctrl+C, then pnpm dev)");
console.log("  2. Open the teacher dashboard and release lessons 1-3");
console.log("  3. Run: node inspect-offline.mjs  — to read the video_sync table state");

db.close();
