import Link from "next/link";
import Image from "next/image";

interface Props {
  searchParams: Promise<{
    reason?: string;
    status?: string;
    expiresAt?: string;
    lastVerified?: string;
  }>;
}

export default async function SubscriptionSuspendedPage({ searchParams }: Props) {
  const params = await searchParams;
  const reason = params.reason === "unverifiable" ? "unverifiable" : "expired";

  const lastVerifiedDate = params.lastVerified
    ? new Date(params.lastVerified).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const expiryDate = params.expiresAt
    ? new Date(params.expiresAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const isUnverifiable = reason === "unverifiable";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-paper px-6">
      <Link
        href="/"
        className="absolute left-4 top-4 font-mono text-xs text-muted hover:text-navy sm:left-6 sm:top-6"
      >
        ← Back to home
      </Link>

      <div className="w-full max-w-md text-center">
        <Link href="/">
          <Image
            src="/images/compile-lockup-navy.svg"
            alt="Compile"
            width={120}
            height={50}
            className="mx-auto mb-8 h-10 w-auto"
          />
        </Link>

        <div className="rounded-[3px] border border-line bg-surface p-8">
          {isUnverifiable ? (
            <>
              <span className="mb-4 inline-block rounded-[2px] bg-amber-50 px-3 py-1 font-mono text-xs uppercase tracking-widest text-amber-700">
                Cannot verify access
              </span>

              <h1 className="mt-3 font-serif text-2xl font-semibold text-navy-deep">
                Subscription status unverifiable
              </h1>

              <p className="mt-4 text-sm leading-relaxed text-muted">
                This device has been offline for too long to confirm your school&apos;s subscription
                is still active. Access has been paused as a precaution.
              </p>

              {lastVerifiedDate && (
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Last verified online: <span className="text-ink">{lastVerifiedDate}</span>
                </p>
              )}

              <p className="mt-3 text-sm leading-relaxed text-muted">
                Connect this device to the internet and sign in again — access will be
                restored immediately if the subscription is still active.
              </p>

              <div className="mt-8 space-y-3">
                <Link
                  href="/school/login"
                  className="flex w-full items-center justify-center rounded-[3px] bg-navy py-3 font-mono text-sm text-surface hover:bg-navy-deep"
                >
                  Sign in to verify →
                </Link>
                <a
                  href="https://wa.me/2348139672432"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center rounded-[3px] border border-line bg-surface py-3 font-mono text-sm text-muted hover:border-navy hover:text-navy"
                >
                  Contact support on WhatsApp
                </a>
              </div>
            </>
          ) : (
            <>
              <span className="mb-4 inline-block rounded-[2px] bg-[#FEF2F2] px-3 py-1 font-mono text-xs uppercase tracking-widest text-[#991B1B]">
                Access suspended
              </span>

              <h1 className="mt-3 font-serif text-2xl font-semibold text-navy-deep">
                Your school&apos;s subscription has expired
              </h1>

              <p className="mt-4 text-sm leading-relaxed text-muted">
                Access to the Compile School Edition platform has been paused because
                your school&apos;s subscription is no longer active.
              </p>

              {expiryDate && (
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Expired: <span className="text-ink">{expiryDate}</span>
                </p>
              )}

              <p className="mt-3 text-sm leading-relaxed text-muted">
                Please contact us to renew and restore access for your teachers and students.
              </p>

              <div className="mt-8 space-y-3">
                <a
                  href="https://wa.me/2348139672432"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-[3px] bg-navy py-3 font-mono text-sm text-surface hover:bg-navy-deep"
                >
                  Chat on WhatsApp →
                </a>
                <a
                  href="mailto:hello@compileschool.ng"
                  className="flex w-full items-center justify-center rounded-[3px] border border-line bg-surface py-3 font-mono text-sm text-muted hover:border-navy hover:text-navy"
                >
                  Send an email
                </a>
              </div>
            </>
          )}
        </div>

        <p className="mt-6 font-mono text-xs text-muted">
          Already renewed?{" "}
          <Link href="/school/login" className="text-steel hover:underline">
            Sign in again →
          </Link>
        </p>
      </div>
    </div>
  );
}
