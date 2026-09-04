"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = {
  name: string;
  role: "teacher" | "student" | "school_admin";
  isReal?: boolean;
};

const ROLE_LABEL: Record<string, string> = {
  teacher: "Teacher",
  student: "Student",
  school_admin: "Admin",
};

const ROLE_STYLE: Record<string, string> = {
  teacher: "bg-navy-deep/10 text-navy-deep",
  student: "bg-steel/10 text-steel",
  school_admin: "bg-brass/10 text-brass",
};

export default function DashboardHeader({ name, role, isReal }: Props) {
  const router = useRouter();

  async function switchAccount() {
    if (isReal) {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      await fetch("/api/school/auth/signout", { method: "POST" });
      router.push("/school/login");
    } else {
      router.push("/school/demo");
    }
  }

  return (
    <header className="border-b border-line bg-surface">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs tracking-widest text-brass uppercase">Compile</span>
          <span className="hidden text-line sm:inline">|</span>
          <span className="hidden text-sm text-muted sm:inline">School Edition</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="max-w-[120px] truncate text-sm font-semibold text-navy-deep sm:max-w-none">
              {name}
            </span>
            <span className={`hidden rounded px-2 py-0.5 font-mono text-xs sm:inline ${ROLE_STYLE[role]}`}>
              {ROLE_LABEL[role]}
            </span>
          </div>
          <button
            onClick={switchAccount}
            className="rounded-[3px] border border-line bg-paper px-3 py-1.5 font-mono text-xs text-muted hover:border-navy hover:text-navy"
          >
            {isReal ? "Sign out" : "← Switch account"}
          </button>
        </div>
      </div>
    </header>
  );
}
