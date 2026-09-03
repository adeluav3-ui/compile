import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Support Vercel env vars saved without the NEXT_PUBLIC_ prefix.
  // next.config runs at build time so process.env is available here.
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_SUPABASE_ANON_KEY ?? "",
  },
};

export default nextConfig;
