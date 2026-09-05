/**
 * Video sync for School Edition offline build.
 *
 * When a teacher releases a lesson, this module:
 *   1. Checks whether the video file is already on disk (encrypted).
 *   2. If online and missing: downloads, encrypts, and writes to MEDIA_DIR.
 *   3. If offline and missing: records a "pending" state.
 *
 * On reconnect, call resumePendingDownloads() to flush the pending queue.
 *
 * Video storage is per-lesson (not per-class): if two classes release the
 * same lesson, the second release finds it already ready on disk.
 *
 * This module is a no-op in cloud builds (LOCAL_DB_PATH not set).
 */

import { getLocalDb } from "@/db/local";
import { encryptVideo } from "@/lib/video-crypto";
import { writeFile, mkdir, access } from "fs/promises";
import path from "path";

export type VideoSyncStatus = "pending" | "downloading" | "ready" | "error";

export interface VideoSyncState {
  lessonId: string;
  status: VideoSyncStatus;
  localPath: string | null;
  errorText: string | null;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// State reads
// ---------------------------------------------------------------------------

export function getVideoSyncState(lessonId: string): VideoSyncState | null {
  const db = getLocalDb();
  if (!db) return null;

  const row = db
    .prepare(
      "SELECT lesson_id, status, local_path, error_text, updated_at FROM video_sync WHERE lesson_id = ?"
    )
    .get(lessonId) as
    | { lesson_id: string; status: string; local_path: string | null; error_text: string | null; updated_at: number }
    | undefined;

  if (!row) return null;

  return {
    lessonId: row.lesson_id,
    status: row.status as VideoSyncStatus,
    localPath: row.local_path,
    errorText: row.error_text,
    updatedAt: row.updated_at,
  };
}

export function getVideoSyncStates(lessonIds: string[]): Record<string, VideoSyncState> {
  const db = getLocalDb();
  if (!db || lessonIds.length === 0) return {};

  const placeholders = lessonIds.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT lesson_id, status, local_path, error_text, updated_at FROM video_sync WHERE lesson_id IN (${placeholders})`
    )
    .all(...lessonIds) as {
    lesson_id: string;
    status: string;
    local_path: string | null;
    error_text: string | null;
    updated_at: number;
  }[];

  return Object.fromEntries(
    rows.map((r) => [
      r.lesson_id,
      {
        lessonId: r.lesson_id,
        status: r.status as VideoSyncStatus,
        localPath: r.local_path,
        errorText: r.error_text,
        updatedAt: r.updated_at,
      },
    ])
  );
}

// ---------------------------------------------------------------------------
// State writes
// ---------------------------------------------------------------------------

function upsertSyncState(
  lessonId: string,
  sourceUrl: string | null,
  status: VideoSyncStatus,
  extra: { localPath?: string; errorText?: string | null } = {}
): void {
  const db = getLocalDb();
  if (!db) return;

  db.prepare(`
    INSERT INTO video_sync (lesson_id, source_url, status, local_path, error_text, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(lesson_id) DO UPDATE SET
      source_url = COALESCE(excluded.source_url, source_url),
      status     = excluded.status,
      local_path = COALESCE(excluded.local_path, local_path),
      error_text = excluded.error_text,
      updated_at = excluded.updated_at
  `).run(
    lessonId,
    sourceUrl,
    status,
    extra.localPath ?? null,
    extra.errorText ?? null,
    Date.now()
  );
}

// ---------------------------------------------------------------------------
// Connectivity
// ---------------------------------------------------------------------------

async function isOnline(): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_SUPABASE_URL;
  if (!supabaseUrl) return false;
  try {
    const res = await Promise.race([
      fetch(supabaseUrl, { method: "HEAD" }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 3000)
      ),
    ]);
    return (res as Response).ok || (res as Response).status < 500;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Encryption key
// ---------------------------------------------------------------------------

function getVideoKey(): string | null {
  const db = getLocalDb();
  if (!db) return null;
  const row = db
    .prepare("SELECT value FROM local_auth_config WHERE key = 'video_key'")
    .get() as { value: string } | undefined;
  return row?.value ?? null;
}

// ---------------------------------------------------------------------------
// Source URL derivation
// Assumption: School Edition videos live in a Supabase Storage public bucket.
// Bucket URL is provided via SCHOOL_VIDEO_BASE_URL env var during Electron setup.
// ---------------------------------------------------------------------------

export function deriveSourceUrl(lessonId: string): string | null {
  const base = process.env.SCHOOL_VIDEO_BASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/${lessonId}.mp4`;
}

// ---------------------------------------------------------------------------
// Background download
// ---------------------------------------------------------------------------

// Tracks which lessons are actively downloading to avoid double-starts
const activeDownloads = new Set<string>();

export async function scheduleDownload(
  lessonId: string,
  sourceUrl: string
): Promise<void> {
  if (activeDownloads.has(lessonId)) return;

  const mediaDir = process.env.MEDIA_DIR;
  if (!mediaDir) {
    upsertSyncState(lessonId, sourceUrl, "error", {
      errorText: "MEDIA_DIR not configured.",
    });
    return;
  }

  const videoKey = getVideoKey();
  if (!videoKey) {
    upsertSyncState(lessonId, sourceUrl, "error", {
      errorText: "Video encryption key not configured. Complete license setup first.",
    });
    return;
  }

  // Non-blocking: fire and forget; API response returns immediately
  setImmediate(() => {
    void runDownload(lessonId, sourceUrl, mediaDir, videoKey);
  });
}

async function runDownload(
  lessonId: string,
  sourceUrl: string,
  mediaDir: string,
  videoKey: string
): Promise<void> {
  activeDownloads.add(lessonId);
  upsertSyncState(lessonId, sourceUrl, "downloading");

  try {
    await mkdir(mediaDir, { recursive: true });

    const res = await fetch(sourceUrl);
    if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);

    const buf = Buffer.from(await res.arrayBuffer());
    const encrypted = encryptVideo(buf, videoKey);

    const localPath = path.join(mediaDir, `${lessonId}.enc`);
    await writeFile(localPath, encrypted);

    upsertSyncState(lessonId, sourceUrl, "ready", { localPath });
  } catch (err) {
    upsertSyncState(lessonId, sourceUrl, "error", { errorText: String(err) });
  } finally {
    activeDownloads.delete(lessonId);
  }
}

// ---------------------------------------------------------------------------
// Check if a "ready" file actually exists on disk (guard against manual deletion)
// ---------------------------------------------------------------------------

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Main entry: called when a lesson is released
// ---------------------------------------------------------------------------

export async function ensureVideoSynced(lessonId: string): Promise<VideoSyncStatus> {
  const db = getLocalDb();
  if (!db) return "ready"; // Cloud build: no local sync needed

  const sourceUrl = deriveSourceUrl(lessonId);

  const state = getVideoSyncState(lessonId);

  // Already ready — verify file still exists
  if (state?.status === "ready" && state.localPath) {
    const exists = await fileExists(state.localPath);
    if (exists) return "ready";
    // File was deleted — fall through to re-download
  }

  // Already downloading
  if (state?.status === "downloading" || activeDownloads.has(lessonId)) {
    return "downloading";
  }

  if (!sourceUrl) {
    // No source URL configured — can't sync
    upsertSyncState(lessonId, null, "error", {
      errorText: "SCHOOL_VIDEO_BASE_URL not configured.",
    });
    return "error";
  }

  const online = await isOnline();

  if (online) {
    await scheduleDownload(lessonId, sourceUrl);
    return "downloading";
  } else {
    upsertSyncState(lessonId, sourceUrl, "pending");
    return "pending";
  }
}

// ---------------------------------------------------------------------------
// Resume all pending/errored downloads — call this on network reconnect
// ---------------------------------------------------------------------------

export async function resumePendingDownloads(): Promise<{
  started: string[];
  skipped: number;
}> {
  const db = getLocalDb();
  if (!db) return { started: [], skipped: 0 };

  if (!(await isOnline())) return { started: [], skipped: 0 };

  const rows = db
    .prepare(
      "SELECT lesson_id, source_url FROM video_sync WHERE status IN ('pending', 'error') AND source_url IS NOT NULL"
    )
    .all() as { lesson_id: string; source_url: string }[];

  const started: string[] = [];
  for (const row of rows) {
    if (!activeDownloads.has(row.lesson_id)) {
      await scheduleDownload(row.lesson_id, row.source_url);
      started.push(row.lesson_id);
    }
  }

  return { started, skipped: rows.length - started.length };
}
