import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { db } from "@/db";
import {
  profiles,
  schools,
  classes,
  studentClasses,
  teacherAssignments,
  submissions,
  lessonReleases,
  userRoles,
} from "@/db/schema";
import { eq, count, avg } from "drizzle-orm";

const SUPER_ADMIN_EMAIL = "adeluav3@gmail.com";

async function assertSuperAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== SUPER_ADMIN_EMAIL) throw new Error("Unauthorized");
}

// GET /api/admin/schools/[id] — school detail + stats
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await assertSuperAdmin();
    const { id } = await params;

    const [school] = await db
      .select({
        id: schools.id,
        name: schools.name,
        state: schools.state,
        subscriptionStatus: schools.subscriptionStatus,
        subscriptionExpiresAt: schools.subscriptionExpiresAt,
        licenseKey: schools.licenseKey,
        adminId: schools.adminId,
        adminEmail: profiles.email,
        adminName: profiles.fullName,
        createdAt: schools.createdAt,
      })
      .from(schools)
      .leftJoin(profiles, eq(schools.adminId, profiles.id))
      .where(eq(schools.id, id))
      .limit(1);

    if (!school) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Classes
    const schoolClasses = await db
      .select({ id: classes.id, name: classes.name, level: classes.level })
      .from(classes)
      .where(eq(classes.schoolId, id));

    const classIds = schoolClasses.map((c) => c.id);

    // Student count (unique students across all classes)
    const [{ studentCount }] = await db
      .select({ studentCount: count() })
      .from(studentClasses)
      .where(
        classIds.length > 0
          ? eq(studentClasses.classId, classIds[0]) // simplified — works for single class schools
          : eq(studentClasses.classId, "none")
      );

    // For multi-class: count via join
    const studentCountFull = await db
      .selectDistinct({ profileId: studentClasses.profileId })
      .from(studentClasses)
      .innerJoin(classes, eq(studentClasses.classId, classes.id))
      .where(eq(classes.schoolId, id));

    // Teacher count
    const teacherCountFull = await db
      .selectDistinct({ profileId: teacherAssignments.profileId })
      .from(teacherAssignments)
      .where(eq(teacherAssignments.schoolId, id));

    // Lessons released
    const [{ releasedCount }] = await db
      .select({ releasedCount: count() })
      .from(lessonReleases)
      .where(
        classIds.length > 0
          ? eq(lessonReleases.classId, classIds[0])
          : eq(lessonReleases.classId, "none")
      );

    // Submissions — join through classes to filter by school
    const [{ submissionCount }] = await db
      .select({ submissionCount: count() })
      .from(submissions)
      .innerJoin(classes, eq(submissions.classId, classes.id))
      .where(eq(classes.schoolId, id));

    const [{ avgScore }] = await db
      .select({ avgScore: avg(submissions.aiScore) })
      .from(submissions)
      .innerJoin(classes, eq(submissions.classId, classes.id))
      .where(eq(classes.schoolId, id));

    // Teachers list with auth details
    const teacherProfiles = await db
      .select({
        id: profiles.id,
        fullName: profiles.fullName,
        email: profiles.email,
      })
      .from(teacherAssignments)
      .innerJoin(profiles, eq(teacherAssignments.profileId, profiles.id))
      .where(eq(teacherAssignments.schoolId, id));

    void studentCount;

    return NextResponse.json({
      school,
      classes: schoolClasses,
      stats: {
        students: studentCountFull.length,
        teachers: teacherCountFull.length,
        lessonsReleased: releasedCount,
        submissions: submissionCount,
        avgScore: avgScore ? Math.round(Number(avgScore)) : null,
      },
      teachers: teacherProfiles,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}

// POST /api/admin/schools/[id] — add a teacher to this school
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await assertSuperAdmin();
    const { id: schoolId } = await params;

    const { teacherName, teacherEmail, teacherPassword, classId } =
      (await request.json()) as {
        teacherName: string;
        teacherEmail: string;
        teacherPassword: string;
        classId: string;
      };

    if (!teacherName || !teacherEmail || !teacherPassword || !classId) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: teacherEmail.trim().toLowerCase(),
        password: teacherPassword,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message ?? "Failed to create auth account." },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    await db
      .insert(profiles)
      .values({ id: userId, fullName: teacherName, email: teacherEmail.trim().toLowerCase() })
      .onConflictDoNothing();

    await db
      .insert(teacherAssignments)
      .values({ profileId: userId, classId, schoolId })
      .onConflictDoNothing();

    await db
      .insert(userRoles)
      .values({ profileId: userId, role: "teacher" })
      .onConflictDoNothing();

    return NextResponse.json({ ok: true, userId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
