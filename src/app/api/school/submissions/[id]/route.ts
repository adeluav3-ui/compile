import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { submissions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSchoolSession } from "@/lib/school-session";

// PATCH — teacher confirms or adjusts grade
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSchoolSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const { teacherScore } = await req.json().catch(() => ({}));
  if (typeof teacherScore !== "number" || teacherScore < 0 || teacherScore > 100) {
    return NextResponse.json({ error: "teacherScore must be 0–100." }, { status: 400 });
  }

  const [updated] = await db
    .update(submissions)
    .set({
      teacherScore,
      teacherId: session.profileId,
      teacherReviewedAt: new Date(),
      status: "teacher_confirmed",
    })
    .where(eq(submissions.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Submission not found." }, { status: 404 });

  return NextResponse.json(updated);
}

// GET — fetch a single submission
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSchoolSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const [row] = await db.select().from(submissions).where(eq(submissions.id, id));
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json(row);
}
