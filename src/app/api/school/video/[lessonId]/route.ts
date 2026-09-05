/**
 * GET /api/school/video/[lessonId]
 *
 * Gated decrypt-and-stream endpoint for School Edition local videos.
 * Identical gate for ALL lessons regardless of original source (YouTube or
 * Supabase Storage) — source type is irrelevant by the time we get here.
 *
 * Gate order (matches the spec):
 *   1. Local session check   — valid school session required
 *   2. Subscription check    — handled by middleware before this route is hit
 *   3. lesson_releases check — lesson must be released to the student's class
 *   4. Decrypt in memory     — encrypted file read, decrypted, never written to disk
 *   5. Stream                — range-aware response so the video element can seek
 *
 * Teachers and admins bypass the lesson_releases check so they can preview
 * any lesson on their class's level.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/school-session";
import { db } from "@/db";
import { lessonReleases } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getVideoSyncState } from "@/lib/video-sync";
import { decryptVideo } from "@/lib/video-crypto";
import { getLocalDb } from "@/db/local";
import { readFile } from "fs/promises";

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

  // ── 4. Video availability check ────────────────────────────────────────────
  const syncState = getVideoSyncState(lessonId);
  if (!syncState || syncState.status !== "ready" || !syncState.localPath) {
    return new NextResponse(
      syncState?.status === "downloading"
        ? "Video is still downloading."
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
