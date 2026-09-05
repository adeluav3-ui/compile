import { NextRequest, NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/school-session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { db } from "@/db";
import { profiles, userRoles, teacherAssignments, classes } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { cacheLocalCredential } from "@/lib/local-auth";
import { randomBytes } from "crypto";

// POST /api/school/admin/teachers — school admin creates a teacher account
export async function POST(req: NextRequest) {
  const session = await getSchoolSession();
  if (!session || session.role !== "school_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name: string = body?.name?.trim() ?? "";
  const identifier: string = body?.identifier?.trim() ?? "";
  const password: string = body?.password?.trim() || randomBytes(6).toString("hex");
  const classIds: string[] = Array.isArray(body?.classIds) ? body.classIds : [];

  if (!name || !identifier) {
    return NextResponse.json({ error: "Name and identifier are required." }, { status: 400 });
  }

  const schoolId = session.schoolId;

  // Validate classIds belong to this school (if provided)
  if (classIds.length > 0) {
    const validClasses = await db
      .select({ id: classes.id })
      .from(classes)
      .where(inArray(classes.id, classIds));

    const validIds = new Set(validClasses.map((c) => c.id));
    const invalid = classIds.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      return NextResponse.json({ error: "One or more class IDs are invalid." }, { status: 400 });
    }
  }

  const isEmail = identifier.includes("@");
  const normalizedIdentifier = identifier.toLowerCase();
  const email = isEmail ? normalizedIdentifier : `${normalizedIdentifier}@compile.internal`;
  const username = isEmail ? undefined : normalizedIdentifier;

  // Create Supabase auth account
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? "Failed to create auth account." },
      { status: 400 }
    );
  }

  const userId = authData.user.id;

  try {
    await db
      .insert(profiles)
      .values({ id: userId, email, username: username ?? null, fullName: name })
      .onConflictDoNothing();

    await db
      .insert(userRoles)
      .values({ profileId: userId, role: "teacher" })
      .onConflictDoNothing();

    for (const classId of classIds) {
      await db
        .insert(teacherAssignments)
        .values({ profileId: userId, classId, schoolId })
        .onConflictDoNothing();
    }

    // Cache offline if running School Edition
    if (process.env.LOCAL_DB_PATH) {
      await cacheLocalCredential(
        userId,
        email,
        password,
        { role: "teacher", schoolId, classId: classIds[0], name },
        username,
      ).catch(() => {});
    }
  } catch (err) {
    // Roll back the auth user so we don't leave an orphan account
    await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
    const msg = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    userId,
    email,
    generatedPassword: body?.password?.trim() ? undefined : password,
  });
}
