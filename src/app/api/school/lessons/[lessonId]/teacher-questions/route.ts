import { NextRequest, NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/school-session";
import { db } from "@/db";
import { teacherQuestions, lessons } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { answerTeacherQuestion } from "@/lib/ai";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const session = await getSchoolSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { lessonId } = await params;

  const questions = await db
    .select()
    .from(teacherQuestions)
    .where(
      and(
        eq(teacherQuestions.lessonId, lessonId),
        eq(teacherQuestions.teacherId, session.profileId)
      )
    )
    .orderBy(asc(teacherQuestions.createdAt));

  return NextResponse.json({ questions });
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
  const body = await req.json().catch(() => null);
  const questionText = typeof body?.questionText === "string" ? body.questionText.trim() : "";

  if (!questionText) {
    return NextResponse.json({ error: "Question is required." }, { status: 400 });
  }

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId));
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
  }

  const aiAnswer = await answerTeacherQuestion(lesson.title, lesson.description ?? null, questionText);

  const [question] = await db
    .insert(teacherQuestions)
    .values({
      lessonId,
      teacherId: session.profileId,
      schoolId: session.schoolId,
      questionText,
      aiAnswer,
    })
    .returning();

  return NextResponse.json({ question });
}
