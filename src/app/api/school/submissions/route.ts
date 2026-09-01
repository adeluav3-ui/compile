import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { submissions, aiQueue, lessons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSchoolSession } from "@/lib/school-session";
import { gradeSubmission } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await getSchoolSession();
  if (!session || session.role !== "student") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.content || !body?.lessonId) {
    return NextResponse.json({ error: "content and lessonId are required." }, { status: 400 });
  }

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, body.lessonId));

  const [row] = await db
    .insert(submissions)
    .values({
      studentId: session.profileId,
      classId: session.classId!,
      lessonId: body.lessonId ?? null,
      type: body.type ?? "class_activity",
      content: body.content,
      status: "submitted",
    })
    .returning();

  // Try AI grading immediately; if it fails (offline), queue it
  try {
    const rubric = lesson?.gradingRubric ?? "Grade the HTML/CSS/JS code for correctness, structure, and adherence to the task. Award up to 100 points.";
    const { score, feedback } = await gradeSubmission(lesson?.title ?? "Web lesson", rubric, body.content);

    const [graded] = await db
      .update(submissions)
      .set({ aiScore: score, aiFeedback: feedback, aiGradedAt: new Date(), status: "ai_graded" })
      .where(eq(submissions.id, row.id))
      .returning();

    return NextResponse.json(graded, { status: 201 });
  } catch {
    await db.insert(aiQueue).values({ type: "grade", payload: { submissionId: row.id } });
    return NextResponse.json(row, { status: 201 });
  }
}
