/**
 * Video sync for School Edition offline build.
 *
 * Triggered when a teacher releases a lesson. Both YouTube-sourced lessons
 * and storage-sourced lessons go through the same pipeline: download →
 * encryptVideo() → write to {MEDIA_DIR}/{lessonId}.enc → status "ready".
 * Playback is always via /api/school/video/[lessonId] (decrypt-in-memory-
 * and-stream). No YouTube embeds reach the student's browser.
 *
 * video_source = "youtube" → yt-dlp extracts the master stream.
 * video_source = "storage" → fetched directly from SCHOOL_VIDEO_BASE_URL.
 *
 * Migration path: flip video_source from "youtube" → "storage" and update
 * source_url. Everything downstream (encryption, storage, gating, playback)
 * is unchanged — the divergence ends at the fetch step.
 *
 * No-op in cloud builds (LOCAL_DB_PATH not set).
 */

import { getLocalDb } from "@/db/local";
import { encryptVideo } from "@/lib/video-crypto";
import { writeFile, mkdir, access, mkdtemp, rm, readdir, readFile } from "fs/promises";
import path from "path";
import os from "os";
import { spawn } from "child_process";

export type VideoSource = "youtube" | "storage";
export type VideoSyncStatus = "pending" | "downloading" | "ready" | "error";

export interface VideoSyncState {
  lessonId: string;
  status: VideoSyncStatus;
  videoSource: VideoSource | null;
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
      "SELECT lesson_id, status, video_source, local_path, error_text, updated_at FROM video_sync WHERE lesson_id = ?"
    )
    .get(lessonId) as {
    lesson_id: string;
    status: string;
    video_source: string | null;
    local_path: string | null;
    error_text: string | null;
    updated_at: number;
  } | undefined;

  if (!row) return null;

  return {
    lessonId: row.lesson_id,
    status: row.status as VideoSyncStatus,
    videoSource: row.video_source as VideoSource | null,
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
      `SELECT lesson_id, status, video_source, local_path, error_text, updated_at FROM video_sync WHERE lesson_id IN (${placeholders})`
    )
    .all(...lessonIds) as {
    lesson_id: string;
    status: string;
    video_source: string | null;
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
        videoSource: r.video_source as VideoSource | null,
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
  videoSource: VideoSource | null,
  sourceUrl: string | null,
  status: VideoSyncStatus,
  extra: { localPath?: string; errorText?: string | null } = {}
): void {
  const db = getLocalDb();
  if (!db) return;

  db.prepare(`
    INSERT INTO video_sync (lesson_id, video_source, source_url, status, local_path, error_text, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(lesson_id) DO UPDATE SET
      video_source = COALESCE(excluded.video_source, video_source),
      source_url   = COALESCE(excluded.source_url, source_url),
      status       = excluded.status,
      local_path   = COALESCE(excluded.local_path, local_path),
      error_text   = excluded.error_text,
      updated_at   = excluded.updated_at
  `).run(
    lessonId,
    videoSource,
    sourceUrl,
    status,
    extra.localPath ?? null,
    extra.errorText ?? null,
    Date.now()
  );
}

// ---------------------------------------------------------------------------
// Source resolution — derives source type and URL from lesson record
// ---------------------------------------------------------------------------

export interface SourceInfo {
  source: VideoSource;
  url: string;
}

export function deriveSourceInfo(
  lessonId: string,
  lesson: { videoId: string | null; videoProvider: string | null }
): SourceInfo | null {
  if (lesson.videoProvider === "youtube" && lesson.videoId) {
    return {
      source: "youtube",
      url: `https://www.youtube.com/watch?v=${lesson.videoId}`,
    };
  }

  const base = process.env.SCHOOL_VIDEO_BASE_URL;
  if (!base) return null;

  return {
    source: "storage",
    url: `${base.replace(/\/$/, "")}/${lessonId}.mp4`,
  };
}

// ---------------------------------------------------------------------------
// Connectivity
// ---------------------------------------------------------------------------

async function isOnline(): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_SUPABASE_URL;
  if (!supabaseUrl) return false;
  try {
    const result = await Promise.race([
      fetch(supabaseUrl, { method: "HEAD" }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 3000)
      ),
    ]);
    return (result as Response).ok || (result as Response).status < 500;
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
// Source fetchers
// ---------------------------------------------------------------------------

