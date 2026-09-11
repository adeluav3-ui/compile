import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { db } from "@/db";
import { profiles, userRoles, schools, schoolSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";

const MONTHLY_KOBO = 15_000_000; // ₦150,000
const YEARLY_KOBO = 120_000_000;  // ₦1,200,000

// POST /api/school/signup — public, verifies Paystack payment then creates school + admin account
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const schoolName: string = body?.schoolName?.trim() ?? "";
  const state: string = body?.state?.trim() ?? "";
  const adminName: string = body?.adminName?.trim() ?? "";
  const email: string = body?.email?.trim().toLowerCase() ?? "";
  const password: string = body?.password ?? "";
  const paystackReference: string = body?.paystackReference?.trim() ?? "";

  if (!schoolName || !state || !adminName || !email || !password || !paystackReference) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  // Verify with Paystack
  const paystackRes = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(paystackReference)}`,
    {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      cache: "no-store",
    }
  );

  if (!paystackRes.ok) {
    return NextResponse.json({ error: "Could not verify payment. Please contact support." }, { status: 502 });
  }

  const paystackData = await paystackRes.json();
  const txn = paystackData.data;

  if (txn?.status !== "success") {
    return NextResponse.json({ error: "Payment was not successful." }, { status: 402 });
  }

  // Determine subscription duration from amount paid
  const amountPaid: number = txn.amount;
  let daysGranted: number;

  if (amountPaid === YEARLY_KOBO) {
    daysGranted = 365;
  } else if (amountPaid === MONTHLY_KOBO) {
    daysGranted = 30;
  } else {
    return NextResponse.json({ error: "Unexpected payment amount. Contact support." }, { status: 402 });
  }

  // Ensure reference hasn't already been used to create an account
  const existing = await db
    .select({ id: schoolSubscriptions.id })
    .from(schoolSubscriptions)
    .where(eq(schoolSubscriptions.paystackReference, paystackReference));

  if (existing.length > 0) {
    return NextResponse.json({ error: "This payment has already been used to create an account." }, { status: 409 });
  }

  // Create Supabase auth account
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: adminName },
  });

  if (authError || !authData.user) {
    const msg = authError?.message ?? "Failed to create account.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const userId = authData.user.id;

  try {
    await db
      .insert(profiles)
      .values({ id: userId, email, username: null, fullName: adminName })
      .onConflictDoNothing();

    await db
      .insert(userRoles)
      .values({ profileId: userId, role: "school_admin" })
      .onConflictDoNothing();

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + daysGranted);

    const [school] = await db
      .insert(schools)
      .values({
        name: schoolName,
        state,
        adminId: userId,
        subscriptionStatus: "active",
        subscriptionExpiresAt: expiresAt,
      })
      .returning();

    await db.insert(schoolSubscriptions).values({
      schoolId: school.id,
      paystackReference,
      amountKobo: amountPaid,
      periodStart: now,
      periodEnd: expiresAt,
      status: "paid",
    });
  } catch (err) {
    await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
    const msg = err instanceof Error ? err.message : "Database error.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
