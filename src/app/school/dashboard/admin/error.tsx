"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Admin dashboard error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-paper px-6">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-xl font-semibold text-navy-deep">
          Dashboard failed to load
        </h1>
        <p className="mt-3 text-sm text-muted">
          Something went wrong loading your school dashboard. This is usually a
          temporary issue.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-muted">
            Ref: {error.digest}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-[3px] bg-navy px-5 py-2.5 font-mono text-xs text-surface hover:bg-navy-deep"
        >
          Try again
        </button>
        <Link
          href="/school/login"
          className="rounded-[3px] border border-line bg-surface px-5 py-2.5 font-mono text-xs text-muted hover:border-navy hover:text-navy"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
