import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workspaceSaves } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getSchoolSession } from "@/lib/school-session";

type WorkspaceFile = { name: string; content: string };

// GET — load saved files for a lesson
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

  return NextResponse.json({ files: row?.files ?? null });
}

// POST — upsert draft files
export async function POST(req: NextRequest) {
  const session = await getSchoolSession();
  if (!session || session.role !== "student") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { lessonId, files } = body as { lessonId?: string; files?: WorkspaceFile[] };

  if (!lessonId || !Array.isArray(files)) {
    return NextResponse.json({ error: "lessonId and files required." }, { status: 400 });
  }

  await db
    .insert(workspaceSaves)
    .values({ studentId: session.profileId, lessonId, files })
    .onConflictDoUpdate({
      target: [workspaceSaves.studentId, workspaceSaves.lessonId],
      set: { files, savedAt: new Date() },
    });

  return NextResponse.json({ ok: true });
}
