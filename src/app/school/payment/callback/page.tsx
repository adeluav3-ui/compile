"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

function CallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("Verifying payment…");
  const [error, setError] = useState("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    const reference =
      searchParams.get("reference") || searchParams.get("trxref");

    if (!reference) {
      setError("No payment reference found. Contact support at compile100@gmail.com.");
      return;
    }

    fetch("/api/school/payment/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (!ok) {
          setError(data.error ?? "Verification failed. Contact support at compile100@gmail.com.");
          return;
        }
        setExpiresAt(data.expiresAt);
        setStatus("Subscription activated!");
        setTimeout(() => router.push("/school/dashboard/admin"), 2500);
      })
      .catch(() => {
        setError("Verification error. Contact support at compile100@gmail.com if payment was deducted.");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6">
      <div className="w-full max-w-sm text-center">
        <Image
          src="/images/compile-lockup-navy.svg"
          alt="Compile"
          width={120}
          height={50}
          className="mx-auto mb-10 h-10 w-auto"
        />

        {error ? (
          <div>
            <p className="mb-4 rounded-[3px] bg-[#FEF2F2] px-4 py-3 font-mono text-xs text-[#991B1B]">
              {error}
            </p>
            <a
              href="/school/payment"
              className="font-mono text-xs text-steel hover:underline"
            >
              ← Back to payment
            </a>
          </div>
        ) : expiresAt ? (
          <div>
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-navy/10">
              <svg className="h-6 w-6 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-serif text-xl font-semibold text-navy-deep">Payment confirmed</p>
            <p className="mt-2 text-sm text-muted">
              Active until{" "}
              <strong>
                {new Date(expiresAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </strong>
            </p>
            <p className="mt-1 font-mono text-xs text-muted">Redirecting to your dashboard…</p>
          </div>
        ) : (
          <div>
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
            <p className="font-mono text-sm text-muted">{status}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense>
      <CallbackInner />
    </Suspense>
  );
}
