import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SUPER_ADMIN_EMAIL = "adeluav3@gmail.com";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — must be called before any auth checks
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // /admin/* — super admin only
  if (pathname.startsWith("/admin")) {
    if (!user || user.email !== SUPER_ADMIN_EMAIL) {
      const url = request.nextUrl.clone();
      url.pathname = "/school/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // /school/dashboard/* — Supabase session OR demo cookie
  if (pathname.startsWith("/school/dashboard")) {
    const hasSupabaseSession = !!user;
    const hasDemoCookie = !!request.cookies.get("school_session")?.value;
    if (!hasSupabaseSession && !hasDemoCookie) {
      const url = request.nextUrl.clone();
      url.pathname = "/school/login";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/admin/:path*", "/school/dashboard/:path*"],
};
