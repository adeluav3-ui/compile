import { NextRequest, NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/school-session";
import { db } from "@/db";
import { schoolSubscriptions, schools, profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";

const PLANS = {
  monthly: { kobo: 15_000_000, days: 30 },
  term:    { kobo: 40_000_000, days: 90 },
  session: { kobo: 100_000_000, days: 365 },
} as const;

type PlanKey = keyof typeof PLANS;

function siteOrigin() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://compile-eight.vercel.app";
}

// POST /api/school/payment/initiate — school admin initiates a subscription renewal
// Body: { plan?: "monthly" | "term" | "session" }
export async function POST(req: NextRequest) {
  const session = await getSchoolSession();
  if (!session || session.role !== "school_admin") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const planKey: PlanKey = body?.plan in PLANS ? (body.plan as PlanKey) : "monthly";
  const { kobo: amountKobo, days: daysGranted } = PLANS[planKey];

  const [profile] = await db
    .select({ email: profiles.email })
    .from(profiles)
    .where(eq(profiles.id, session.profileId));

  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const reference = `SCHOOL-${planKey.toUpperCase()}-${session.schoolId.slice(0, 8)}-${randomBytes(6).toString("hex").toUpperCase()}`;

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + daysGranted);

  await db.insert(schoolSubscriptions).values({
    schoolId: session.schoolId,
    paystackReference: reference,
    amountKobo,
    periodStart: now,
    periodEnd,
    status: "pending",
  });

  const [school] = await db
    .select({ name: schools.name })
    .from(schools)
    .where(eq(schools.id, session.schoolId));

  const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: profile.email,
      amount: amountKobo,
      reference,
      currency: "NGN",
      callback_url: `${siteOrigin()}/school/payment/callback`,
    }),
  });

  const paystackData = await paystackRes.json();

  return NextResponse.json({
    reference,
    email: profile.email,
    amountKobo,
    plan: planKey,
    schoolName: school?.name ?? "Your School",
    authorization_url: paystackData.data?.authorization_url ?? null,
  });
}
