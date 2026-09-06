import { NextRequest, NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/school-session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { db } from "@/db";
import { profiles, userRoles, teacherAssignments } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  const session = await getSchoolSession();
  if (!session || session.role !== "school_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teacherId } = await params;

  // Verify the teacher actually belongs to this school
  const assignments = await db
    .select({ id: teacherAssignments.id })
    .from(teacherAssignments)
    .where(
      and(
        eq(teacherAssignments.profileId, teacherId),
        eq(teacherAssignments.schoolId, session.schoolId)
      )
    );

  if (assignments.length === 0) {
    return NextResponse.json({ error: "Teacher not found in your school." }, { status: 404 });
  }

  try {
    // Remove class assignments for this school
    await db
      .delete(teacherAssignments)
      .where(
        and(
          eq(teacherAssignments.profileId, teacherId),
          eq(teacherAssignments.schoolId, session.schoolId)
        )
      );

    // Remove teacher role
    await db
      .delete(userRoles)
      .where(
        and(
          eq(userRoles.profileId, teacherId),
          eq(userRoles.role, "teacher")
        )
      );

    // Best-effort: delete the Supabase auth account and profile.
    // If FK constraints block profile deletion (e.g. the teacher has created
    // assessments), we skip it — the teacher has already lost all school access
    // above, which is the core requirement.
    try {
      await supabaseAdmin.auth.admin.deleteUser(teacherId);
      await db.delete(profiles).where(eq(profiles.id, teacherId));
    } catch {
      // Leave profile intact if data constraints prevent deletion.
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to remove teacher.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
