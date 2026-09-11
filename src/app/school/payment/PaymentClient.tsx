"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";

declare global {
  interface Window {
    PaystackPop: {
      setup: (opts: Record<string, unknown>) => { openIframe: () => void };
    };
  }
}

type Plan = "monthly" | "yearly";

const PLANS: Record<Plan, { label: string; amountLabel: string; note: string }> = {
  monthly: {
    label: "Monthly",
    amountLabel: "₦150,000",
    note: "30 days of access",
  },
  yearly: {
    label: "Yearly",
    amountLabel: "₦1,200,000",
    note: "365 days · save ₦600,000 vs monthly",
  },
};

export default function PaymentClient({
  schoolName,
  email,
  isRenewal,
  currentExpiry,
}: {
  schoolName: string;
  email: string;
  isRenewal: boolean;
  currentExpiry: string | null;
}) {
  const [plan, setPlan] = useState<Plan>("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [newExpiry, setNewExpiry] = useState<string | null>(null);
  const router = useRouter();

  async function pay() {
    setLoading(true);
    setError("");

    try {
      const initRes = await fetch("/api/school/payment/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const initData = await initRes.json();

      if (!initRes.ok) {
        setError(initData.error ?? "Failed to initiate payment.");
        setLoading(false);
        return;
      }

      const { reference, amountKobo } = initData;
      setLoading(false);

      const handler = window.PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email,
        amount: amountKobo,
        ref: reference,
        label: schoolName,
        metadata: { plan, school_name: schoolName },
        callback: async (response: { reference: string }) => {
          setLoading(true);
          try {
            const verRes = await fetch("/api/school/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reference: response.reference }),
            });
            const verData = await verRes.json();
            setLoading(false);

            if (verRes.ok) {
              setNewExpiry(verData.expiresAt);
              setSuccess(true);
              setTimeout(() => router.push("/school/dashboard/admin"), 3000);
            } else {
              setError(verData.error ?? "Verification failed. Contact support at compile100@gmail.com.");
            }
          } catch {
            setLoading(false);
            setError("Verification error. Contact support if payment was deducted.");
          }
        },
        onClose: () => {
          setLoading(false);
        },
      });

      handler.openIframe();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (success) {
    const expiryLabel = newExpiry
      ? new Date(newExpiry).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
      : `${plan === "yearly" ? "365" : "30"} days from today`;

    return (
      <div className="rounded-[3px] border border-line bg-surface p-8 text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-navy/10">
          <svg className="h-6 w-6 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-serif text-xl font-semibold text-navy-deep">Payment confirmed</p>
        <p className="mt-2 text-sm text-muted">
          Your subscription is active until <strong>{expiryLabel}</strong>.
        </p>
        <p className="mt-1 font-mono text-xs text-muted">Redirecting to your dashboard…</p>
      </div>
    );
  }

  const selected = PLANS[plan];

  // Compute projected expiry for display
  const base = currentExpiry && new Date(currentExpiry) > new Date() ? new Date(currentExpiry) : new Date();
  const projected = new Date(base);
  projected.setDate(projected.getDate() + (plan === "yearly" ? 365 : 30));
  const projectedLabel = projected.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />

      <div className="rounded-[3px] border border-line bg-surface p-8">
        {/* Plan toggle */}
        <div className="mb-6">
          <div className="mb-2 font-mono text-xs text-muted">Subscription plan</div>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(PLANS) as Plan[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlan(p)}
                className={`rounded-[3px] border px-4 py-3 text-left transition-colors ${
                  plan === p
                    ? "border-navy bg-navy/5"
                    : "border-line hover:border-navy"
                }`}
              >
                <div className="font-mono text-xs font-semibold text-navy-deep">{PLANS[p].label}</div>
                <div className="mt-0.5 font-serif text-lg font-bold text-navy-deep">{PLANS[p].amountLabel}</div>
                <div className="mt-0.5 font-mono text-[10px] text-muted">{PLANS[p].note}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-mono text-xs text-muted">School</div>
            <div className="mt-0.5 font-semibold text-navy-deep">{schoolName}</div>
          </div>
          <div>
            <div className="font-mono text-xs text-muted">Billing email</div>
            <div className="mt-0.5 font-mono text-xs text-ink">{email}</div>
          </div>
          {isRenewal && currentExpiry && (
            <div>
              <div className="font-mono text-xs text-muted">Current expiry</div>
              <div className="mt-0.5 font-semibold text-navy-deep">
                {new Date(currentExpiry).toLocaleDateString("en-GB", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </div>
            </div>
          )}
          <div>
            <div className="font-mono text-xs text-muted">
              {isRenewal ? "Extends to" : "Access until"}
            </div>
            <div className="mt-0.5 font-semibold text-navy-deep">{projectedLabel}</div>
          </div>
        </div>

        <div className="mb-6 rounded-[3px] bg-navy/5 px-5 py-4">
          <div className="font-mono text-xs text-muted">Total due</div>
          <div className="mt-1 font-serif text-3xl font-bold text-navy-deep">{selected.amountLabel}</div>
        </div>

        {error && (
          <div className="mb-4 rounded-[3px] bg-[#FEF2F2] px-4 py-3 font-mono text-xs text-[#991B1B]">
            {error}
          </div>
        )}

        <button
          onClick={pay}
          disabled={loading}
          className="w-full rounded-[3px] bg-navy py-3 font-mono text-sm text-surface transition-colors hover:bg-navy-deep disabled:opacity-50"
        >
          {loading ? "Please wait…" : `${isRenewal ? "Renew" : "Subscribe"} — ${selected.amountLabel} →`}
        </button>

        <p className="mt-3 text-center font-mono text-xs text-muted">
          Secured by Paystack · cards, bank transfer, USSD
        </p>
      </div>
    </>
  );
}
