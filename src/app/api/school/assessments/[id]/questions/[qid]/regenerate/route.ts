import { NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/school-session";
import { db } from "@/db";
import { assessmentQuestions, assessments, lessons } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { regenerateSingleQuestion } from "@/lib/ai";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  const session = await getSchoolSession();
  if (!session || session.role !== "teacher")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: assessmentId, qid } = await params;

  const [assessment] = await db.select().from(assessments)
    .where(eq(assessments.id, assessmentId)).limit(1);
  if (!assessment || assessment.teacherId !== session.profileId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [question] = await db.select().from(assessmentQuestions)
    .where(and(eq(assessmentQuestions.id, qid), eq(assessmentQuestions.assessmentId, assessmentId)))
    .limit(1);
  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  // Get source lesson notes
  const [lesson] = question.sourceLessonId
    ? await db.select({ title: lessons.title, notes: lessons.notes })
        .from(lessons).where(eq(lessons.id, question.sourceLessonId)).limit(1)
    : [null];

  // Get existing questions to avoid duplication
  const allQuestions = await db.select({ questionText: assessmentQuestions.questionText })
    .from(assessmentQuestions).where(eq(assessmentQuestions.assessmentId, assessmentId));

  const regen = await regenerateSingleQuestion(
    lesson?.title ?? "Web Development",
    lesson?.notes ?? null,
    allQuestions.map((q) => q.questionText),
  );

  await db.update(assessmentQuestions).set({
    questionText: regen.questionText,
    options: regen.options,
    correctOptionIndex: regen.correctOptionIndex,
    aiGenerated: true,
    editedByTeacher: false,
  }).where(eq(assessmentQuestions.id, qid));

  const [updated] = await db.select().from(assessmentQuestions)
    .where(eq(assessmentQuestions.id, qid)).limit(1);

  return NextResponse.json({ question: updated });
}
