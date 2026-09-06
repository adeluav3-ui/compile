import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { lessonReleases, lessons } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getSchoolSession } from "@/lib/school-session";
import { ensureVideoSynced, getVideoSyncState } from "@/lib/video-sync";
import { isOnlineDelivery } from "@/lib/delivery-mode";

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

  // Toggle
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

  // releasedBy is nullable — demo sessions have no real profile row in the DB.
  const releasedBy = session.isReal || session.isLocal ? session.profileId : null;

  try {
    await db.insert(lessonReleases).values({
      lessonId,
      classId,
      releasedBy,
    });
  } catch (err) {
    console.error("[release] insert failed:", err);
    return NextResponse.json({ error: "Could not release lesson." }, { status: 500 });
  }

  // In offline builds only: ensure the video file is synced locally.
  // Online delivery mode skips this entirely — the lesson is immediately playable.
  let videoStatus: string | null = null;

  if (!isOnlineDelivery() && process.env.LOCAL_DB_PATH) {
    const [lesson] = await db
      .select({ videoId: lessons.videoId, videoProvider: lessons.videoProvider })
      .from(lessons)
      .where(eq(lessons.id, lessonId));

    videoStatus = lesson
      ? await ensureVideoSynced(lessonId, {
          videoId: lesson.videoId,
          videoProvider: lesson.videoProvider,
        })
      : "error";
  }

  return NextResponse.json({ released: true, videoStatus });
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
    videoSource: state?.videoSource ?? null,
    localPath: state?.localPath ?? null,
    errorText: state?.errorText ?? null,
  });
}
