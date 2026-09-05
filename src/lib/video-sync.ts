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
 * Retry policy: up to 3 attempts (30s, 2min backoffs). After 3 failures the
 * row becomes "degraded_online_only" and a 15-min background timer keeps
 * retrying silently. "error" is kept in the type for backward compat with
 * existing DB rows but is never written by new code.
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
// "error" kept for backward compat with DB rows written by previous code.
// New failures write "degraded_online_only" after retries are exhausted.
export type VideoSyncStatus =
  | "pending"
  | "downloading"
  | "ready"
  | "degraded_online_only"
  | "error";

export interface VideoSyncState {
  lessonId: string;
  status: VideoSyncStatus;
  videoSource: VideoSource | null;
  sourceUrl: string | null;
  localPath: string | null;
  errorText: string | null;
  attemptCount: number;
  progressPct: number; // 0-99 while downloading, 100 only when ready
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// State reads
// ---------------------------------------------------------------------------

type RawSyncRow = {
  lesson_id: string;
  status: string;
  video_source: string | null;
  source_url: string | null;
  local_path: string | null;
  error_text: string | null;
  attempt_count: number;
  progress_pct: number;
  updated_at: number;
};

function rowToState(r: RawSyncRow): VideoSyncState {
  return {
    lessonId: r.lesson_id,
    status: r.status as VideoSyncStatus,
    videoSource: r.video_source as VideoSource | null,
    sourceUrl: r.source_url,
    localPath: r.local_path,
    errorText: r.error_text,
    attemptCount: r.attempt_count ?? 0,
    progressPct: r.progress_pct ?? 0,
    updatedAt: r.updated_at,
  };
}

export function getVideoSyncState(lessonId: string): VideoSyncState | null {
  const db = getLocalDb();
  if (!db) return null;

  const row = db
    .prepare(
      "SELECT lesson_id, status, video_source, source_url, local_path, error_text, attempt_count, progress_pct, updated_at FROM video_sync WHERE lesson_id = ?"
    )
    .get(lessonId) as RawSyncRow | undefined;

  return row ? rowToState(row) : null;
}

export function getVideoSyncStates(lessonIds: string[]): Record<string, VideoSyncState> {
  const db = getLocalDb();
  if (!db || lessonIds.length === 0) return {};

  const placeholders = lessonIds.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT lesson_id, status, video_source, source_url, local_path, error_text, attempt_count, progress_pct, updated_at FROM video_sync WHERE lesson_id IN (${placeholders})`
    )
    .all(...lessonIds) as RawSyncRow[];

  return Object.fromEntries(rows.map((r) => [r.lesson_id, rowToState(r)]));
}

// ---------------------------------------------------------------------------
// State writes
// ---------------------------------------------------------------------------

function upsertSyncState(
  lessonId: string,
  videoSource: VideoSource | null,
  sourceUrl: string | null,
  status: VideoSyncStatus,
  extra: { localPath?: string; errorText?: string | null; attemptCount?: number } = {}
): void {
  const db = getLocalDb();
  if (!db) return;

  db.prepare(`
    INSERT INTO video_sync (lesson_id, video_source, source_url, status, local_path, error_text, attempt_count, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(lesson_id) DO UPDATE SET
      video_source  = COALESCE(excluded.video_source, video_source),
      source_url    = COALESCE(excluded.source_url, source_url),
      status        = excluded.status,
      local_path    = COALESCE(excluded.local_path, local_path),
      error_text    = excluded.error_text,
      attempt_count = CASE WHEN excluded.attempt_count IS NOT NULL THEN excluded.attempt_count ELSE attempt_count END,
      updated_at    = excluded.updated_at
  `).run(
    lessonId,
    videoSource,
    sourceUrl,
    status,
    extra.localPath ?? null,
    extra.errorText ?? null,
    extra.attemptCount ?? null,
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

export async function isOnline(): Promise<boolean> {
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
// Download progress — written to SQLite while a download is in flight.
// Capped at 99 so status "ready" (written by upsertSyncState) is unambiguous.
// ---------------------------------------------------------------------------

function writeProgress(lessonId: string, pct: number): void {
  const db = getLocalDb();
  if (!db) return;
  db.prepare(
    "UPDATE video_sync SET progress_pct = ?, updated_at = ? WHERE lesson_id = ?"
  ).run(Math.min(99, Math.max(0, pct)), Date.now(), lessonId);
}

// ---------------------------------------------------------------------------
// Source fetchers
// ---------------------------------------------------------------------------

async function fetchFromStorage(
  sourceUrl: string,
  onProgress: (pct: number) => void
): Promise<Buffer> {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);

  const contentLength = res.headers.get("content-length");
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  // No content-length or no body stream — fall back to buffered download
  if (!res.body || total === 0) {
    return Buffer.from(await res.arrayBuffer());
  }

  const chunks: Uint8Array[] = [];
  let downloaded = 0;
  let lastReportedPct = 0;
  const reader = res.body.getReader();

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    downloaded += value.length;
    const pct = Math.round((downloaded / total) * 100);
    if (pct >= lastReportedPct + 2) {
      lastReportedPct = pct;
      onProgress(pct);
    }
  }

  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

async function fetchFromYouTube(
  youtubeUrl: string,
  onProgress: (pct: number) => void
): Promise<Buffer> {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "compile-sync-"));

  try {
    const outputTemplate = path.join(tmpDir, "%(id)s.%(ext)s");

    await new Promise<void>((resolve, reject) => {
      const proc = spawn("yt-dlp", [
        "--no-playlist",
        "-f", "bv[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b",
        "--merge-output-format", "mp4",
        "--no-warnings",
        "--newline", // one progress line per \n — easier to parse than \r
        "-o", outputTemplate,
        youtubeUrl,
      ]);

      let stderr = "";
      let lastReportedPct = 0;

      proc.stdout?.on("data", (d: Buffer) => {
        for (const line of d.toString().split(/[\r\n]+/)) {
          const match = line.match(/\[download\]\s+([\d.]+)%/);
          if (match) {
            const pct = Math.round(parseFloat(match[1]));
            if (pct >= lastReportedPct + 2) {
              lastReportedPct = pct;
              // yt-dlp downloads video then audio separately; scale each
              // half to 0–99 so the bar doesn't reset mid-download.
              // Simple heuristic: just forward the raw pct — the bar may
              // reach ~100 and restart for the audio pass, which is fine.
              onProgress(pct);
            }
          }
        }
      });

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
// Online streaming URL — for the ?mode=online proxy path.
// Storage: the source URL is directly streamable.
// YouTube: resolve a signed CDN URL via yt-dlp --get-url (cached 4 hours).
// ---------------------------------------------------------------------------

const youtubeCdnCache = new Map<string, { url: string; expiresAt: number }>();

export async function getStreamableUrl(syncState: VideoSyncState): Promise<string | null> {
  const { lessonId, videoSource, sourceUrl } = syncState;
  if (!videoSource || !sourceUrl) return null;

  if (videoSource === "storage") {
    return sourceUrl;
  }

  // Check cache first
  const cached = youtubeCdnCache.get(lessonId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  // Resolve a single-file progressive URL (format 18 = 360p MP4, always
  // available as one stream — avoids DASH multi-URL complexity in the proxy).
  return new Promise<string>((resolve, reject) => {
    const proc = spawn("yt-dlp", [
      "--no-playlist",
      "-f", "18/best[ext=mp4]/b[ext=mp4]",
      "--get-url",
      sourceUrl,
    ]);

    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });

    proc.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        reject(new Error("yt-dlp not found. Install it: https://github.com/yt-dlp/yt-dlp#installation"));
      } else {
        reject(err);
      }
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`yt-dlp --get-url failed: ${stderr.slice(-300)}`));
        return;
      }
      const url = stdout.trim().split("\n")[0];
      if (!url) {
        reject(new Error("yt-dlp returned no URL"));
        return;
      }
      youtubeCdnCache.set(lessonId, { url, expiresAt: Date.now() + 4 * 60 * 60 * 1000 });
      resolve(url);
    });
  });
}

// ---------------------------------------------------------------------------
// Background download with retry
// ---------------------------------------------------------------------------

const activeDownloads = new Set<string>();

export async function scheduleDownload(
  lessonId: string,
  sourceInfo: SourceInfo
): Promise<void> {
  if (activeDownloads.has(lessonId)) return;

  const mediaDir = process.env.MEDIA_DIR;
  if (!mediaDir) {
    upsertSyncState(lessonId, sourceInfo.source, sourceInfo.url, "degraded_online_only", {
      errorText: "MEDIA_DIR not configured.",
    });
    return;
  }

  const videoKey = getVideoKey();
  if (!videoKey) {
    upsertSyncState(lessonId, sourceInfo.source, sourceInfo.url, "degraded_online_only", {
      errorText: "Video encryption key not configured. Complete license setup first.",
    });
    return;
  }

  // Claim slot before the setImmediate fires to prevent race conditions on
  // concurrent calls (e.g. two classes releasing the same lesson at once).
  activeDownloads.add(lessonId);

  setImmediate(() => {
    void runDownload(lessonId, sourceInfo, mediaDir, videoKey, 1);
  });
}

async function runDownload(
  lessonId: string,
  sourceInfo: SourceInfo,
  mediaDir: string,
  videoKey: string,
  attempt: number
): Promise<void> {
  // activeDownloads already contains lessonId (added by scheduleDownload or
  // kept between retry attempts — intentionally not removed during backoffs).
  upsertSyncState(lessonId, sourceInfo.source, sourceInfo.url, "downloading", {
    attemptCount: attempt,
  });

  try {
    await mkdir(mediaDir, { recursive: true });

    const onProgress = (pct: number) => writeProgress(lessonId, pct);

    const rawBytes =
      sourceInfo.source === "youtube"
        ? await fetchFromYouTube(sourceInfo.url, onProgress)
        : await fetchFromStorage(sourceInfo.url, onProgress);

    const encrypted = encryptVideo(rawBytes, videoKey);
    const localPath = path.join(mediaDir, `${lessonId}.enc`);
    await writeFile(localPath, encrypted);

    upsertSyncState(lessonId, sourceInfo.source, sourceInfo.url, "ready", { localPath });
    activeDownloads.delete(lessonId);
  } catch (err) {
    const nextAttempt = attempt + 1;

    if (nextAttempt <= 3) {
      // Keep lessonId in activeDownloads during the backoff — prevents any
      // concurrent ensureVideoSynced call from scheduling a duplicate download.
      const delay = attempt === 1 ? 30_000 : 120_000; // 30s, then 2min
      setTimeout(() => {
        void runDownload(lessonId, sourceInfo, mediaDir, videoKey, nextAttempt);
      }, delay);
    } else {
      // All 3 attempts exhausted — degrade gracefully.
      activeDownloads.delete(lessonId);
      upsertSyncState(lessonId, sourceInfo.source, sourceInfo.url, "degraded_online_only", {
        errorText: String(err),
      });
      // Silent 15-min background retry cycle — keeps trying without teacher action.
      setTimeout(() => {
        void scheduleDownload(lessonId, sourceInfo);
      }, 15 * 60 * 1000);
    }
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
    // File deleted — fall through to re-download
  }

  // In-flight (downloading or mid-backoff retry)
  if (state?.status === "downloading" || activeDownloads.has(lessonId)) {
    return "downloading";
  }

  // Degraded — 15-min background timer is already running; don't double-schedule
  if (state?.status === "degraded_online_only") {
    return "degraded_online_only";
  }

  if (!sourceInfo) {
    upsertSyncState(lessonId, null, null, "degraded_online_only", {
      errorText:
        "No video source configured. Set SCHOOL_VIDEO_BASE_URL or ensure the lesson has a videoId.",
    });
    return "degraded_online_only";
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

  // Include "error" (legacy rows from old code) and "degraded_online_only"
  // alongside "pending" so they all get a fresh attempt on reconnect.
  const rows = db
    .prepare(
      "SELECT lesson_id, video_source, source_url FROM video_sync WHERE status IN ('pending', 'error', 'degraded_online_only') AND source_url IS NOT NULL"
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
