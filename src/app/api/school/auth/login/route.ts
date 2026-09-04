import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSchoolSession } from "@/lib/school-session";
import {
  cacheLocalCredential,
  verifyLocalCredential,
  issueLocalSessionToken,
  LOCAL_SESSION_COOKIE,
} from "@/lib/local-auth";

const LOCAL_TOKEN_MAX_AGE = 24 * 60 * 60; // 24 hours
const SUPABASE_TIMEOUT_MS = 3000;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email: string = body?.email?.trim().toLowerCase() ?? "";
  const password: string = body?.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  // ── 1. Try Supabase with a 3-second timeout ────────────────────────────────
  let supabaseResult: Awaited<ReturnType<
    Awaited<ReturnType<typeof createSupabaseServerClient>>["auth"]["signInWithPassword"]
  >> | null = null;
  let timedOut = false;

  try {
    const supabase = await createSupabaseServerClient();
    const raceResult = await Promise.race([
      supabase.auth.signInWithPassword({ email, password }),
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

  // ── 2. Online login succeeded ──────────────────────────────────────────────
  if (supabaseResult && !supabaseResult.error && supabaseResult.data.user) {
    // Resolve school session for role/class info needed to cache credential
    const session = await getSchoolSession();
    if (session) {
      // Cache credential in the background — don't block the login response
      cacheLocalCredential(supabaseResult.data.user.id, email, password, {
        role: session.role,
        schoolId: session.schoolId,
        classId: session.classId,
        name: session.name,
      }).catch(() => {
        // Local cache failure is non-fatal
      });
    }

    return NextResponse.json({ ok: true, redirectTo: "/school/auth/redirect" });
  }

  // ── 3. Online login failed (wrong password / account issue) ───────────────
  if (supabaseResult?.error && !timedOut) {
    // Supabase was reachable but rejected the credentials.
    // Do NOT fall back to local — the cloud explicitly said no.
    return NextResponse.json(
      { error: supabaseResult.error.message },
      { status: 401 }
    );
  }

  // ── 4. Offline / timeout — try local credential cache ─────────────────────
  const localSession = await verifyLocalCredential(email, password);

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
