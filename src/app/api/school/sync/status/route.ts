import { NextRequest, NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/school-session";
import { getVideoSyncStates } from "@/lib/video-sync";

export async function GET(req: NextRequest) {
  const session = await getSchoolSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const lessonIds = searchParams.getAll("id");

  if (lessonIds.length === 0) {
    return NextResponse.json({ statuses: {} });
  }

  const statuses = getVideoSyncStates(lessonIds);

  return NextResponse.json({
    statuses: Object.fromEntries(
      Object.entries(statuses).map(([id, s]) => [
        id,
        {
          status: s.status,
          progressPct: s.progressPct,
          errorText: s.errorText,
          updatedAt: s.updatedAt,
        },
      ])
    ),
  });
}
