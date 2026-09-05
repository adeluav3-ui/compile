import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSchoolSession } from "@/lib/school-session";
import {
  cacheLocalCredential,
  verifyLocalCredential,
  issueLocalSessionToken,
  LOCAL_SESSION_COOKIE,
} from "@/lib/local-auth";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

const LOCAL_TOKEN_MAX_AGE = 24 * 60 * 60; // 24 hours
const SUPABASE_TIMEOUT_MS = 3000;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const identifier: string = body?.identifier?.trim() ?? "";
  const password: string = body?.password ?? "";

  if (!identifier || !password) {
    return NextResponse.json({ error: "Identifier and password are required." }, { status: 400 });
  }

  const isEmail = identifier.includes("@");
  const normalized = identifier.toLowerCase();

  // Resolve email from username when needed (Supabase Auth requires email)
  let resolvedEmail = isEmail ? normalized : null;
  const resolvedUsername: string | undefined = isEmail ? undefined : normalized;

  if (!isEmail) {
    try {
      const row = await db
        .select({ email: profiles.email })
        .from(profiles)
        .where(eq(profiles.username, normalized))
        .limit(1);

      if (row[0]) {
        resolvedEmail = row[0].email.toLowerCase();
      }
    } catch {
      // DB unreachable — fall through to offline path
    }
  }

  // ── 1. Try Supabase with a 3-second timeout ────────────────────────────────
  let supabaseResult: Awaited<ReturnType<
    Awaited<ReturnType<typeof createSupabaseServerClient>>["auth"]["signInWithPassword"]
  >> | null = null;
  let timedOut = false;

  if (resolvedEmail) {
    try {
      const supabase = await createSupabaseServerClient();
      const raceResult = await Promise.race([
        supabase.auth.signInWithPassword({ email: resolvedEmail, password }),
        new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), SUPABASE_TIMEOUT_MS)),
      ]);

      if (raceResult === "timeout") {
        timedOut = true;
      } else {
        supabaseResult = raceResult;
      }
    } catch {
      timedOut = true;
    }
  } else {
    // Username provided but no matching profile found in DB — treat as offline
    timedOut = true;
  }

  // ── 2. Online login succeeded ──────────────────────────────────────────────
  if (supabaseResult && !supabaseResult.error && supabaseResult.data.user) {
    const session = await getSchoolSession();
    if (session && resolvedEmail) {
      cacheLocalCredential(
        supabaseResult.data.user.id,
        resolvedEmail,
        password,
        { role: session.role, schoolId: session.schoolId, classId: session.classId, name: session.name },
        resolvedUsername,
      ).catch(() => {});
    }

    return NextResponse.json({ ok: true, redirectTo: "/school/auth/redirect" });
  }

  // ── 3. Online login failed (wrong password / account issue) ───────────────
  if (supabaseResult?.error && !timedOut) {
    return NextResponse.json({ error: supabaseResult.error.message }, { status: 401 });
  }

  // ── 4. Offline / timeout — try local credential cache ─────────────────────
  const localSession = await verifyLocalCredential(identifier, password);

  if (!localSession) {
    const dbAvailable = !!process.env.LOCAL_DB_PATH;
    return NextResponse.json(
      {
        error: dbAvailable
          ? "No internet connection. Sign in online at least once to enable offline access."
          : "Cannot connect to the authentication server. Please check your internet connection.",
        offline: true,
      },
      { status: 401 }
    );
  }

  // ── 5. Issue local session token ───────────────────────────────────────────
  const token = await issueLocalSessionToken(localSession);
  if (!token) {
    return NextResponse.json({ error: "Local auth unavailable." }, { status: 503 });
  }

  const redirectTo =
    localSession.role === "teacher"
      ? "/school/dashboard/teacher"
      : localSession.role === "school_admin"
        ? "/school/dashboard/admin"
        : "/school/dashboard/student";

  const res = NextResponse.json({ ok: true, redirectTo, offline: true });
  res.cookies.set(LOCAL_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: LOCAL_TOKEN_MAX_AGE,
  });
  return res;
}
