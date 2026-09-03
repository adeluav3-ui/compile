import { NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/school-session";
import { db } from "@/db";
import {
  assessments, assessmentQuestions, assessmentResults, lessons,
  profiles, studentClasses,
} from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";

// GET — full assessment detail with questions
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSchoolSession();
  if (!session || !["teacher", "school_admin"].includes(session.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [assessment] = await db.select().from(assessments)
    .where(eq(assessments.id, id)).limit(1);
  if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const questions = await db.select().from(assessmentQuestions)
    .where(eq(assessmentQuestions.assessmentId, id))
    .orderBy(asc(assessmentQuestions.orderIndex));

  const startLesson = await db.select({ title: lessons.title, order: lessons.order })
    .from(lessons).where(eq(lessons.id, assessment.lessonRangeStartId)).limit(1);
  const endLesson = await db.select({ title: lessons.title, order: lessons.order })
    .from(lessons).where(eq(lessons.id, assessment.lessonRangeEndId)).limit(1);

  const results = await db
    .select({
      id: assessmentResults.id,
      studentId: assessmentResults.studentId,
      studentName: profiles.fullName,
      objScore: assessmentResults.objScore,
      objSource: assessmentResults.objSource,
      practicalScore: assessmentResults.practicalScore,
      totalScore: assessmentResults.totalScore,
      finalizedAt: assessmentResults.finalizedAt,
    })
    .from(assessmentResults)
    .innerJoin(profiles, eq(assessmentResults.studentId, profiles.id))
    .where(eq(assessmentResults.assessmentId, id));

  return NextResponse.json({
    assessment,
    questions,
    lessonRange: {
      start: startLesson[0] ?? null,
      end: endLesson[0] ?? null,
    },
    results,
  });
}

// PATCH — update status or delivery method
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSchoolSession();
  if (!session || session.role !== "teacher")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await request.json()) as {
    status?: "reviewed" | "finalized";
    deliveryMethod?: "in_platform" | "export_pdf" | "export_csv";
  };

  const [assessment] = await db.select().from(assessments)
    .where(and(eq(assessments.id, id), eq(assessments.teacherId, session.profileId)))
    .limit(1);
  if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const update: Record<string, unknown> = {};
  if (body.status) update.status = body.status;
  if (body.deliveryMethod) update.deliveryMethod = body.deliveryMethod;

  if (body.status === "finalized") {
    // When finalizing with in_platform delivery, pre-create result rows for all students
    if (body.deliveryMethod === "in_platform" || assessment.deliveryMethod === "in_platform") {
      const students = await db
        .select({ profileId: studentClasses.profileId })
        .from(studentClasses)
        .where(eq(studentClasses.classId, assessment.classId));

      const existingResults = await db
        .select({ studentId: assessmentResults.studentId })
        .from(assessmentResults)
        .where(eq(assessmentResults.assessmentId, id));
      const existingIds = new Set(existingResults.map((r) => r.studentId));

      const newStudents = students.filter((s) => !existingIds.has(s.profileId));
      if (newStudents.length > 0) {
        await db.insert(assessmentResults).values(
          newStudents.map((s) => ({
            assessmentId: id,
            studentId: s.profileId,
          }))
        );
      }
    }
  }

  await db.update(assessments).set(update).where(eq(assessments.id, id));
  return NextResponse.json({ ok: true });
}
