import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cohorts, cohortRegistrations } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { COHORT_01_NUMBER, SEAT_CAP, currentAmountKobo } from "@/lib/cohort";
import { randomBytes } from "crypto";

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

  const [cohort] = await db.select().from(cohorts).where(eq(cohorts.number, COHORT_01_NUMBER));
  if (!cohort) {
    return NextResponse.json({ error: "Cohort is not available yet." }, { status: 503 });
  }

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
    return NextResponse.json({ error: "This cohort is full.", full: true }, { status: 409 });
  }

  const amountKobo = currentAmountKobo();
  const reference = `MANUAL-01-${randomBytes(8).toString("hex").toUpperCase()}`;

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
    ok: true,
    amountNaira: amountKobo / 100,
  });
}
