import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { db } from "@/db";
import { profiles, schools, userRoles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

const SUPER_ADMIN_EMAIL = "adeluav3@gmail.com";

async function assertSuperAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== SUPER_ADMIN_EMAIL) throw new Error("Unauthorized");
}

// GET /api/admin/schools — all schools with admin contact
export async function GET() {
  try {
    await assertSuperAdmin();

    const rows = await db
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
      .orderBy(desc(schools.createdAt));

    return NextResponse.json({ schools: rows });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}

// POST /api/admin/schools — onboard a new school
export async function POST(request: Request) {
  try {
    await assertSuperAdmin();

    const { schoolName, state, adminName, adminEmail, adminPassword } =
      (await request.json()) as {
        schoolName: string;
        state: string;
        adminName: string;
        adminEmail: string;
        adminPassword: string;
      };

    if (!schoolName || !adminEmail || !adminPassword || !adminName) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    // 1. Create Supabase Auth user (email confirmed immediately — no invite email)
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: adminEmail.trim().toLowerCase(),
        password: adminPassword,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message ?? "Failed to create auth account." },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    // 2. Profile
    await db
      .insert(profiles)
      .values({ id: userId, fullName: adminName, email: adminEmail.trim().toLowerCase() })
      .onConflictDoNothing();

    // 3. School
    const [school] = await db
      .insert(schools)
      .values({
        name: schoolName,
        state,
        adminId: userId,
        subscriptionStatus: "trial",
        licenseKey: `COMPILE-${Date.now().toString(36).toUpperCase()}`,
      })
      .returning();

    // 4. Role
    await db
      .insert(userRoles)
      .values({ profileId: userId, role: "school_admin" })
      .onConflictDoNothing();

    return NextResponse.json({ schoolId: school.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
