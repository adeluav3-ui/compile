export const dynamic = "force-dynamic";

import { db } from "@/db";
import { schools, profiles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  trial: "bg-brass/10 text-brass",
  expired: "bg-[#FEF2F2] text-[#991B1B]",
};

function daysDiff(date: Date | null, status: string): string {
  if (status === "active" && !date) return "Forever";
  if (!date) return "—";
  const diff = Math.ceil((date.getTime() - Date.now()) / 86400000);
  if (diff < 0) return `Expired ${Math.abs(diff)}d ago`;
  if (diff === 0) return "Expires today";
  return `${diff}d remaining`;
}

export default async function AdminDashboard() {
  const rows = await db
    .select({
      id: schools.id,
      name: schools.name,
      state: schools.state,
      subscriptionStatus: schools.subscriptionStatus,
      subscriptionExpiresAt: schools.subscriptionExpiresAt,
      adminEmail: profiles.email,
      adminName: profiles.fullName,
      createdAt: schools.createdAt,
    })
    .from(schools)
    .leftJoin(profiles, eq(schools.adminId, profiles.id))
    .orderBy(desc(schools.createdAt));

  const statusCounts = {
    active: rows.filter((r) => r.subscriptionStatus === "active").length,
    trial: rows.filter((r) => r.subscriptionStatus === "trial").length,
    expired: rows.filter((r) => r.subscriptionStatus === "expired").length,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-navy-deep">Schools</h1>
          <p className="mt-1 text-sm text-muted">
            {rows.length} school{rows.length !== 1 ? "s" : ""} on the platform
          </p>
        </div>
        <Link
          href="/admin/schools/new"
          className="self-start rounded-[3px] bg-navy px-5 py-2.5 font-mono text-sm text-surface transition-colors hover:bg-navy-deep sm:self-auto"
        >
          + Onboard new school
        </Link>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active", value: statusCounts.active, color: "text-emerald-700" },
          { label: "Trial", value: statusCounts.trial, color: "text-brass" },
          { label: "Expired", value: statusCounts.expired, color: "text-[#991B1B]" },
        ].map((s) => (
          <div key={s.label} className="rounded-[3px] border border-line bg-surface p-5 text-center">
            <div className={`font-serif text-4xl font-semibold ${s.color}`}>{s.value}</div>
            <div className="mt-1 font-mono text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Schools table */}
      {rows.length === 0 ? (
        <div className="rounded-[3px] border border-line bg-surface p-10 text-center">
          <p className="text-muted">No schools yet. Onboard your first school above.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[3px] border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-paper">
              <tr>
                {["School", "State", "Admin", "Status", "Expiry", ""].map((h) => (
                  <th
                    key={h}
                    className="border-b border-line px-5 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((school) => (
                <tr
                  key={school.id}
                  className="border-b border-line last:border-b-0 hover:bg-paper/60"
                >
                  <td className="px-5 py-4">
                    <div className="font-semibold text-navy-deep">{school.name}</div>
                  </td>
                  <td className="px-5 py-4 text-muted">{school.state ?? "—"}</td>
                  <td className="px-5 py-4">
                    <div className="text-ink">{school.adminName ?? "—"}</div>
                    <div className="font-mono text-xs text-muted">{school.adminEmail ?? "—"}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-[2px] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${STATUS_BADGE[school.subscriptionStatus] ?? "text-muted"}`}
                    >
                      {school.subscriptionStatus}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-muted">
                    {daysDiff(school.subscriptionExpiresAt, school.subscriptionStatus)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/admin/schools/${school.id}`}
                      className="font-mono text-xs text-steel hover:underline"
                    >
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
