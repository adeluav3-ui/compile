import { getSchoolSession } from "@/lib/school-session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { schools, profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import PaymentClient from "./PaymentClient";

export default async function PaymentPage() {
  const session = await getSchoolSession();
  if (!session || session.role !== "school_admin") {
    redirect("/school/login?next=/school/payment");
  }

  const [[school], [profile]] = await Promise.all([
    db.select().from(schools).where(eq(schools.id, session.schoolId)),
    db.select({ email: profiles.email }).from(profiles).where(eq(profiles.id, session.profileId)),
  ]);

  if (!school) redirect("/school/dashboard/admin");

  const isActive =
    school.subscriptionStatus === "active" &&
    (!school.subscriptionExpiresAt || school.subscriptionExpiresAt > new Date());

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-paper px-6 py-12">
      <Link
        href="/school/dashboard/admin"
        className="absolute left-4 top-4 font-mono text-xs text-muted hover:text-navy sm:left-6 sm:top-6"
      >
        ← Back to dashboard
      </Link>

      <div className="w-full max-w-md">
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
            School Subscription
          </span>
          <h1 className="font-serif text-[28px] font-semibold text-navy-deep">
            {isActive ? "Renew your subscription" : "Activate your subscription"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            Full access to Compile School Edition for 30 days.
          </p>
        </div>

        <PaymentClient
          schoolName={school.name}
          email={profile?.email ?? session.name}
          isRenewal={isActive}
          currentExpiry={school.subscriptionExpiresAt?.toISOString() ?? null}
        />

        <p className="mt-6 text-center font-mono text-xs text-muted">
          Questions?{" "}
          <a href="mailto:compile100@gmail.com" className="text-steel hover:underline">
            compile100@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}
