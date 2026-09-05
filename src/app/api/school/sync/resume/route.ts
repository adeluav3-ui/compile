import { NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/school-session";
import { resumePendingDownloads } from "@/lib/video-sync";

/**
 * POST /api/school/sync/resume
 *
 * Called by the Electron shell when the host machine regains network
 * connectivity. Starts downloading all lessons that are in "pending" or
 * "error" state in the background. Returns immediately — callers should
 * poll /api/school/sync/status to track progress.
 */
export async function POST() {
  const session = await getSchoolSession();
  if (!session || (session.role !== "teacher" && session.role !== "school_admin")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!process.env.LOCAL_DB_PATH) {
    return NextResponse.json({ ok: true, started: [], skipped: 0, note: "Not an offline build." });
  }

  const result = await resumePendingDownloads();

  return NextResponse.json({
    ok: true,
    started: result.started,
    skipped: result.skipped,
  });
}
