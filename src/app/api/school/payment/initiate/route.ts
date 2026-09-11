import { NextRequest, NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/school-session";
import { db } from "@/db";
import { schoolSubscriptions, schools, profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";

const MONTHLY_KOBO = 15_000_000;  // ₦150,000
const YEARLY_KOBO = 120_000_000;  // ₦1,200,000

// POST /api/school/payment/initiate — school admin initiates a subscription payment
// Body: { plan?: "monthly" | "yearly" } — defaults to monthly
export async function POST(req: NextRequest) {
  const session = await getSchoolSession();
  if (!session || session.role !== "school_admin") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const plan = body?.plan === "yearly" ? "yearly" : "monthly";
  const amountKobo = plan === "yearly" ? YEARLY_KOBO : MONTHLY_KOBO;
  const daysGranted = plan === "yearly" ? 365 : 30;

  const [profile] = await db
    .select({ email: profiles.email })
    .from(profiles)
    .where(eq(profiles.id, session.profileId));

  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const reference = `SCHOOL-${plan.toUpperCase()}-${session.schoolId.slice(0, 8)}-${randomBytes(6).toString("hex").toUpperCase()}`;

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

  return NextResponse.json({
    reference,
    email: profile.email,
    amountKobo,
    plan,
    schoolName: school?.name ?? "Your School",
  });
}
