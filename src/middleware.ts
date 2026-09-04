import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { schools, profiles, userRoles, teacherAssignments, studentClasses, classes } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export const runtime = "nodejs";

const SUPER_ADMIN_EMAIL = "adeluav3@gmail.com";
const SUB_CACHE_COOKIE = "compile_sub_v1";
const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

interface SubCache {
  schoolId: string;
  status: string;
  expiresAt: string | null;
  lastVerifiedAt: string;
}

function readSubCache(request: NextRequest): SubCache | null {
  const raw = request.cookies.get(SUB_CACHE_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf-8")) as SubCache;
  } catch {
    return null;
  }
}

function encodeSubCache(cache: SubCache): string {
  return Buffer.from(JSON.stringify(cache)).toString("base64");
}

function isActiveFromCache(cache: SubCache): boolean {
  if (cache.status === "trial") return true;
  if (cache.status === "expired") return false;
  if (cache.status === "active") {
    return !cache.expiresAt || new Date(cache.expiresAt) > new Date();
  }
  return false;
}

async function resolveSchoolIdForUser(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(
      and(
        eq(userRoles.profileId, userId),
        inArray(userRoles.role, ["school_admin", "teacher", "student"])
      )
    )
    .limit(1);

  if (!row) return null;

  if (row.role === "school_admin") {
    const [school] = await db
      .select({ id: schools.id })
      .from(schools)
      .where(eq(schools.adminId, userId))
      .limit(1);
    return school?.id ?? null;
  }

  if (row.role === "teacher") {
    const [assign] = await db
      .select({ schoolId: teacherAssignments.schoolId })
      .from(teacherAssignments)
      .where(eq(teacherAssignments.profileId, userId))
      .limit(1);
    return assign?.schoolId ?? null;
  }

  if (row.role === "student") {
    const [sc] = await db
      .select({ schoolId: classes.schoolId })
      .from(studentClasses)
      .innerJoin(classes, eq(studentClasses.classId, classes.id))
      .where(eq(studentClasses.profileId, userId))
      .limit(1);
    return sc?.schoolId ?? null;
  }

  return null;
}

async function fetchSubscriptionFromDb(schoolId: string): Promise<{ status: string; expiresAt: string | null } | null> {
  const [school] = await db
    .select({ status: schools.subscriptionStatus, expiresAt: schools.subscriptionExpiresAt })
    .from(schools)
    .where(eq(schools.id, schoolId))
    .limit(1);
  if (!school) return null;
  return {
    status: school.status,
    expiresAt: school.expiresAt ? school.expiresAt.toISOString() : null,
  };
}

function buildSuspendedRedirect(
  request: NextRequest,
  reason: "expired" | "unverifiable",
  cache: SubCache | null
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/school/suspended";
  url.searchParams.set("reason", reason);
  if (cache) {
    if (cache.status) url.searchParams.set("status", cache.status);
    if (cache.expiresAt) url.searchParams.set("expiresAt", cache.expiresAt);
    url.searchParams.set("lastVerified", cache.lastVerifiedAt);
  }
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_SUPABASE_ANON_KEY ?? "";
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── Super admin routes ──────────────────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (!user || user.email !== SUPER_ADMIN_EMAIL) {
      const url = request.nextUrl.clone();
      url.pathname = "/school/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // ── School routes ───────────────────────────────────────────────────────────
  const isSchoolDashboard = pathname.startsWith("/school/dashboard");
  const isSchoolApi = pathname.startsWith("/api/school");

  if (!isSchoolDashboard && !isSchoolApi) {
    return supabaseResponse;
  }

  const hasDemoCookie = !!request.cookies.get("school_session")?.value;

  // Demo sessions bypass subscription checks entirely
  if (!user && hasDemoCookie) {
    return supabaseResponse;
  }

  // No session at all → redirect to login (API routes get 401)
  if (!user) {
    if (isSchoolApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/school/login";
    return NextResponse.redirect(url);
  }

  // ── Subscription check for real Supabase sessions ───────────────────────────
  const cache = readSubCache(request);
  const now = new Date();
  const cacheAge = cache ? now.getTime() - new Date(cache.lastVerifiedAt).getTime() : Infinity;
  const needsRefresh = cacheAge > REFRESH_INTERVAL_MS;

  let resolvedCache: SubCache | null = cache;
  let dbReachable = true;

  if (needsRefresh) {
    try {
      const schoolId = cache?.schoolId ?? (await resolveSchoolIdForUser(user.id));
      if (!schoolId) {
        // Not a school user — let through (super admin using school routes, etc.)
        return supabaseResponse;
      }
      const sub = await fetchSubscriptionFromDb(schoolId);
      if (!sub) {
        // School record not found
        if (isSchoolApi) {
          return NextResponse.json({ error: "School not found" }, { status: 403 });
        }
        return buildSuspendedRedirect(request, "expired", cache);
      }
      resolvedCache = {
        schoolId,
        status: sub.status,
        expiresAt: sub.expiresAt,
        lastVerifiedAt: now.toISOString(),
      };
    } catch {
      dbReachable = false;
    }
  }

  // ── Evaluate subscription status ─────────────────────────────────────────────
  if (!dbReachable || resolvedCache === null) {
    // Can't reach DB and no usable cache
    if (!resolvedCache) {
      // Never verified at all — block
      if (isSchoolApi) {
        return NextResponse.json({ error: "Subscription unverifiable" }, { status: 503 });
      }
      return buildSuspendedRedirect(request, "unverifiable", null);
    }

    // Have a cache but DB was unreachable — check grace period
    const gracePeriodExceeded = cacheAge > GRACE_PERIOD_MS;
    if (gracePeriodExceeded) {
      if (isSchoolApi) {
        return NextResponse.json({ error: "Subscription unverifiable" }, { status: 503 });
      }
      return buildSuspendedRedirect(request, "unverifiable", resolvedCache);
    }

    // Within grace period — use cached value
    if (!isActiveFromCache(resolvedCache)) {
      if (isSchoolApi) {
        return NextResponse.json({ error: "Subscription expired" }, { status: 403 });
      }
      return buildSuspendedRedirect(request, "expired", resolvedCache);
    }

    // Graceful pass — don't update cookie since DB was unreachable
    return supabaseResponse;
  }

  // DB was reachable — check fresh/refreshed cache
  const isActive = isActiveFromCache(resolvedCache);

  if (!isActive) {
    if (isSchoolApi) {
      return NextResponse.json({ error: "Subscription expired" }, { status: 403 });
    }
    return buildSuspendedRedirect(request, "expired", resolvedCache);
  }

  // Active — write updated cache cookie to response
  const response = NextResponse.next({ request });
  // Copy over Supabase auth cookies
  supabaseResponse.cookies.getAll().forEach(({ name, value }) => {
    response.cookies.set(name, value);
  });
  response.cookies.set(SUB_CACHE_COOKIE, encodeSubCache(resolvedCache), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/school/dashboard/:path*", "/api/school/:path*"],
};
