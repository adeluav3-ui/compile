import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  // next.config.ts maps NEXT_SUPABASE_URL → NEXT_PUBLIC_SUPABASE_URL at build time,
  // so both naming conventions work here.
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
