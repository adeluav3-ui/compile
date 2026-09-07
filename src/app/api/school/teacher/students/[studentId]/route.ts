import { NextRequest, NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/school-session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { db } from "@/db";
import { profiles, userRoles, studentClasses, teacherAssignments } from "@/db/schema";
import { and, eq } from "drizzle-orm";

// DELETE /api/school/teacher/students/[studentId]
// ?classId=xxx              → remove student from that class only
// ?classId=xxx&deleteAccount=true → remove from all classes and delete the account
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const session = await getSchoolSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { studentId } = await params;
  const classId = req.nextUrl.searchParams.get("classId") ?? "";
  const deleteAccount = req.nextUrl.searchParams.get("deleteAccount") === "true";

  if (!classId) {
    return NextResponse.json({ error: "classId is required." }, { status: 400 });
  }

  // Verify this teacher is assigned to the class the student is being removed from
  const [assignment] = await db
    .select({ id: teacherAssignments.id })
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

  // Verify the student is actually enrolled in this class
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

  try {
    if (deleteAccount) {
      // Remove from all classes, then delete the account entirely
      await db.delete(studentClasses).where(eq(studentClasses.profileId, studentId));
      await db.delete(userRoles).where(and(
        eq(userRoles.profileId, studentId),
        eq(userRoles.role, "student"),
      ));
      try {
        await supabaseAdmin.auth.admin.deleteUser(studentId);
        await db.delete(profiles).where(eq(profiles.id, studentId));
      } catch {
        // Profile may have FK-constrained data; account is already inaccessible
        // since all roles and class memberships are removed above.
      }
    } else {
      // Remove from this class only — account and other enrollments untouched
      await db.delete(studentClasses).where(
        and(
          eq(studentClasses.profileId, studentId),
          eq(studentClasses.classId, classId)
        )
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to remove student.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
