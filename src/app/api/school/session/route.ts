import { NextRequest, NextResponse } from "next/server";
import { encodeSession, SchoolSession } from "@/lib/school-session";

// POST — set session cookie (used by /school/login demo page)
export async function POST(req: NextRequest) {
  const session: SchoolSession = await req.json().catch(() => null);
  if (!session?.profileId || !session?.role) {
    return NextResponse.json({ error: "Invalid session." }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("school_session", encodeSession(session), {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: "lax",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("school_session");
  return res;
}