async function fetchFromStorage(sourceUrl: string): Promise<Buffer> {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function fetchFromYouTube(youtubeUrl: string): Promise<Buffer> {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "compile-sync-"));

  try {
    const outputTemplate = path.join(tmpDir, "%(id)s.%(ext)s");

    await new Promise<void>((resolve, reject) => {
      const proc = spawn("yt-dlp", [
        "--no-playlist",
        // Best single MP4 file; falls back to best available then re-muxes to MP4
        "-f", "bv[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b",
        "--merge-output-format", "mp4",
        "--no-warnings",
        "--no-progress",
        "-o", outputTemplate,
        youtubeUrl,
      ]);

      let stderr = "";
      proc.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });

      proc.on("error", (err) => {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") {
          reject(new Error("yt-dlp not found. Install it: https://github.com/yt-dlp/yt-dlp#installation"));
        } else {
          reject(err);
        }
      });

      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`yt-dlp exited with code ${code}.\n${stderr.slice(-500)}`));
      });
    });

    const files = await readdir(tmpDir);
    if (files.length === 0) throw new Error("yt-dlp produced no output file");

    return await readFile(path.join(tmpDir, files[0]));
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Background download — both paths converge here after fetching raw bytes
// ---------------------------------------------------------------------------

const activeDownloads = new Set<string>();

export async function scheduleDownload(
  lessonId: string,
  sourceInfo: SourceInfo
): Promise<void> {
  if (activeDownloads.has(lessonId)) return;

  const mediaDir = process.env.MEDIA_DIR;
  if (!mediaDir) {
    upsertSyncState(lessonId, sourceInfo.source, sourceInfo.url, "error", {
      errorText: "MEDIA_DIR not configured.",
    });
    return;
  }

  const videoKey = getVideoKey();
  if (!videoKey) {
    upsertSyncState(lessonId, sourceInfo.source, sourceInfo.url, "error", {
      errorText: "Video encryption key not configured. Complete license setup first.",
    });
    return;
  }

  setImmediate(() => {
    void runDownload(lessonId, sourceInfo, mediaDir, videoKey);
  });
}

async function runDownload(
  lessonId: string,
  sourceInfo: SourceInfo,
  mediaDir: string,
  videoKey: string
): Promise<void> {
  activeDownloads.add(lessonId);
  upsertSyncState(lessonId, sourceInfo.source, sourceInfo.url, "downloading");

  try {
    await mkdir(mediaDir, { recursive: true });

    // ── Fetch raw bytes — only divergence between source types ──────────────
    const rawBytes =
      sourceInfo.source === "youtube"
        ? await fetchFromYouTube(sourceInfo.url)
        : await fetchFromStorage(sourceInfo.url);

    // ── Everything below is identical regardless of source ──────────────────
    const encrypted = encryptVideo(rawBytes, videoKey);
    const localPath = path.join(mediaDir, `${lessonId}.enc`);
    await writeFile(localPath, encrypted);

    upsertSyncState(lessonId, sourceInfo.source, sourceInfo.url, "ready", { localPath });
  } catch (err) {
    upsertSyncState(lessonId, sourceInfo.source, sourceInfo.url, "error", {
      errorText: String(err),
    });
  } finally {
    activeDownloads.delete(lessonId);
  }
}

// ---------------------------------------------------------------------------
// File existence guard
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
// Main entry point — called when a lesson is released
// ---------------------------------------------------------------------------

export async function ensureVideoSynced(
  lessonId: string,
  lesson: { videoId: string | null; videoProvider: string | null }
): Promise<VideoSyncStatus> {
  const db = getLocalDb();
  if (!db) return "ready"; // Cloud build — no local sync

  const sourceInfo = deriveSourceInfo(lessonId, lesson);
  const state = getVideoSyncState(lessonId);

  // Already ready — verify file still on disk
  if (state?.status === "ready" && state.localPath) {
    if (await fileExists(state.localPath)) return "ready";
    // File deleted — re-download
  }

  // Already in-flight
  if (state?.status === "downloading" || activeDownloads.has(lessonId)) {
    return "downloading";
  }

  if (!sourceInfo) {
    upsertSyncState(lessonId, null, null, "error", {
      errorText:
        "No video source configured. Set SCHOOL_VIDEO_BASE_URL or ensure the lesson has a videoId.",
    });
    return "error";
  }

  const online = await isOnline();
  if (online) {
    await scheduleDownload(lessonId, sourceInfo);
    return "downloading";
  }

  upsertSyncState(lessonId, sourceInfo.source, sourceInfo.url, "pending");
  return "pending";
}

// ---------------------------------------------------------------------------
// Resume — called by Electron on network reconnect
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
      "SELECT lesson_id, video_source, source_url FROM video_sync WHERE status IN ('pending', 'error') AND source_url IS NOT NULL"
    )
    .all() as { lesson_id: string; video_source: string; source_url: string }[];

  const started: string[] = [];
  for (const row of rows) {
    if (!activeDownloads.has(row.lesson_id) && row.video_source) {
      await scheduleDownload(row.lesson_id, {
        source: row.video_source as VideoSource,
        url: row.source_url,
      });
      started.push(row.lesson_id);
    }
  }

  return { started, skipped: rows.length - started.length };
}
