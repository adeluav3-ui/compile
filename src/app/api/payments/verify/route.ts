import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cohortRegistrations } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { SEAT_CAP } from "@/lib/cohort";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const reference =
    typeof body?.reference === "string" ? body.reference.trim() : "";

  if (!reference) {
    return NextResponse.json({ error: "Reference is required." }, { status: 400 });
  }

  const [registration] = await db
    .select()
    .from(cohortRegistrations)
    .where(eq(cohortRegistrations.paystackReference, reference));

  if (!registration) {
    return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  }

  // Idempotent: already confirmed
  if (registration.status === "paid") {
    return NextResponse.json({
      ok: true,
      redirectUrl: process.env.WHATSAPP_GROUP_URL,
    });
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
    return NextResponse.json(
      { ok: false, error: "Could not reach Paystack. Try again." },
      { status: 502 }
    );
  }

  const paystackData = await paystackRes.json();

  if (
    paystackData.data?.status !== "success" ||
    paystackData.data?.amount !== registration.amountKobo
  ) {
    return NextResponse.json(
      { ok: false, error: "Payment not confirmed." },
      { status: 402 }
    );
  }

  // Count paid seats (not including this one yet)
  const [seatCount] = await db
    .select({ total: count() })
    .from(cohortRegistrations)
    .where(
      and(
        eq(cohortRegistrations.cohortId, registration.cohortId),
        eq(cohortRegistrations.status, "paid")
      )
    );

  const seats = seatCount?.total ?? 0;

  // Mark as paid regardless — payment was real
  await db
    .update(cohortRegistrations)
    .set({ status: "paid", paidAt: new Date() })
    .where(eq(cohortRegistrations.paystackReference, reference));

  // Rare race: cohort filled while this person was in the checkout flow
  if (seats >= SEAT_CAP) {
    return NextResponse.json(
      {
        ok: false,
        full: true,
        error:
          "The last seat was taken while you were checking out. We'll reach out within 24 hours to arrange a refund.",
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    ok: true,
    redirectUrl: process.env.WHATSAPP_GROUP_URL,
  });
}
