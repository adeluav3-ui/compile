import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LOCAL_SESSION_COOKIE } from "@/lib/local-auth";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Supabase may be unreachable when signing out offline — that's fine
  }

  const res = NextResponse.json({ ok: true });
  // Clear all session types
  res.cookies.delete("school_session");
  res.cookies.delete(LOCAL_SESSION_COOKIE);
  return res;
}
