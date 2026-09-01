import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { lessonReleases } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getSchoolSession } from "@/lib/school-session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const session = await getSchoolSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { lessonId } = await params;
  const { classId } = await req.json().catch(() => ({}));
  if (!classId) return NextResponse.json({ error: "classId required." }, { status: 400 });

  // Toggle: if already released, remove; otherwise insert
  const [existing] = await db
    .select()
    .from(lessonReleases)
    .where(and(eq(lessonReleases.lessonId, lessonId), eq(lessonReleases.classId, classId)));

  if (existing) {
    await db
      .delete(lessonReleases)
      .where(and(eq(lessonReleases.lessonId, lessonId), eq(lessonReleases.classId, classId)));
    return NextResponse.json({ released: false });
  }

  await db.insert(lessonReleases).values({
    lessonId,
    classId,
    releasedBy: session.profileId,
  });

  return NextResponse.json({ released: true });
}
