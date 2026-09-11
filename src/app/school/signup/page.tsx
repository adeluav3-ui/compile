"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";

declare global {
  interface Window {
    PaystackPop: {
      setup: (opts: Record<string, unknown>) => { openIframe: () => void };
    };
  }
}

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT",
  "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
  "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

function makeReference() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `SCHOOL-SIGNUP-${Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

export default function SchoolSignupPage() {
  const router = useRouter();
  const [schoolName, setSchoolName] = useState("");
  const [state, setState] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  function validate(): string | null {
    if (!schoolName || !state || !adminName || !email || !password || !confirm) return "All fields are required.";
    if (password !== confirm) return "Passwords do not match.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!window.PaystackPop) {
      setError("Payment script not loaded yet. Please wait a moment and try again.");
      return;
    }

    setLoading(true);
    setStatus("Opening payment…");

    const reference = makeReference();

    const handler = window.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email,
      amount: 15_000_000, // ₦150,000 in kobo
      ref: reference,
      label: `${schoolName} — Compile School Edition`,
      callback: function (response: { reference: string }) {
        setStatus("Verifying payment…");

        const ref = response.reference;
        fetch("/api/school/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schoolName, state, adminName, email, password, paystackReference: ref }),
        })
          .then((r) => r.json().then((d) => ({ ok: r.ok, data: d })))
          .then(({ ok, data }) => {
            if (!ok) {
              setError(data.error ?? "Account creation failed. Contact support at compile100@gmail.com.");
              setLoading(false);
              setStatus("");
              return;
            }
            setStatus("Logging you in…");
            return fetch("/api/school/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ identifier: email, password }),
            })
              .then((r) => r.json())
              .then((loginData) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                router.push((loginData.redirectTo ?? "/school/login") as any);
              });
          })
          .catch(() => {
            setError("Something went wrong. Contact support at compile100@gmail.com.");
            setLoading(false);
            setStatus("");
          });
      },
      onClose: () => {
        setLoading(false);
        setStatus("");
      },
    });

    handler.openIframe();
  }

  return (
    <>
      <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />

      <div className="relative flex min-h-screen flex-col items-center justify-center bg-paper px-6">
        <Link href="/" className="absolute left-4 top-4 font-mono text-xs text-muted hover:text-navy sm:left-6 sm:top-6">
          ← Back to home
        </Link>

        <div className="w-full max-w-sm">
          <div className="mb-10 text-center">
            <Link href="/">
              <Image
                src="/images/compile-lockup-navy.svg"
                alt="Compile"
                width={120}
                height={50}
                className="mx-auto mb-6 h-10 w-auto"
              />
            </Link>
            <span className="mb-2 block font-mono text-xs uppercase tracking-widest text-brass">
              School Edition
            </span>
            <h1 className="font-serif text-[28px] font-semibold text-navy-deep">
              Register your school
            </h1>
            <p className="mt-2 text-sm text-muted">
              ₦150,000/month · 30-day access · Activate instantly on payment.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block font-mono text-xs text-muted">School name</label>
              <input
                type="text"
                required
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                disabled={loading}
                placeholder="e.g. Federal Government College Lagos"
                className="w-full rounded-[3px] border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-xs text-muted">State</label>
              <select
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                disabled={loading}
                className="w-full rounded-[3px] border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:border-navy focus:outline-none disabled:opacity-60"
              >
                <option value="">Select state…</option>
                {NIGERIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-xs text-muted">Your full name</label>
              <input
                type="text"
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                disabled={loading}
                placeholder="Admin / principal name"
                className="w-full rounded-[3px] border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-xs text-muted">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="your@email.com"
                className="w-full rounded-[3px] border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-xs text-muted">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="At least 8 characters"
                className="w-full rounded-[3px] border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-xs text-muted">Confirm password</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={loading}
                placeholder="Repeat your password"
                className="w-full rounded-[3px] border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none disabled:opacity-60"
              />
            </div>

            {error && (
              <p className="rounded-[3px] bg-[#FEF2F2] px-3 py-2 font-mono text-xs text-[#991B1B]">
                {error}
              </p>
            )}

            {status && !error && (
              <p className="font-mono text-xs text-muted">{status}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-[3px] bg-navy py-2.5 font-mono text-sm text-surface transition-colors hover:bg-navy-deep disabled:opacity-50"
            >
              {loading ? status || "Please wait…" : "Continue to payment — ₦150,000 →"}
            </button>

            <p className="text-center font-mono text-xs text-muted">
              Already have an account?{" "}
              <a href="/school/login" className="text-steel hover:underline">
                Sign in
              </a>
            </p>
          </form>
        </div>
      </div>
    </>
  );
}
