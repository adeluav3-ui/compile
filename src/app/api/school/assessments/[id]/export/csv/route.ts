import { NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/school-session";
import { db } from "@/db";
import { assessments, assessmentQuestions } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSchoolSession();
  if (!session || session.role !== "teacher")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [assessment] = await db.select().from(assessments)
    .where(and(eq(assessments.id, id), eq(assessments.teacherId, session.profileId)))
    .limit(1);
  if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (assessment.status !== "finalized")
    return NextResponse.json({ error: "Assessment must be finalized before export." }, { status: 400 });

  const questions = await db.select().from(assessmentQuestions)
    .where(eq(assessmentQuestions.assessmentId, id))
    .orderBy(asc(assessmentQuestions.orderIndex));

  const header = ["question_number", "question_text", "option_a", "option_b", "option_c", "option_d", "correct_option"].join(",");

  const rows = questions.map((q, i) => {
    const opts = q.options as string[];
    const correctLetter = ["A", "B", "C", "D"][q.correctOptionIndex] ?? "A";
    return [
      i + 1,
      `"${(q.questionText ?? "").replace(/"/g, '""')}"`,
      `"${(opts[0] ?? "").replace(/"/g, '""')}"`,
      `"${(opts[1] ?? "").replace(/"/g, '""')}"`,
      `"${(opts[2] ?? "").replace(/"/g, '""')}"`,
      `"${(opts[3] ?? "").replace(/"/g, '""')}"`,
      correctLetter,
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");
  const typeLabel = assessment.type === "midterm" ? "MidTerm" : "Exam";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="compile-${typeLabel}-${id.slice(0, 8)}.csv"`,
    },
  });
}
