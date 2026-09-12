import { NextRequest, NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/school-session";
import { db } from "@/db";
import { schoolSubscriptions, schools } from "@/db/schema";
import { eq } from "drizzle-orm";

const VALID_AMOUNTS: Record<number, number> = {
  15_000_000: 30,   // ₦150,000 monthly
  40_000_000: 90,   // ₦400,000 per term
  100_000_000: 365, // ₦1,000,000 per session
};

const SUB_CACHE_COOKIE = "compile_sub_v1";

// POST /api/school/payment/verify — verify a Paystack school payment after redirect
export async function POST(req: NextRequest) {
  const session = await getSchoolSession();
  if (!session || session.role !== "school_admin") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const reference: string = body?.reference?.trim() ?? "";

  if (!reference) {
    return NextResponse.json({ error: "Reference is required." }, { status: 400 });
  }

  const [sub] = await db
    .select()
    .from(schoolSubscriptions)
    .where(eq(schoolSubscriptions.paystackReference, reference));

  if (!sub || sub.schoolId !== session.schoolId) {
    return NextResponse.json({ error: "Payment record not found." }, { status: 404 });
  }

  // Already confirmed — idempotent
  if (sub.status === "paid") {
    const [school] = await db
      .select({ subscriptionExpiresAt: schools.subscriptionExpiresAt })
      .from(schools)
      .where(eq(schools.id, session.schoolId));

    const res = NextResponse.json({ ok: true, expiresAt: school?.subscriptionExpiresAt?.toISOString() });
    res.cookies.set(SUB_CACHE_COOKIE, "", { maxAge: 0, path: "/" });
    return res;
  }

  // Verify with Paystack
  const paystackRes = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      cache: "no-store",
    }
  );

  if (!paystackRes.ok) {
    return NextResponse.json({ error: "Could not reach Paystack. Try again." }, { status: 502 });
  }

  const paystackData = await paystackRes.json();
  const amountPaid: number = paystackData.data?.amount;

  if (paystackData.data?.status !== "success" || !(amountPaid in VALID_AMOUNTS)) {
    return NextResponse.json({ error: "Payment not confirmed by Paystack." }, { status: 402 });
  }

  const daysGranted = VALID_AMOUNTS[amountPaid];

  await db
    .update(schoolSubscriptions)
    .set({ status: "paid" })
    .where(eq(schoolSubscriptions.paystackReference, reference));

  const [school] = await db
    .select({ subscriptionExpiresAt: schools.subscriptionExpiresAt })
    .from(schools)
    .where(eq(schools.id, session.schoolId));

  const base =
    school?.subscriptionExpiresAt && school.subscriptionExpiresAt > new Date()
      ? school.subscriptionExpiresAt
      : new Date();

  const newExpiry = new Date(base);
  newExpiry.setDate(newExpiry.getDate() + daysGranted);

  await db
    .update(schools)
    .set({ subscriptionStatus: "active", subscriptionExpiresAt: newExpiry })
    .where(eq(schools.id, session.schoolId));

  const res = NextResponse.json({ ok: true, expiresAt: newExpiry.toISOString() });
  res.cookies.set(SUB_CACHE_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
