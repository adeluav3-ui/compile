"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  schoolId: string;
  currentStatus: string;
};

export default function SubscriptionControls({ schoolId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function patch(action: string, extra?: Record<string, unknown>) {
    setLoading(action);
    setError("");
    const res = await fetch(`/api/admin/schools/${schoolId}/subscription`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
    } else {
      router.refresh();
    }
    setLoading(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => patch("extend", { days: 30 })}
          disabled={loading !== null}
          className="rounded-[3px] border border-line bg-surface px-4 py-2 font-mono text-xs text-navy transition-colors hover:border-navy disabled:opacity-50"
        >
          {loading === "extend" ? "Extending…" : "+ 30 days"}
        </button>
        <button
          onClick={() => patch("extend", { days: 90 })}
          disabled={loading !== null}
          className="rounded-[3px] border border-line bg-surface px-4 py-2 font-mono text-xs text-navy transition-colors hover:border-navy disabled:opacity-50"
        >
          {loading === "extend" ? "Extending…" : "+ 90 days"}
        </button>
        <button
          onClick={() => patch("extend", { days: 365 })}
          disabled={loading !== null}
          className="rounded-[3px] border border-line bg-surface px-4 py-2 font-mono text-xs text-navy transition-colors hover:border-navy disabled:opacity-50"
        >
          + 1 year
        </button>
        {currentStatus !== "expired" && (
          <button
            onClick={() => {
              if (!confirm("Revoke this school's access immediately?")) return;
              patch("revoke");
            }}
            disabled={loading !== null}
            className="rounded-[3px] border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-2 font-mono text-xs text-[#991B1B] transition-colors hover:bg-[#FEE2E2] disabled:opacity-50"
          >
            {loading === "revoke" ? "Revoking…" : "Revoke access"}
          </button>
        )}
        {currentStatus === "expired" && (
          <button
            onClick={() => patch("activate", { days: 30 })}
            disabled={loading !== null}
            className="rounded-[3px] bg-emerald-600 px-4 py-2 font-mono text-xs text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            Reactivate (30 days)
          </button>
        )}
      </div>
      {error && (
        <p className="font-mono text-xs text-[#991B1B]">{error}</p>
      )}
    </div>
  );
}
