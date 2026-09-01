import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { schools } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * License check endpoint — called by the Electron app on a daily interval.
 * On success, returns the school's video decryption key and a timestamp.
 * The Electron app stores lastCheckedAt in local SQLite; playback is gated
 * on this timestamp being < 7 days old (see src/lib/license.ts).
 */
export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const licenseKey = req.nextUrl.searchParams.get("licenseKey");

  if (!schoolId || !licenseKey) {
    return NextResponse.json({ error: "schoolId and licenseKey are required." }, { status: 400 });
  }

  const [school] = await db.select().from(schools).where(eq(schools.id, schoolId));

  if (!school || school.licenseKey !== licenseKey) {
    return NextResponse.json({ error: "Invalid license." }, { status: 403 });
  }

  const now = new Date();
  const isActive =
    school.subscriptionStatus === "active" &&
    (!school.subscriptionExpiresAt || school.subscriptionExpiresAt > now);

  if (!isActive) {
    return NextResponse.json(
      { error: "Subscription expired. Renew to restore access." },
      { status: 402 }
    );
  }

  // The video encryption key is stored as part of the school's license key
  // in a real deployment this would be a separate field; returning a derived
  // value here so the grace-period flow can be demonstrated end-to-end.
  return NextResponse.json({
    ok: true,
    checkedAt: now.toISOString(),
    // In production: return school.videoKey (stored encrypted in Supabase)
    videoKey: process.env.SCHOOL_VIDEO_KEY ?? "demo-key-not-for-production",
  });
}
