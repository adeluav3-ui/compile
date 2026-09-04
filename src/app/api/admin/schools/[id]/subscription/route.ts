import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { schools } from "@/db/schema";
import { eq } from "drizzle-orm";

const SUPER_ADMIN_EMAIL = "adeluav3@gmail.com";

async function assertSuperAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== SUPER_ADMIN_EMAIL) throw new Error("Unauthorized");
}

// PATCH /api/admin/schools/[id]/subscription
// body: { action: "activate" | "extend" | "revoke", days?: number, expiresAt?: string }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await assertSuperAdmin();
    const { id } = await params;

    const { action, days, expiresAt } = (await request.json()) as {
      action: "activate" | "extend" | "revoke" | "forever";
      days?: number;
      expiresAt?: string;
    };

    const [current] = await db
      .select({ subscriptionExpiresAt: schools.subscriptionExpiresAt })
      .from(schools)
      .where(eq(schools.id, id))
      .limit(1);

    if (!current) {
      return NextResponse.json({ error: "School not found." }, { status: 404 });
    }

    if (action === "revoke") {
      await db
        .update(schools)
        .set({ subscriptionStatus: "expired", subscriptionExpiresAt: new Date() })
        .where(eq(schools.id, id));
      return NextResponse.json({ ok: true, status: "expired" });
    }

    if (action === "forever") {
      await db
        .update(schools)
        .set({ subscriptionStatus: "active", subscriptionExpiresAt: null })
        .where(eq(schools.id, id));
      return NextResponse.json({ ok: true, status: "active", expiresAt: null });
    }

    if (action === "extend" || action === "activate") {
      let newExpiry: Date;

      if (expiresAt) {
        newExpiry = new Date(expiresAt);
      } else {
        const base =
          current.subscriptionExpiresAt && current.subscriptionExpiresAt > new Date()
            ? current.subscriptionExpiresAt
            : new Date();
        newExpiry = new Date(base);
        newExpiry.setDate(newExpiry.getDate() + (days ?? 30));
      }

      await db
        .update(schools)
        .set({ subscriptionStatus: "active", subscriptionExpiresAt: newExpiry })
        .where(eq(schools.id, id));

      return NextResponse.json({
        ok: true,
        status: "active",
        expiresAt: newExpiry.toISOString(),
      });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
