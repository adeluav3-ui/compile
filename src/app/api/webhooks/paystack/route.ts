import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/db";
import { cohortRegistrations, schoolSubscriptions, schools } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("x-paystack-signature") ?? "";

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: "Misconfigured." }, { status: 500 });
  }

  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");

  let valid = false;
  try {
    valid = timingSafeEqual(
      Buffer.from(sig, "utf8"),
      Buffer.from(expected, "utf8")
    );
  } catch {
    valid = false;
  }

  if (!valid) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: { event: string; data: { reference: string; amount: number } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (event.event === "charge.success") {
    const reference = event.data?.reference;
    if (!reference) {
      return NextResponse.json({ ok: true });
    }

    // ── School subscription payment ──────────────────────────────────────────
    if (reference.startsWith("SCHOOL-")) {
      const [sub] = await db
        .select()
        .from(schoolSubscriptions)
        .where(eq(schoolSubscriptions.paystackReference, reference));

      if (sub && sub.status !== "paid") {
        await db
          .update(schoolSubscriptions)
          .set({ status: "paid" })
          .where(eq(schoolSubscriptions.paystackReference, reference));

        const DAYS: Record<number, number> = {
          15_000_000: 30,
          40_000_000: 90,
          100_000_000: 365,
        };
        const daysGranted = DAYS[sub.amountKobo] ?? 30;

        // Extend school subscription from current expiry (or now), whichever is later
        const [school] = await db
          .select({ subscriptionExpiresAt: schools.subscriptionExpiresAt })
          .from(schools)
          .where(eq(schools.id, sub.schoolId));

        const base =
          school?.subscriptionExpiresAt && school.subscriptionExpiresAt > new Date()
            ? school.subscriptionExpiresAt
            : new Date();

        const newExpiry = new Date(base);
        newExpiry.setDate(newExpiry.getDate() + daysGranted);

        await db
          .update(schools)
          .set({ subscriptionStatus: "active", subscriptionExpiresAt: newExpiry })
          .where(eq(schools.id, sub.schoolId));
      }

      return NextResponse.json({ ok: true });
    }

    // ── Cohort payment ───────────────────────────────────────────────────────
    const [reg] = await db
      .select()
      .from(cohortRegistrations)
      .where(eq(cohortRegistrations.paystackReference, reference));

    if (reg && reg.status !== "paid") {
      await db
        .update(cohortRegistrations)
        .set({ status: "paid", paidAt: new Date() })
        .where(eq(cohortRegistrations.paystackReference, reference));
    }
  }

  // Always 200 to Paystack — retries otherwise
  return NextResponse.json({ ok: true });
}
