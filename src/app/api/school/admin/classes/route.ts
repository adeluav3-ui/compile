import { NextRequest, NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/school-session";
import { db } from "@/db";
import { classes } from "@/db/schema";

const VALID_LEVELS = ["JSS1", "JSS2", "JSS3", "SSS1", "SSS2", "SSS3"] as const;
type ClassLevel = (typeof VALID_LEVELS)[number];

// POST /api/school/admin/classes — school admin creates a class
export async function POST(req: NextRequest) {
  const session = await getSchoolSession();
  if (!session || session.role !== "school_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name: string = body?.name?.trim() ?? "";
  const level: string = body?.level?.trim() ?? "";
  const academicYear: string = body?.academicYear?.trim() ?? "";

  if (!name) return NextResponse.json({ error: "Class name is required." }, { status: 400 });
  if (!VALID_LEVELS.includes(level as ClassLevel)) {
    return NextResponse.json({ error: "Invalid level." }, { status: 400 });
  }
  if (!academicYear || !/^\d{4}\/\d{4}$/.test(academicYear)) {
    return NextResponse.json(
      { error: "Academic year must be in the format 2025/2026." },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(classes)
    .values({ schoolId: session.schoolId, name, level: level as ClassLevel, academicYear })
    .returning({ id: classes.id, name: classes.name });

  return NextResponse.json({ ok: true, class: created });
}
