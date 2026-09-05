import { NextRequest, NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/school-session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { db } from "@/db";
import { profiles, userRoles, studentClasses, teacherAssignments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { cacheLocalCredential } from "@/lib/local-auth";
import { randomBytes } from "crypto";

interface ImportRow {
  name: string;
  identifier: string; // email or username
  password?: string;
}

// POST /api/school/teacher/students/bulk — teacher bulk-creates student accounts
export async function POST(req: NextRequest) {
  const session = await getSchoolSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const classId: string = body?.classId ?? "";
  const rows: ImportRow[] = Array.isArray(body?.rows) ? body.rows : [];

  if (!classId || rows.length === 0) {
    return NextResponse.json({ error: "classId and at least one row are required." }, { status: 400 });
  }

  // Verify this teacher is assigned to the target class
  const assignment = await db
    .select({ schoolId: teacherAssignments.schoolId })
    .from(teacherAssignments)
    .where(
      and(
        eq(teacherAssignments.profileId, session.profileId),
        eq(teacherAssignments.classId, classId)
      )
    )
    .limit(1);

  if (assignment.length === 0) {
    return NextResponse.json({ error: "Class not assigned to your account." }, { status: 403 });
  }

  const schoolId = assignment[0].schoolId;
  const created: { name: string; identifier: string; generatedPassword?: string }[] = [];
  const failed: { name: string; identifier: string; error: string }[] = [];

  for (const row of rows) {
    const name = row.name?.trim();
    const identifier = row.identifier?.trim().toLowerCase();
    if (!name || !identifier) {
      failed.push({ name: name ?? "", identifier: identifier ?? "", error: "Name and identifier are required." });
      continue;
    }

    const password = row.password?.trim() || randomBytes(6).toString("hex");
    const isEmail = identifier.includes("@");
    const email = isEmail ? identifier : `${identifier}@compile.internal`;
    const username = isEmail ? undefined : identifier;
    let generatedPassword: string | undefined;
    if (!row.password?.trim()) generatedPassword = password;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (authError || !authData.user) {
      failed.push({ name, identifier, error: authError?.message ?? "Auth creation failed." });
      continue;
    }

    const userId = authData.user.id;

    try {
      await db
        .insert(profiles)
        .values({ id: userId, email, username: username ?? null, fullName: name })
        .onConflictDoNothing();

      await db
        .insert(userRoles)
        .values({ profileId: userId, role: "student" })
        .onConflictDoNothing();

      await db
        .insert(studentClasses)
        .values({ profileId: userId, classId })
        .onConflictDoNothing();

      if (process.env.LOCAL_DB_PATH) {
        await cacheLocalCredential(
          userId,
          email,
          password,
          { role: "student", schoolId, classId, name },
          username,
        ).catch(() => {});
      }

      created.push({ name, identifier, generatedPassword });
    } catch (err) {
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
      failed.push({ name, identifier, error: err instanceof Error ? err.message : "Database error." });
    }
  }

  return NextResponse.json({ ok: true, created, failed });
}
