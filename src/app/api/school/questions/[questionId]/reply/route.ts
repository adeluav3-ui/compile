import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { lessonQuestions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSchoolSession } from "@/lib/school-session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const session = await getSchoolSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { questionId } = await params;
  const { teacherResponse } = await req.json().catch(() => ({}));
  if (!teacherResponse?.trim()) {
    return NextResponse.json({ error: "Reply text required." }, { status: 400 });
  }

  const [updated] = await db
    .update(lessonQuestions)
    .set({
      teacherResponse: teacherResponse.trim(),
      teacherId: session.profileId,
      teacherRepliedAt: new Date(),
      status: "teacher_replied",
    })
    .where(eq(lessonQuestions.id, questionId))
    .returning();

  if (!updated) return NextResponse.json({ error: "Question not found." }, { status: 404 });

  return NextResponse.json(updated);
}
