"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

const ACCOUNTS = [
  {
    label: "Adebayo Okafor",
    sub: "Teacher — JSS1 A",
    session: {
      profileId: "a0000000-0000-0000-0000-000000000001",
      role: "teacher" as const,
      schoolId: "c0000000-0000-0000-0000-000000000001",
      classId: "d0000000-0000-0000-0000-000000000001",
      name: "Adebayo Okafor",
    },
    dest: "/school/dashboard/teacher" as const,
  },
  {
    label: "Chioma Eze",
    sub: "Student — JSS1 A",
    session: {
      profileId: "b0000000-0000-0000-0000-000000000001",
      role: "student" as const,
      schoolId: "c0000000-0000-0000-0000-000000000001",
      classId: "d0000000-0000-0000-0000-000000000001",
      name: "Chioma Eze",
    },
    dest: "/school/dashboard/student" as const,
  },
  {
    label: "Emeka Nwosu",
    sub: "Student — JSS1 A",
    session: {
      profileId: "b0000000-0000-0000-0000-000000000002",
      role: "student" as const,
      schoolId: "c0000000-0000-0000-0000-000000000001",
      classId: "d0000000-0000-0000-0000-000000000001",
      name: "Emeka Nwosu",
    },
    dest: "/school/dashboard/student" as const,
  },
  {
    label: "Mrs. Fatima Bello",
    sub: "School Admin — Greenfield Secondary",
    session: {
      profileId: "a0000000-0000-0000-0000-000000000002",
      role: "school_admin" as const,
      schoolId: "c0000000-0000-0000-0000-000000000001",
      name: "Mrs. Fatima Bello",
    },
    dest: "/school/dashboard/admin" as const,
  },
];

export default function SchoolDemo() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function login(account: (typeof ACCOUNTS)[0]) {
    setLoading(account.label);
    await fetch("/api/school/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(account.session),
    });
    router.push(account.dest);
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-paper px-6">
      <Link href="/" className="absolute left-4 top-4 font-mono text-xs text-muted hover:text-navy sm:left-6 sm:top-6">
        ← Back to home
      </Link>
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
        <span className="mb-2 block font-mono text-xs tracking-widest text-brass uppercase">
          School Edition — Live Demo
        </span>
        <h1 className="font-serif text-[28px] font-semibold text-navy-deep">
          Choose a demo account
        </h1>
        <p className="mt-2 text-sm text-muted">
          Explore the platform from any perspective.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        {ACCOUNTS.map((a) => (
          <button
            key={a.label}
            onClick={() => login(a)}
            disabled={loading !== null}
            className="flex w-full items-center justify-between rounded-[3px] border border-line bg-surface px-5 py-4 text-left transition-colors hover:border-navy disabled:opacity-60"
          >
            <div>
              <div className="text-sm font-semibold text-navy-deep">{a.label}</div>
              <div className="text-xs text-muted">{a.sub}</div>
            </div>
            {loading === a.label ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-line border-t-navy" />
            ) : (
              <span className="text-muted">→</span>
            )}
          </button>
        ))}
      </div>

      <p className="mt-8 font-mono text-xs text-muted">
        School already enrolled?{" "}
        <a href="/school/login" className="text-steel hover:underline">
          Sign in here →
        </a>
      </p>

    </div>
  );
}
