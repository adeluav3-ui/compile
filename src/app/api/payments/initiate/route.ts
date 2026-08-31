import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cohorts, cohortRegistrations } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { COHORT_01_NUMBER, SEAT_CAP, currentAmountKobo } from "@/lib/cohort";
import { randomBytes } from "crypto";

function generateReference(): string {
  return `COMPILE-01-${randomBytes(8).toString("hex").toUpperCase()}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const whatsapp = typeof body.whatsapp === "string" ? body.whatsapp.trim() || null : null;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }
  if (!fullName || fullName.length < 2) {
    return NextResponse.json({ error: "Full name is required." }, { status: 400 });
  }

  // Find cohort 01
  const [cohort] = await db.select().from(cohorts).where(eq(cohorts.number, COHORT_01_NUMBER));
  if (!cohort) {
    return NextResponse.json({ error: "Cohort is not available yet." }, { status: 503 });
  }

  // Block duplicate paid registrations
  const [existingPaid] = await db
    .select({ total: count() })
    .from(cohortRegistrations)
    .where(
      and(
        eq(cohortRegistrations.cohortId, cohort.id),
        eq(cohortRegistrations.email, email),
        eq(cohortRegistrations.status, "paid")
      )
    );

  if ((existingPaid?.total ?? 0) > 0) {
    return NextResponse.json(
      { error: "This email already has a reserved spot." },
      { status: 409 }
    );
  }

  // Check seat cap (count confirmed paid seats)
  const [seatCount] = await db
    .select({ total: count() })
    .from(cohortRegistrations)
    .where(
      and(
        eq(cohortRegistrations.cohortId, cohort.id),
        eq(cohortRegistrations.status, "paid")
      )
    );

  if ((seatCount?.total ?? 0) >= SEAT_CAP) {
    return NextResponse.json({ error: "This cohort is full." }, { status: 409 });
  }

  const reference = generateReference();
  const amountKobo = currentAmountKobo();

  await db.insert(cohortRegistrations).values({
    cohortId: cohort.id,
    email,
    fullName,
    whatsapp,
    paystackReference: reference,
    amountKobo,
    status: "pending",
  });

  return NextResponse.json({
    reference,
    amountKobo,
    email,
    // Read whichever name the environment uses (local vs Vercel naming differs)
    paystackKey:
      process.env.PAYSTACK_PUBLIC_KEY ??
      process.env.NEXT_PAYSTACK_PUBLIC_KEY ??
      process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ??
      "",
  });
}
