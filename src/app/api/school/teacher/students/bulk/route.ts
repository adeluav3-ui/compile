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
}

function slugifyName(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9\s]/g, "")    // keep only letters, digits, spaces
    .trim()
    .replace(/\s+/g, "_");
  return slug || "student";
}

async function createAuthUser(email: string, password: string, fullName: string) {
  return supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
}

// POST /api/school/teacher/students/bulk
// Body: { classId, rows: [{ name }] }
// Usernames and passwords are fully auto-generated — teacher only supplies names.
export async function POST(req: NextRequest) {
  const session = await getSchoolSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const classId: string = body?.classId ?? "";
  const rows: ImportRow[] = Array.isArray(body?.rows) ? body.rows : [];

  if (!classId || rows.length === 0) {
    return NextResponse.json({ error: "classId and at least one name are required." }, { status: 400 });
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
  const created: { name: string; username: string; password: string }[] = [];
  const failed: { name: string; error: string }[] = [];

  for (const row of rows) {
    const name = row.name?.trim();
    if (!name) {
      failed.push({ name: "", error: "Name is blank." });
      continue;
    }

    const password = randomBytes(6).toString("hex"); // e.g. "a3f7c2d1e5b8"
    const baseUsername = slugifyName(name);
    let username = baseUsername;
    let email = `${username}@compile.internal`;

    // Try to create auth user; if the email is taken (collision), append a
    // random 3-char suffix to the username and retry once.
    let authResult = await createAuthUser(email, password, name);

    if (authResult.error) {
      const msg = authResult.error.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        username = `${baseUsername}_${randomBytes(2).toString("hex")}`;
        email = `${username}@compile.internal`;
        authResult = await createAuthUser(email, password, name);
      }
    }

    if (authResult.error || !authResult.data.user) {
      failed.push({ name, error: authResult.error?.message ?? "Auth creation failed." });
      continue;
    }

    const userId = authResult.data.user.id;

    try {
      await db
        .insert(profiles)
        .values({ id: userId, email, username, fullName: name })
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

      created.push({ name, username, password });
    } catch (err) {
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
      failed.push({ name, error: err instanceof Error ? err.message : "Database error." });
    }
  }

  return NextResponse.json({ ok: true, created, failed });
}
