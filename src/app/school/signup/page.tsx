"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT",
  "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
  "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

type Plan = "monthly" | "yearly";

export default function SchoolSignupPage() {
  const [schoolName, setSchoolName] = useState("");
  const [state, setState] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [plan, setPlan] = useState<Plan>("monthly");
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

    setLoading(true);
    setStatus("Preparing payment…");

    const preAuthRes = await fetch("/api/school/payment/pre-auth-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, plan }),
    });

    const preAuthData = await preAuthRes.json();

    if (!preAuthRes.ok || !preAuthData.authorization_url) {
      setError(preAuthData.error ?? "Failed to initiate payment. Try again.");
      setLoading(false);
      setStatus("");
      return;
    }

    // Persist form data so the callback page can create the account
    sessionStorage.setItem(
      "pendingSignup",
      JSON.stringify({ schoolName, state, adminName, email, password })
    );

    // Hand off to Paystack's hosted checkout page
    window.location.href = preAuthData.authorization_url;
  }

  return (
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
            Access activates instantly after payment.
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

          {/* Plan selector */}
          <div>
            <label className="mb-2 block font-mono text-xs text-muted">Subscription plan</label>
            <div className="grid grid-cols-2 gap-2">
              {(["monthly", "yearly"] as Plan[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlan(p)}
                  disabled={loading}
                  className={`rounded-[3px] border px-3 py-3 text-left transition-colors disabled:opacity-60 ${
                    plan === p ? "border-navy bg-navy/5" : "border-line hover:border-navy"
                  }`}
                >
                  <div className="font-mono text-xs font-semibold text-navy-deep capitalize">{p}</div>
                  <div className="mt-0.5 font-semibold text-ink">
                    {p === "monthly" ? "₦150,000" : "₦1,200,000"}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-muted">
                    {p === "monthly" ? "30 days" : "365 days · save ₦600k"}
                  </div>
                </button>
              ))}
            </div>
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
            {loading
              ? status || "Please wait…"
              : plan === "yearly"
                ? "Continue to payment — ₦1,200,000 →"
                : "Continue to payment — ₦150,000 →"}
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
  );
}
