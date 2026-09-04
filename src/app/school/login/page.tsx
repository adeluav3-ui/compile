"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const SUPER_ADMIN_EMAIL = "adeluav3@gmail.com";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    errorParam === "no-role" ? "Account exists but has no role assigned. Contact support." : ""
  );
  const [offlineBanner, setOfflineBanner] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [forgotSent, setForgotSent] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOfflineBanner(false);

    const emailLower = email.trim().toLowerCase();

    // Super admin bypasses the fallback login API and calls Supabase directly
    if (emailLower === SUPER_ADMIN_EMAIL) {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: emailLower,
        password,
      });
      if (authError) {
        setError(authError.message);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.push((next ?? "/admin") as any);
      }
      setLoading(false);
      return;
    }

    // All school users go through the API which handles online → offline fallback
    try {
      const res = await fetch("/api/school/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailLower, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Sign in failed.");
        if (data.offline) setOfflineBanner(true);
        setLoading(false);
        return;
      }

      if (data.offline) setOfflineBanner(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push(data.redirectTo as any);
    } catch {
      setError("Cannot reach the server. Check your connection and try again.");
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Password reset requires internet — detect and show a clear message
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: `${window.location.origin}/school/auth/callback` }
      );

      if (resetError) {
        // Network errors have no status code from the browser client —
        // check for common offline signals
        const msg = resetError.message.toLowerCase();
        if (msg.includes("fetch") || msg.includes("network") || msg.includes("failed")) {
          setError("Password changes require an internet connection.");
        } else {
          setError(resetError.message);
        }
      } else {
        setForgotSent(true);
      }
    } catch {
      setError("Password changes require an internet connection.");
    }

    setLoading(false);
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
            {mode === "login" ? "Sign in to your account" : "Reset your password"}
          </h1>
          {mode === "login" && (
            <p className="mt-2 text-sm text-muted">
              For schools enrolled on the Compile platform.
            </p>
          )}
        </div>

        {offlineBanner && (
          <div className="mb-4 rounded-[3px] border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="font-mono text-xs text-amber-700">
              Signed in offline — access is limited to cached data until you reconnect.
            </p>
          </div>
        )}

        {forgotSent ? (
          <div className="rounded-[3px] border border-line bg-surface p-6 text-center">
            <p className="text-sm text-ink">
              Check your email for a password reset link.
            </p>
            <button
              onClick={() => { setMode("login"); setForgotSent(false); }}
              className="mt-4 font-mono text-xs text-steel hover:underline"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <form
            onSubmit={mode === "login" ? handleLogin : handleForgot}
            className="space-y-4"
          >
            <div>
              <label className="mb-1.5 block font-mono text-xs text-muted">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full rounded-[3px] border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none disabled:opacity-60"
                placeholder="you@school.edu.ng"
              />
            </div>

            {mode === "login" && (
              <div>
                <label className="mb-1.5 block font-mono text-xs text-muted">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-[3px] border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none disabled:opacity-60"
                  placeholder="••••••••"
                />
              </div>
            )}

            {error && (
              <p className="rounded-[3px] bg-[#FEF2F2] px-3 py-2 font-mono text-xs text-[#991B1B]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-[3px] bg-navy py-2.5 font-mono text-sm text-surface transition-colors hover:bg-navy-deep disabled:opacity-50"
            >
              {loading
                ? "Please wait…"
                : mode === "login"
                  ? "Sign in →"
                  : "Send reset link →"}
            </button>

            <div className="text-center">
              {mode === "login" ? (
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="font-mono text-xs text-steel hover:underline"
                >
                  Forgot password?
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="font-mono text-xs text-steel hover:underline"
                >
                  Back to sign in
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function SchoolLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
