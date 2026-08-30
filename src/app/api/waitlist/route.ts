import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { waitlist } from "@/db/schema";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body || !body.email || !body.source) {
    return NextResponse.json({ error: "Email and source are required." }, { status: 400 });
  }

  const email = String(body.email).toLowerCase().trim();
  const whatsapp = body.whatsapp ? String(body.whatsapp).trim() : null;
  const source = body.source;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  if (!["individual_course", "school_edition"].includes(source)) {
    return NextResponse.json({ error: "Invalid source." }, { status: 400 });
  }

  try {
    await db.insert(waitlist).values({ email, whatsapp, source }).onConflictDoNothing();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
