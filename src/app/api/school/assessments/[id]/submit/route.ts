import { NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/school-session";
import { db } from "@/db";
import {
  assessments, assessmentQuestions, assessmentResults,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";

// POST — student submits OBJ answers for in-platform assessment
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSchoolSession();
  if (!session || session.role !== "student")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { answers } = (await request.json()) as {
    answers: Record<string, number>; // { questionId: selectedOptionIndex }
  };

  const [assessment] = await db.select().from(assessments)
    .where(and(
      eq(assessments.id, id),
      eq(assessments.classId, session.classId!),
    )).limit(1);
  if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (assessment.status !== "finalized" || assessment.deliveryMethod !== "in_platform")
    return NextResponse.json({ error: "Assessment not available." }, { status: 400 });

  // Check not already submitted
  const [existing] = await db.select().from(assessmentResults)
    .where(and(
      eq(assessmentResults.assessmentId, id),
      eq(assessmentResults.studentId, session.profileId),
    )).limit(1);
  if (existing?.objScore !== null && existing?.objScore !== undefined)
    return NextResponse.json({ error: "Already submitted." }, { status: 400 });

  // Score against correct answers
  const questions = await db.select({
    id: assessmentQuestions.id,
    correctOptionIndex: assessmentQuestions.correctOptionIndex,
  }).from(assessmentQuestions).where(eq(assessmentQuestions.assessmentId, id));

  let correct = 0;
  for (const q of questions) {
    if (answers[q.id] === q.correctOptionIndex) correct++;
  }

  const practicalScore = existing?.practicalScore ?? null;
  const total = practicalScore !== null
    ? Math.round((correct / assessment.objQuestionCount) * 50 + (practicalScore / 100) * 50)
    : null;

  if (existing) {
    await db.update(assessmentResults).set({
      objScore: correct,
      objSource: "in_platform",
      ...(total !== null && { totalScore: total, finalizedAt: new Date() }),
    }).where(eq(assessmentResults.id, existing.id));
  } else {
    await db.insert(assessmentResults).values({
      assessmentId: id,
      studentId: session.profileId,
      objScore: correct,
      objSource: "in_platform",
    });
  }

  return NextResponse.json({
    score: correct,
    outOf: assessment.objQuestionCount,
    total,
  });
}
