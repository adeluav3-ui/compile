import type BetterSqlite3 from "better-sqlite3";

// Singleton that survives Next.js hot-reload in dev
declare global {
  // eslint-disable-next-line no-var
  var __localDb: BetterSqlite3.Database | undefined;
}

/**
 * Returns the local SQLite database for offline School Edition use.
 * Returns null in cloud builds (LOCAL_DB_PATH env var not set).
 * Tables are created on first access — no separate migration step needed.
 */
export function getLocalDb(): BetterSqlite3.Database | null {
  if (!process.env.LOCAL_DB_PATH) return null;

  if (global.__localDb) return global.__localDb;

  // Dynamic require so this module doesn't crash in environments where
  // better-sqlite3 native bindings aren't compiled (e.g. Vercel build).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3") as typeof BetterSqlite3;
  const db = new Database(process.env.LOCAL_DB_PATH);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS local_credentials (
      user_id   TEXT PRIMARY KEY,
      email     TEXT NOT NULL UNIQUE,
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

  // Idempotent column migrations
  for (const stmt of [
    "ALTER TABLE video_sync ADD COLUMN video_source TEXT",
    "ALTER TABLE video_sync ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0",
  ]) {
    try { db.exec(stmt); } catch { /* column already exists */ }
  }

  // Startup recovery: any row stuck in "downloading" from a previous server run
  // has no active download thread — reset so it will be picked up by the next
  // ensureVideoSynced() or resumePendingDownloads() call.
  db.exec("UPDATE video_sync SET status = 'pending' WHERE status = 'downloading'");

  global.__localDb = db;
  return db;
}
