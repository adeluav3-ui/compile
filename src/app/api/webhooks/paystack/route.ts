import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/db";
import { cohortRegistrations } from "@/db/schema";
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

  let event: { event: string; data: { reference: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (event.event === "charge.success") {
    const reference = event.data?.reference;
    if (reference) {
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
  }

  // Always 200 to Paystack — retries otherwise
  return NextResponse.json({ ok: true });
}
