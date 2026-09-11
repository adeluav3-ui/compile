import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

const MONTHLY_KOBO = 15_000_000;
const YEARLY_KOBO = 120_000_000;

function siteOrigin() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://compile-eight.vercel.app";
}

// POST /api/school/payment/pre-auth-signup — public
// Initialises a Paystack transaction for school signup (no account exists yet).
// Body: { email, plan?: "monthly" | "yearly" }
// Returns: { authorization_url, reference }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email: string = body?.email?.trim().toLowerCase() ?? "";
  const plan = body?.plan === "yearly" ? "yearly" : "monthly";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }

  const amountKobo = plan === "yearly" ? YEARLY_KOBO : MONTHLY_KOBO;
  const reference = `SCHOOL-SIGNUP-${plan.toUpperCase()}-${randomBytes(8).toString("hex").toUpperCase()}`;

  const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: amountKobo,
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
