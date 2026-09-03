import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  // Also clear demo cookie if present
  const store = await cookies();
  store.delete("school_session");

  return NextResponse.json({ ok: true });
}
