"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

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

export default function SchoolLogin() {
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6">
      <div className="mb-10 text-center">
        <Image
          src="/images/compile-lockup-navy.svg"
          alt="Compile"
          width={120}
          height={50}
          className="mx-auto mb-6 h-10 w-auto"
        />
        <span className="mb-2 block font-mono text-xs tracking-widest text-brass uppercase">
          School Edition — Demo
        </span>
        <h1 className="font-serif text-[28px] font-semibold text-navy-deep">
          Choose a demo account
        </h1>
        <p className="mt-2 text-sm text-muted">
          This is a demo login. Production will use Supabase Auth.
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
    </div>
  );
}
