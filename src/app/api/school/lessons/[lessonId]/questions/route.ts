import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { lessonQuestions, aiQueue } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { getSchoolSession } from "@/lib/school-session";
import { answerLessonQuestion } from "@/lib/ai";
import { lessons } from "@/db/schema";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const session = await getSchoolSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { lessonId } = await params;
  const classId = req.nextUrl.searchParams.get("classId") ?? session.classId;
  if (!classId) return NextResponse.json({ error: "classId required." }, { status: 400 });

  const questions = await db
    .select()
    .from(lessonQuestions)
    .where(and(eq(lessonQuestions.lessonId, lessonId), eq(lessonQuestions.classId, classId)))
    .orderBy(asc(lessonQuestions.createdAt));

  return NextResponse.json(questions);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const session = await getSchoolSession();
  if (!session || session.role !== "student") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { lessonId } = await params;
  const { questionText } = await req.json().catch(() => ({}));
  if (!questionText?.trim()) {
    return NextResponse.json({ error: "Question text required." }, { status: 400 });
  }

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId));

  const [row] = await db
    .insert(lessonQuestions)
    .values({
      lessonId,
      classId: session.classId!,
      studentId: session.profileId,
      questionText: questionText.trim(),
      status: "queued",
    })
    .returning();

  // Try AI answer immediately; if it fails (offline), queue it
  try {
    const aiAnswer = await answerLessonQuestion(lesson?.title ?? lessonId, questionText.trim());
    const [updated] = await db
      .update(lessonQuestions)
      .set({ aiAnswer, aiAnsweredAt: new Date(), status: "ai_answered" })
      .where(eq(lessonQuestions.id, row.id))
      .returning();
    return NextResponse.json(updated, { status: 201 });
  } catch {
    // Offline or API unavailable — queue for later
    await db.insert(aiQueue).values({ type: "qa", payload: { questionId: row.id } });
    return NextResponse.json(row, { status: 201 });
  }
}
