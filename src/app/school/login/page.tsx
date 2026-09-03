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
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [forgotSent, setForgotSent] = useState(false);

  const supabase = createSupabaseBrowserClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (email.trim().toLowerCase() === SUPER_ADMIN_EMAIL) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push((next ?? "/admin") as any);
    } else {
      router.push("/school/auth/redirect");
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: `${window.location.origin}/school/auth/callback`,
      }
    );

    if (resetError) {
      setError(resetError.message);
    } else {
      setForgotSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-block rounded-[3px] border border-line bg-surface px-4 py-2 font-mono text-xs text-muted hover:border-navy hover:text-navy">
            ← Back to home
          </Link>
        </div>
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
