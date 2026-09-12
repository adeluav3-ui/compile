import { NextRequest, NextResponse } from "next/server";
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

// POST /api/school/payment/pre-auth-signup — public
// Initialises a Paystack transaction for school signup (no account exists yet).
// Body: { email, plan?: "monthly" | "term" | "session" }
// Returns: { authorization_url, reference }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email: string = body?.email?.trim().toLowerCase() ?? "";
  const planKey: PlanKey = body?.plan in PLANS ? (body.plan as PlanKey) : "monthly";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }

  const { kobo } = PLANS[planKey];
  const reference = `SCHOOL-SIGNUP-${planKey.toUpperCase()}-${randomBytes(8).toString("hex").toUpperCase()}`;

  const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: kobo,
      reference,
      currency: "NGN",
      callback_url: `${siteOrigin()}/school/signup/callback`,
    }),
  });

  if (!paystackRes.ok) {
    return NextResponse.json({ error: "Could not initiate payment. Try again." }, { status: 502 });
  }

  const paystackData = await paystackRes.json();

  return NextResponse.json({
    authorization_url: paystackData.data?.authorization_url,
    reference: paystackData.data?.reference ?? reference,
  });
}
