import { NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/school-session";
import { db } from "@/db";
import {
  assessments, assessmentQuestions, lessons, lessonReleases,
} from "@/db/schema";
import { and, eq, gte, lte, inArray, asc } from "drizzle-orm";
import { generateAssessmentQuestions } from "@/lib/ai";

// GET — list assessments for the teacher's class
export async function GET() {
  const session = await getSchoolSession();
  if (!session || session.role !== "teacher")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(assessments)
    .where(eq(assessments.classId, session.classId!))
    .orderBy(assessments.createdAt);

  return NextResponse.json({ assessments: rows });
}

// POST — create assessment + generate questions
export async function POST(request: Request) {
  const session = await getSchoolSession();
  if (!session || session.role !== "teacher")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, lessonRangeStartId, lessonRangeEndId } = (await request.json()) as {
    type: "midterm" | "exam";
    lessonRangeStartId: string;
    lessonRangeEndId: string;
  };

  if (!type || !lessonRangeStartId || !lessonRangeEndId)
    return NextResponse.json({ error: "type, lessonRangeStartId, and lessonRangeEndId are required." }, { status: 400 });

  const objQuestionCount = type === "midterm" ? 20 : 30;
  const classId = session.classId!;

  // Fetch start and end lessons to get their order values
  const [startLesson] = await db.select({ order: lessons.order }).from(lessons)
    .where(eq(lessons.id, lessonRangeStartId)).limit(1);
  const [endLesson] = await db.select({ order: lessons.order }).from(lessons)
    .where(eq(lessons.id, lessonRangeEndId)).limit(1);

  if (!startLesson || !endLesson)
    return NextResponse.json({ error: "Invalid lesson range." }, { status: 400 });
  if (startLesson.order > endLesson.order)
    return NextResponse.json({ error: "Start lesson must come before end lesson." }, { status: 400 });

  // Get all released lesson IDs for this class
  const released = await db.select({ lessonId: lessonReleases.lessonId })
    .from(lessonReleases).where(eq(lessonReleases.classId, classId));
  const releasedIds = new Set(released.map((r) => r.lessonId));

  // Get lessons in the range (by order)
  const rangeLessons = await db.select({
    id: lessons.id, order: lessons.order, title: lessons.title, notes: lessons.notes,
  }).from(lessons)
    .where(and(gte(lessons.order, startLesson.order), lte(lessons.order, endLesson.order)))
    .orderBy(asc(lessons.order));

  // Validate all are released
  const unreleasedInRange = rangeLessons.filter((l) => !releasedIds.has(l.id));
  if (unreleasedInRange.length > 0) {
    return NextResponse.json({
      error: `Lesson(s) not yet released to this class: ${unreleasedInRange.map((l) => l.title).join(", ")}`,
    }, { status: 400 });
  }

  // Validate notes content exists
  const lessonsWithoutNotes = rangeLessons.filter((l) => !l.notes || l.notes.trim().length < 50);
  if (lessonsWithoutNotes.length > 0) {
    return NextResponse.json({
      error: `These lessons don't have enough notes content for question generation: ${lessonsWithoutNotes.map((l) => l.title).join(", ")}`,
    }, { status: 400 });
  }

  // Create assessment record (status: draft)
  const [assessment] = await db.insert(assessments).values({
    classId,
    teacherId: session.profileId,
    type,
    objQuestionCount,
    lessonRangeStartId,
    lessonRangeEndId,
    status: "draft",
  }).returning();

  // Generate via AI
  let generated;
  try {
    generated = await generateAssessmentQuestions(rangeLessons, objQuestionCount, type);
  } catch (err) {
    // Roll back assessment record and surface error
    await db.delete(assessments).where(eq(assessments.id, assessment.id));
    const msg = err instanceof Error ? err.message : "AI generation failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Save questions
  if (generated.questions.length > 0) {
    await db.insert(assessmentQuestions).values(
      generated.questions.map((q, i) => ({
        assessmentId: assessment.id,
        questionText: q.questionText,
        options: q.options,
        correctOptionIndex: q.correctOptionIndex,
        sourceLessonId: q.sourceLessonId || null,
        orderIndex: i + 1,
        aiGenerated: true,
        editedByTeacher: false,
      }))
    );
  }

  // Update status + practical prompt
  await db.update(assessments).set({
    status: "questions_generated",
    practicalPrompt: generated.practicalPrompt,
  }).where(eq(assessments.id, assessment.id));

  return NextResponse.json({ assessmentId: assessment.id });
}
