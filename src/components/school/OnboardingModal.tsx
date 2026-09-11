"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingModal({
  hasOnboarded,
  hasActiveSubscription,
}: {
  hasOnboarded: boolean;
  hasActiveSubscription: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const router = useRouter();

  if (hasOnboarded || dismissed) return null;

  async function dismiss() {
    setDismissing(true);
    await fetch("/api/school/onboard", { method: "POST" }).catch(() => {});
    setDismissed(true);
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-[3px] border border-line bg-surface shadow-xl">
        <div className="p-6 sm:p-8">
          <div className="mb-1 font-mono text-xs uppercase tracking-widest text-brass">
            Welcome
          </div>
          <h2 className="mb-5 font-serif text-2xl font-semibold text-navy-deep">
            Getting started with Compile School Edition
          </h2>

          {/* YouTube embed */}
          <div className="relative mb-6 w-full overflow-hidden rounded-[3px] bg-navy-deep" style={{ paddingTop: "56.25%" }}>
            <iframe
              className="absolute inset-0 h-full w-full"
              src="https://www.youtube.com/embed/R8IsFr6tRtw"
              title="Compile School Edition — Getting Started"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          <p className="mb-6 text-sm leading-relaxed text-muted">
            Watch the video above to learn how to set up your school, add teachers and students,
            release lessons, and run assessments. You can also try the demo to see how it looks
            from a teacher or student&apos;s view.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {!hasActiveSubscription && (
              <a
                href="/school/payment"
                className="rounded-[3px] bg-navy px-5 py-2.5 font-mono text-sm text-surface transition-colors hover:bg-navy-deep"
              >
                Subscribe — ₦150,000/month →
              </a>
            )}

            <a
              href="/school/demo"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-[3px] border border-line px-5 py-2.5 font-mono text-sm text-ink transition-colors hover:border-navy"
            >
              Try the demo
            </a>

            <button
              onClick={dismiss}
              disabled={dismissing}
              className="rounded-[3px] px-5 py-2.5 font-mono text-sm text-muted transition-colors hover:text-navy disabled:opacity-50"
            >
              {dismissing ? "…" : "Dismiss"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
