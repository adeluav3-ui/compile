import { NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/school-session";
import { db } from "@/db";
import { assessments, assessmentResults, submissions } from "@/db/schema";
import { and, eq } from "drizzle-orm";

// POST — student submits practical code for an in-platform assessment
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSchoolSession();
  if (!session || session.role !== "student")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { content } = (await request.json()) as { content: string };

  if (!content?.trim())
    return NextResponse.json({ error: "No code submitted." }, { status: 400 });

  const [assessment] = await db.select().from(assessments)
    .where(and(
      eq(assessments.id, id),
      eq(assessments.classId, session.classId!),
    )).limit(1);
  if (!assessment) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!assessment.practicalPrompt)
    return NextResponse.json({ error: "No practical for this assessment." }, { status: 400 });

  // Must have submitted OBJ first
  const [result] = await db.select().from(assessmentResults)
    .where(and(
      eq(assessmentResults.assessmentId, id),
      eq(assessmentResults.studentId, session.profileId),
    )).limit(1);
  if (!result || result.objScore === null)
    return NextResponse.json({ error: "Submit OBJ answers first." }, { status: 400 });
  if (result.practicalSubmissionId)
    return NextResponse.json({ error: "Practical already submitted." }, { status: 400 });

  // Create submission record (type: practical, no AI grading — teacher grades)
  const [submission] = await db.insert(submissions).values({
    studentId: session.profileId,
    classId: session.classId!,
    assessmentId: id,
    type: "practical",
    content,
    status: "submitted",
  }).returning({ id: submissions.id });

  // Link to assessment result
  await db.update(assessmentResults)
    .set({ practicalSubmissionId: submission.id })
    .where(eq(assessmentResults.id, result.id));

  return NextResponse.json({ ok: true });
}
