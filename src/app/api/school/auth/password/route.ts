import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSchoolSession } from "@/lib/school-session";

const CONNECTIVITY_TIMEOUT_MS = 3000;

async function isSupabaseReachable(): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient();
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), CONNECTIVITY_TIMEOUT_MS)),
    ]);
    return result !== "timeout";
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const session = await getSchoolSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // Password changes require an online connection — queued offline changes
  // create irreconcilable conflicts when the cloud reconnects.
  const online = await isSupabaseReachable();
  if (!online) {
    return NextResponse.json(
      {
        error: "Password changes require an internet connection.",
        offlineBlocked: true,
      },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const newPassword: string = body?.password ?? "";

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
