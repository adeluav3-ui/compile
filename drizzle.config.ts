import type { Config } from "drizzle-kit";

// drizzle-kit push requires a direct Postgres connection (port 5432), NOT the
// Supabase transaction-mode pooler (port 6543). Set DIRECT_DATABASE_URL to
// the "Direct connection" URI from Supabase Dashboard → Settings → Database.
// Fall back to DATABASE_URL for environments where the direct URL is the same.
const migrationUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL!;

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl,
  },
} satisfies Config;
