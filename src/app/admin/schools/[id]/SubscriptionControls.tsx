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
  const [customDays, setCustomDays] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  async function patch(action: string, extra?: Record<string, unknown>) {
    setLoading(action);
    setError("");
    const res = await fetch(`/api/admin/schools/${schoolId}/subscription`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
    } else {
      router.refresh();
    }
  }

  function applyCustom() {
    const days = parseInt(customDays, 10);
    if (!days || days < 1) { setError("Enter a valid number of days."); return; }
    const action = currentStatus === "active" ? "extend" : "activate";
    patch(action, { days });
    setShowCustom(false);
    setCustomDays("");
  }

  const isActive = currentStatus === "active";
  const isTrial = currentStatus === "trial";

  return (
    <div className="space-y-4">
      {/* Activate section — for trial or expired */}
      {!isActive && (
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted">
            Activate subscription
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => patch("activate", { days: 30 })}
              disabled={loading !== null}
              className="rounded-[3px] bg-emerald-600 px-4 py-2 font-mono text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading === "activate" ? "Activating…" : "1 month"}
            </button>
            <button
              onClick={() => patch("activate", { days: 365 })}
              disabled={loading !== null}
              className="rounded-[3px] bg-emerald-600 px-4 py-2 font-mono text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              1 year
            </button>
            <button
              onClick={() => { if (!confirm("Activate this school forever with no expiry?")) return; patch("forever"); }}
              disabled={loading !== null}
              className="rounded-[3px] bg-navy px-4 py-2 font-mono text-xs text-surface hover:bg-navy-deep disabled:opacity-50"
            >
              {loading === "forever" ? "Saving…" : "Forever"}
            </button>
            <button
              onClick={() => setShowCustom((v) => !v)}
              disabled={loading !== null}
              className="rounded-[3px] border border-line bg-surface px-4 py-2 font-mono text-xs text-muted hover:border-navy hover:text-navy disabled:opacity-50"
            >
              Custom…
            </button>
          </div>
        </div>
      )}

      {/* Extend section — for active */}
      {isActive && (
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted">
            Extend subscription
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => patch("extend", { days: 30 })}
              disabled={loading !== null}
              className="rounded-[3px] border border-line bg-surface px-4 py-2 font-mono text-xs text-navy hover:border-navy disabled:opacity-50"
            >
              + 1 month
            </button>
            <button
              onClick={() => patch("extend", { days: 365 })}
              disabled={loading !== null}
              className="rounded-[3px] border border-line bg-surface px-4 py-2 font-mono text-xs text-navy hover:border-navy disabled:opacity-50"
            >
              + 1 year
            </button>
            <button
              onClick={() => { if (!confirm("Remove expiry and keep this school active forever?")) return; patch("forever"); }}
              disabled={loading !== null}
              className="rounded-[3px] border border-navy bg-navy/5 px-4 py-2 font-mono text-xs text-navy hover:bg-navy/10 disabled:opacity-50"
            >
              {loading === "forever" ? "Saving…" : "Set forever"}
            </button>
            <button
              onClick={() => setShowCustom((v) => !v)}
              disabled={loading !== null}
              className="rounded-[3px] border border-line bg-surface px-4 py-2 font-mono text-xs text-muted hover:border-navy hover:text-navy disabled:opacity-50"
            >
              Custom days…
            </button>
          </div>
        </div>
      )}

      {/* Custom days input */}
      {showCustom && (
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            value={customDays}
            onChange={(e) => setCustomDays(e.target.value)}
            placeholder="e.g. 60"
            className="w-28 rounded-[3px] border border-line bg-paper px-3 py-2 font-mono text-sm text-ink focus:border-navy focus:outline-none"
          />
          <span className="font-mono text-xs text-muted">days</span>
          <button
            onClick={applyCustom}
            disabled={loading !== null}
            className="rounded-[3px] bg-navy px-4 py-2 font-mono text-xs text-surface hover:bg-navy-deep disabled:opacity-50"
          >
            Apply
          </button>
          <button
            onClick={() => { setShowCustom(false); setCustomDays(""); }}
            className="font-mono text-xs text-muted hover:text-ink"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Revoke — always available when not expired */}
      {currentStatus !== "expired" && (
        <div className="border-t border-line pt-4">
          <button
            onClick={() => { if (!confirm("Revoke this school's access immediately?")) return; patch("revoke"); }}
            disabled={loading !== null}
            className="rounded-[3px] border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-2 font-mono text-xs text-[#991B1B] hover:bg-[#FEE2E2] disabled:opacity-50"
          >
            {loading === "revoke" ? "Revoking…" : "Revoke access"}
          </button>
          {isTrial && (
            <p className="mt-1.5 font-mono text-[10px] text-muted">
              This will set status to expired immediately.
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="font-mono text-xs text-[#991B1B]">{error}</p>
      )}
    </div>
  );
}
