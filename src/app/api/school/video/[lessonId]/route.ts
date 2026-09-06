/**
 * GET /api/school/video/[lessonId]
 * GET /api/school/video/[lessonId]?mode=online
 *
 * Gated video endpoint for School Edition local videos.
 *
 * Default mode (no query param):
 *   Decrypt-and-stream from the locally encrypted file. Requires the file to
 *   be in "ready" state. Range-aware so the video element can seek.
 *
 * Online mode (?mode=online):
 *   Live-proxy from the original source (YouTube CDN or storage URL) without
 *   writing anything to disk. Used while a download is still processing or
 *   has degraded. Requires the host machine to have internet access.
 *   The raw source URL is NEVER returned to the browser — all traffic flows
 *   through this route.
 *
 * Gate order (identical for both modes):
 *   1. Local session check   — valid school session required
 *   2. Subscription check    — handled by middleware before this route is hit
 *   3. lesson_releases check — lesson must be released to the student's class
 *   4. Mode-specific logic   — decrypt+stream OR connectivity check + proxy
 *
 * Teachers and admins bypass the lesson_releases check so they can preview
 * any lesson on their class's level.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/school-session";
import { db } from "@/db";
import { lessonReleases, lessons } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getVideoSyncState, isOnline, getStreamableUrl, deriveSourceInfo } from "@/lib/video-sync";
import { decryptVideo } from "@/lib/video-crypto";
import { getLocalDb } from "@/db/local";
import { readFile } from "fs/promises";
import { isOnlineDelivery } from "@/lib/delivery-mode";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  // ── 1. Session check ───────────────────────────────────────────────────────
  const session = await getSchoolSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { lessonId } = await params;

  // ── 2. Subscription ────────────────────────────────────────────────────────
  // Middleware has already blocked expired subscriptions before this route is
  // reached. No additional check needed here.

  // ── 3. lesson_releases check (students only) ───────────────────────────────
  if (session.role === "student") {
    const classId = session.classId;
    if (!classId) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    const [release] = await db
      .select({ id: lessonReleases.id })
      .from(lessonReleases)
      .where(
        and(
          eq(lessonReleases.lessonId, lessonId),
          eq(lessonReleases.classId, classId)
        )
      );
    if (!release) {
      return new NextResponse("Not found", { status: 404 });
    }
  }

  const mode = req.nextUrl.searchParams.get("mode");

  // ── Online delivery mode (DELIVERY_MODE=online) ────────────────────────────
  // The full offline pipeline is dormant. Proxy directly from the source.
  // No video_sync, no local file, no encryption involved.
  if (isOnlineDelivery()) {
    const [lesson] = await db
      .select({ videoId: lessons.videoId, videoProvider: lessons.videoProvider })
      .from(lessons)
      .where(eq(lessons.id, lessonId));

    if (!lesson) return new NextResponse("Lesson not found.", { status: 404 });

    const sourceInfo = deriveSourceInfo(lessonId, lesson);
    if (!sourceInfo) {
      return new NextResponse("No video source configured for this lesson.", { status: 404 });
    }

    if (sourceInfo.source === "storage") {
      // Direct proxy — no yt-dlp needed
      const proxyHeaders: Record<string, string> = {};
      const rangeHeader = req.headers.get("range");
      if (rangeHeader) proxyHeaders["Range"] = rangeHeader;

      let upstream: Response;
      try {
        upstream = await fetch(sourceInfo.url, { headers: proxyHeaders });
      } catch {
        return new NextResponse("Failed to fetch video from storage.", { status: 502 });
      }

      const responseHeaders: Record<string, string> = {
        "Content-Type": upstream.headers.get("Content-Type") ?? "video/mp4",
        "Cache-Control": "no-store, no-cache",
      };
      for (const h of ["Content-Range", "Content-Length", "Accept-Ranges"]) {
        const v = upstream.headers.get(h);
        if (v) responseHeaders[h] = v;
      }
      return new NextResponse(upstream.body, { status: upstream.status, headers: responseHeaders });
    }

    // YouTube source — resolve CDN URL via yt-dlp then proxy.
    // PlayForClassPlayer and the student page both use an iframe embed for
    // YouTube in online mode, so this path is not normally reached from the UI.
    // Handled here for completeness and for any direct route access.
    let streamUrl: string;
    try {
      const minimalState = {
        lessonId,
        status: "degraded_online_only" as const,
        videoSource: "youtube" as const,
        sourceUrl: sourceInfo.url,
        localPath: null,
        errorText: null,
        attemptCount: 0,
        progressPct: 0,
        updatedAt: Date.now(),
      };
      const resolved = await getStreamableUrl(minimalState);
      if (!resolved) return new NextResponse("Video source not configured.", { status: 404 });
      streamUrl = resolved;
    } catch (err) {
      if (String(err).includes("yt-dlp not found")) {
        return new NextResponse(
          "YouTube proxy requires yt-dlp. Use the embedded player instead.",
          { status: 503 }
        );
      }
      return new NextResponse("Unable to resolve video stream.", { status: 502 });
    }

    const proxyHeaders: Record<string, string> = {};
    const rangeHeader = req.headers.get("range");
    if (rangeHeader) proxyHeaders["Range"] = rangeHeader;

    let upstream: Response;
    try {
      upstream = await fetch(streamUrl, { headers: proxyHeaders });
    } catch {
      return new NextResponse("Failed to fetch video from source.", { status: 502 });
    }

    const responseHeaders: Record<string, string> = {
      "Content-Type": upstream.headers.get("Content-Type") ?? "video/mp4",
      "Cache-Control": "no-store, no-cache",
    };
    for (const h of ["Content-Range", "Content-Length", "Accept-Ranges"]) {
      const v = upstream.headers.get(h);
      if (v) responseHeaders[h] = v;
    }
    return new NextResponse(upstream.body, { status: upstream.status, headers: responseHeaders });
  }

  // ── Online proxy mode (offline build fallback, ?mode=online) ──────────────
  if (mode === "online") {
    const syncState = getVideoSyncState(lessonId);
    if (!syncState?.sourceUrl) {
      return new NextResponse("Video source not available.", { status: 404 });
    }

    if (!(await isOnline())) {
      return new NextResponse("No internet connection available right now.", {
        status: 503,
      });
    }

    let streamUrl: string;
    try {
      const resolved = await getStreamableUrl(syncState);
      if (!resolved) {
        return new NextResponse("Video source not configured.", { status: 404 });
      }
      streamUrl = resolved;
    } catch {
      return new NextResponse("Unable to resolve video stream.", { status: 502 });
    }

    const proxyHeaders: Record<string, string> = {};
    const rangeHeader = req.headers.get("range");
    if (rangeHeader) proxyHeaders["Range"] = rangeHeader;

    let upstream: Response;
    try {
      upstream = await fetch(streamUrl, { headers: proxyHeaders });
    } catch {
      return new NextResponse("Failed to fetch video from source.", { status: 502 });
    }

    const responseHeaders: Record<string, string> = {
      "Content-Type": upstream.headers.get("Content-Type") ?? "video/mp4",
      "Cache-Control": "no-store, no-cache",
    };
    for (const h of ["Content-Range", "Content-Length", "Accept-Ranges"]) {
      const v = upstream.headers.get(h);
      if (v) responseHeaders[h] = v;
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  }

  // ── Local decrypt-and-stream mode (default) ────────────────────────────────

  // ── 4. Video availability check ────────────────────────────────────────────
  const syncState = getVideoSyncState(lessonId);
  if (!syncState || syncState.status !== "ready" || !syncState.localPath) {
    return new NextResponse(
      syncState?.status === "downloading"
        ? "Video is still processing."
        : syncState?.status === "pending"
          ? "Video is pending download."
          : "Video not available.",
      { status: 404 }
    );
  }

  // ── 5. Get per-school encryption key ──────────────────────────────────────
  const localDb = getLocalDb();
  if (!localDb) {
    return new NextResponse("Server configuration error.", { status: 500 });
  }
  const keyRow = localDb
    .prepare("SELECT value FROM local_auth_config WHERE key = 'video_key'")
    .get() as { value: string } | undefined;

  if (!keyRow) {
    return new NextResponse("Video key not configured.", { status: 500 });
  }

  // ── 6. Decrypt in memory — plaintext bytes never touch disk ───────────────
  let decrypted: Buffer;
  try {
    const encrypted = await readFile(syncState.localPath);
    decrypted = decryptVideo(encrypted, keyRow.value);
  } catch {
    return new NextResponse("Failed to read video.", { status: 500 });
  }

  const totalLength = decrypted.length;

  // ── 7. Range-aware response (required for video seeking) ──────────────────
  // AES-256-CBC requires sequential decryption so the entire file is decrypted
  // upfront; the requested byte range is then sliced from the decrypted buffer.
  const rangeHeader = req.headers.get("range");

  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (!match) {
      return new NextResponse("Invalid Range", { status: 416 });
    }
    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : totalLength - 1;

    if (start > end || end >= totalLength) {
      return new NextResponse("Range Not Satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${totalLength}` },
      });
    }

    const chunk = decrypted.subarray(start, end + 1);
    return new NextResponse(new Uint8Array(chunk), {
      status: 206,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Range": `bytes ${start}-${end}/${totalLength}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunk.length.toString(),
        "Cache-Control": "no-store, no-cache",
      },
    });
  }

  return new NextResponse(new Uint8Array(decrypted), {
    status: 200,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": totalLength.toString(),
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store, no-cache",
    },
  });
}
