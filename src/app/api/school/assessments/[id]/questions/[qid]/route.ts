import { NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/school-session";
import { db } from "@/db";
import { assessmentQuestions, assessments } from "@/db/schema";
import { and, eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string; qid: string }> };

// PUT — edit a question (sets editedByTeacher = true)
export async function PUT(request: Request, { params }: Params) {
  const session = await getSchoolSession();
  if (!session || session.role !== "teacher")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: assessmentId, qid } = await params;

  const [assessment] = await db.select({ teacherId: assessments.teacherId })
    .from(assessments).where(eq(assessments.id, assessmentId)).limit(1);
  if (!assessment || assessment.teacherId !== session.profileId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json()) as {
    questionText?: string;
    options?: string[];
    correctOptionIndex?: number;
  };

  await db.update(assessmentQuestions)
    .set({
      ...(body.questionText !== undefined && { questionText: body.questionText }),
      ...(body.options !== undefined && { options: body.options }),
      ...(body.correctOptionIndex !== undefined && { correctOptionIndex: body.correctOptionIndex }),
      editedByTeacher: true,
    })
    .where(and(eq(assessmentQuestions.id, qid), eq(assessmentQuestions.assessmentId, assessmentId)));

  return NextResponse.json({ ok: true });
}

// DELETE — remove a question
export async function DELETE(_req: Request, { params }: Params) {
  const session = await getSchoolSession();
  if (!session || session.role !== "teacher")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: assessmentId, qid } = await params;

  const [assessment] = await db.select({ teacherId: assessments.teacherId })
    .from(assessments).where(eq(assessments.id, assessmentId)).limit(1);
  if (!assessment || assessment.teacherId !== session.profileId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(assessmentQuestions)
    .where(and(eq(assessmentQuestions.id, qid), eq(assessmentQuestions.assessmentId, assessmentId)));

  return NextResponse.json({ ok: true });
}
