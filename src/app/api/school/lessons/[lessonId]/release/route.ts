import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { lessonReleases, lessons } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getSchoolSession } from "@/lib/school-session";
import { ensureVideoSynced, getVideoSyncState } from "@/lib/video-sync";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const session = await getSchoolSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { lessonId } = await params;
  const { classId } = await req.json().catch(() => ({}));
  if (!classId) return NextResponse.json({ error: "classId required." }, { status: 400 });

  // Toggle: if already released, remove; otherwise insert
  const [existing] = await db
    .select()
    .from(lessonReleases)
    .where(and(eq(lessonReleases.lessonId, lessonId), eq(lessonReleases.classId, classId)));

  if (existing) {
    await db
      .delete(lessonReleases)
      .where(and(eq(lessonReleases.lessonId, lessonId), eq(lessonReleases.classId, classId)));
    return NextResponse.json({ released: false });
  }

  // Create the release record immediately — this always succeeds even offline
  await db.insert(lessonReleases).values({
    lessonId,
    classId,
    releasedBy: session.profileId,
  });

  // Determine if this lesson has a local video that needs syncing.
  // Only School Edition (LOCAL_DB_PATH set) downloads videos locally.
  // YouTube lessons are streamed online; no local copy needed.
  let videoStatus: string | null = null;

  if (process.env.LOCAL_DB_PATH) {
    const [lesson] = await db.select({ videoProvider: lessons.videoProvider }).from(lessons).where(eq(lessons.id, lessonId));

    // YouTube lessons stream directly — no local sync required
    if (!lesson || lesson.videoProvider === "youtube") {
      videoStatus = "ready";
    } else {
      // For all other lesson types (local video or VdoCipher replacement),
      // ensure the file is synced to the local media store.
      videoStatus = await ensureVideoSynced(lessonId);
    }
  }

  return NextResponse.json({
    released: true,
    videoStatus,
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const session = await getSchoolSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { lessonId } = await params;

  const state = getVideoSyncState(lessonId);
  return NextResponse.json({
    lessonId,
    videoStatus: state?.status ?? null,
    localPath: state?.localPath ?? null,
    errorText: state?.errorText ?? null,
  });
}
