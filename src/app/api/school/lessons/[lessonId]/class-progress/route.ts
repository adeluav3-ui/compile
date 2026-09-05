/**
 * GET  /api/school/lessons/[lessonId]/class-progress?classId=...
 * POST /api/school/lessons/[lessonId]/class-progress
 *
 * Stores and retrieves the "Play for Class" playback position — one row per
 * (lesson_id, class_id). Scoped to the class, not to any individual student
 * or to the teacher personally.
 *
 * In offline School Edition builds (LOCAL_DB_PATH set) the row lives in
 * SQLite so saves work without internet. In cloud builds it uses Postgres.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/school-session";
import { getLocalDb } from "@/db/local";
import { db } from "@/db";
import { classLessonProgress } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const session = await getSchoolSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { lessonId } = await params;
  const classId = req.nextUrl.searchParams.get("classId");
  if (!classId) {
    return NextResponse.json({ error: "classId required." }, { status: 400 });
  }

  if (process.env.LOCAL_DB_PATH) {
    const localDb = getLocalDb();
    if (!localDb) return NextResponse.json({ lastPositionSeconds: 0 });

    const row = localDb
      .prepare(
        "SELECT last_position_seconds FROM class_lesson_progress WHERE lesson_id = ? AND class_id = ?"
      )
      .get(lessonId, classId) as { last_position_seconds: number } | undefined;

    return NextResponse.json({ lastPositionSeconds: row?.last_position_seconds ?? 0 });
  }

  const [row] = await db
    .select({ lastPositionSeconds: classLessonProgress.lastPositionSeconds })
    .from(classLessonProgress)
    .where(
      and(
        eq(classLessonProgress.lessonId, lessonId),
        eq(classLessonProgress.classId, classId)
      )
    );

  return NextResponse.json({ lastPositionSeconds: row?.lastPositionSeconds ?? 0 });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const session = await getSchoolSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { lessonId } = await params;
  const body = await req.json().catch(() => ({}));
  const { classId, lastPositionSeconds } = body as {
    classId?: string;
    lastPositionSeconds?: number;
  };

  if (!classId || typeof lastPositionSeconds !== "number") {
    return NextResponse.json(
      { error: "classId and lastPositionSeconds required." },
      { status: 400 }
    );
  }

  const position = Math.max(0, Math.floor(lastPositionSeconds));

  if (process.env.LOCAL_DB_PATH) {
    const localDb = getLocalDb();
    if (localDb) {
      localDb
        .prepare(
          `INSERT INTO class_lesson_progress (lesson_id, class_id, last_position_seconds, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(lesson_id, class_id) DO UPDATE SET
             last_position_seconds = excluded.last_position_seconds,
             updated_at            = excluded.updated_at`
        )
        .run(lessonId, classId, position, Date.now());
    }
    return NextResponse.json({ ok: true });
  }

  await db
    .insert(classLessonProgress)
    .values({ lessonId, classId, lastPositionSeconds: position })
    .onConflictDoUpdate({
      target: [classLessonProgress.lessonId, classLessonProgress.classId],
      set: { lastPositionSeconds: position, updatedAt: new Date() },
    });

  return NextResponse.json({ ok: true });
}
