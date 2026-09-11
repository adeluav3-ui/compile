import { NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/school-session";
import { db } from "@/db";
import { schools } from "@/db/schema";
import { eq } from "drizzle-orm";

// POST /api/school/onboard — mark school as onboarded (dismisses intro modal)
export async function POST() {
  const session = await getSchoolSession();
  if (!session || session.role !== "school_admin") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await db
    .update(schools)
    .set({ onboardedAt: new Date() })
    .where(eq(schools.id, session.schoolId));

  return NextResponse.json({ ok: true });
}
