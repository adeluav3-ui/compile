import { NextRequest, NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/school-session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { db } from "@/db";
import { profiles, studentClasses, teacherAssignments } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { cacheLocalCredential } from "@/lib/local-auth";
import { randomBytes } from "crypto";

// POST /api/school/teacher/students/[studentId]/reset-password
// Body: { classId: string }
// Returns: { password: string }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const session = await getSchoolSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { studentId } = await params;
  const body = await req.json().catch(() => null);
  const classId: string = body?.classId ?? "";

  if (!classId) {
    return NextResponse.json({ error: "classId is required." }, { status: 400 });
  }

  // Verify teacher is assigned to this class
  const [assignment] = await db
    .select({ schoolId: teacherAssignments.schoolId })
    .from(teacherAssignments)
    .where(
      and(
        eq(teacherAssignments.profileId, session.profileId),
        eq(teacherAssignments.classId, classId)
      )
    )
    .limit(1);

  if (!assignment) {
    return NextResponse.json({ error: "Class not assigned to your account." }, { status: 403 });
  }

  // Verify the student is in this class
  const [enrollment] = await db
    .select({ id: studentClasses.id })
    .from(studentClasses)
    .where(
      and(
        eq(studentClasses.profileId, studentId),
        eq(studentClasses.classId, classId)
      )
    )
    .limit(1);

  if (!enrollment) {
    return NextResponse.json({ error: "Student not found in this class." }, { status: 404 });
  }

  // Fetch student profile for local auth cache update
  const [student] = await db
    .select({ email: profiles.email, username: profiles.username, fullName: profiles.fullName })
    .from(profiles)
    .where(eq(profiles.id, studentId))
    .limit(1);

  if (!student) {
    return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
  }

  const newPassword = randomBytes(6).toString("hex");

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(studentId, {
    password: newPassword,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  // Store plain-text password so teachers can view credentials without needing to reset
  await db.update(profiles)
    .set({ storedPassword: newPassword })
    .where(eq(profiles.id, studentId));

  // Keep local offline cache in sync
  if (process.env.LOCAL_DB_PATH) {
    await cacheLocalCredential(
      studentId,
      student.email,
      newPassword,
      {
        role: "student",
        schoolId: assignment.schoolId,
        classId,
        name: student.fullName ?? student.username ?? "",
      },
      student.username ?? undefined
    ).catch(() => {});
  }

  return NextResponse.json({ ok: true, password: newPassword });
}
