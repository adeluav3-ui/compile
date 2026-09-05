"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function SuperAdminSignOut() {
  const router = useRouter();

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/school/login");
  }

  return (
    <button
      onClick={signOut}
      className="font-mono text-xs text-muted transition-colors hover:text-navy"
    >
      Sign out
    </button>
  );
}
