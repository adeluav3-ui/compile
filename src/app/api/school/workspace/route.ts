import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workspaceSaves } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getSchoolSession } from "@/lib/school-session";

// GET — load last saved code for a lesson
export async function GET(req: NextRequest) {
  const session = await getSchoolSession();
  if (!session || session.role !== "student") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const lessonId = req.nextUrl.searchParams.get("lessonId");
  if (!lessonId) return NextResponse.json({ error: "lessonId required." }, { status: 400 });

  const [row] = await db
    .select()
    .from(workspaceSaves)
    .where(and(eq(workspaceSaves.studentId, session.profileId), eq(workspaceSaves.lessonId, lessonId)));

  return NextResponse.json({ code: row?.code ?? null });
}

// POST — upsert draft code
export async function POST(req: NextRequest) {
  const session = await getSchoolSession();
  if (!session || session.role !== "student") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { lessonId, code } = await req.json().catch(() => ({}));
  if (!lessonId || typeof code !== "string") {
    return NextResponse.json({ error: "lessonId and code required." }, { status: 400 });
  }

  await db
    .insert(workspaceSaves)
    .values({ studentId: session.profileId, lessonId, code })
    .onConflictDoUpdate({
      target: [workspaceSaves.studentId, workspaceSaves.lessonId],
      set: { code, savedAt: new Date() },
    });

  return NextResponse.json({ ok: true });
}
