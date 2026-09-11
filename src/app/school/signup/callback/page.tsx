"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

function CallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("Verifying payment…");
  const [error, setError] = useState("");

  useEffect(() => {
    const reference =
      searchParams.get("reference") || searchParams.get("trxref");

    if (!reference) {
      setError("No payment reference found. Please try signing up again.");
      return;
    }

    const pendingRaw = sessionStorage.getItem("pendingSignup");
    if (!pendingRaw) {
      setError(
        "Signup details were lost. Your payment may have gone through — contact support at compile100@gmail.com with your payment reference: " +
          reference
      );
      return;
    }

    let pending: {
      schoolName: string;
      state: string;
      adminName: string;
      email: string;
      password: string;
    };
    try {
      pending = JSON.parse(pendingRaw);
    } catch {
      setError("Signup data corrupted. Contact support at compile100@gmail.com.");
      return;
    }

    setStatus("Creating your account…");

    fetch("/api/school/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...pending, paystackReference: reference }),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (!ok) {
          setError(data.error ?? "Account creation failed. Contact support at compile100@gmail.com.");
          return;
        }
        sessionStorage.removeItem("pendingSignup");
        setStatus("Logging you in…");

        return fetch("/api/school/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: pending.email, password: pending.password }),
        })
          .then((r) => r.json())
          .then((loginData) => {
            router.push(loginData.redirectTo ?? "/school/login");
          });
      })
      .catch(() => {
        setError("Something went wrong. Contact support at compile100@gmail.com.");
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
              href="/school/signup"
              className="font-mono text-xs text-steel hover:underline"
            >
              ← Try again
            </a>
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

export default function SignupCallbackPage() {
  return (
    <Suspense>
      <CallbackInner />
    </Suspense>
  );
}
