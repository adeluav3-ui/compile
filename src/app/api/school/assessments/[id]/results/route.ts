import { NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/school-session";
import { db } from "@/db";
import { assessments, assessmentResults, studentClasses, profiles } from "@/db/schema";
import { and, eq } from "drizzle-orm";

// GET — all results for an assessment, with student names and completion status
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSchoolSession();
  if (!session || session.role !== "teacher")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [assessment] = await db.select().from(assessments)
    .where(eq(assessments.id, id)).limit(1);
  if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // All students in the class
  const students = await db
    .select({ profileId: studentClasses.profileId, fullName: profiles.fullName })
    .from(studentClasses)
    .innerJoin(profiles, eq(studentClasses.profileId, profiles.id))
    .where(eq(studentClasses.classId, assessment.classId));

  // Existing results
  const existing = await db.select().from(assessmentResults)
    .where(eq(assessmentResults.assessmentId, id));
  const resultMap = new Map(existing.map((r) => [r.studentId, r]));

  const merged = students.map((s) => {
    const r = resultMap.get(s.profileId);
    return {
      studentId: s.profileId,
      studentName: s.fullName,
      objScore: r?.objScore ?? null,
      objSource: r?.objSource ?? null,
      practicalScore: r?.practicalScore ?? null,
      totalScore: r?.totalScore ?? null,
      finalizedAt: r?.finalizedAt ?? null,
    };
  });

  return NextResponse.json({ results: merged, assessment });
}

// POST — bulk manual score entry (for PDF/CSV delivery)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSchoolSession();
  if (!session || session.role !== "teacher")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { scores } = (await request.json()) as {
    scores: Array<{ studentId: string; objScore: number }>;
  };

  const [assessment] = await db.select().from(assessments)
    .where(and(eq(assessments.id, id), eq(assessments.teacherId, session.profileId)))
    .limit(1);
  if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  for (const { studentId, objScore } of scores) {
    const clamped = Math.min(assessment.objQuestionCount, Math.max(0, Math.round(objScore)));

    const [existing] = await db.select({ id: assessmentResults.id, practicalScore: assessmentResults.practicalScore })
      .from(assessmentResults)
      .where(and(eq(assessmentResults.assessmentId, id), eq(assessmentResults.studentId, studentId)))
      .limit(1);

    if (existing) {
      const newPractical = existing.practicalScore;
      const total = computeTotal(clamped, newPractical, assessment.objQuestionCount);
      await db.update(assessmentResults).set({
        objScore: clamped,
        objSource: "manual_entry",
        ...(total !== null && { totalScore: total, finalizedAt: new Date() }),
      }).where(eq(assessmentResults.id, existing.id));
    } else {
      await db.insert(assessmentResults).values({
        assessmentId: id,
        studentId,
        objScore: clamped,
        objSource: "manual_entry",
      });
    }
  }

  return NextResponse.json({ ok: true });
}

function computeTotal(
  objScore: number | null,
  practicalScore: number | null,
  objQuestionCount: number
): number | null {
  if (objScore === null || practicalScore === null) return null;
  return Math.round((objScore / objQuestionCount) * 50 + (practicalScore / 100) * 50);
}
