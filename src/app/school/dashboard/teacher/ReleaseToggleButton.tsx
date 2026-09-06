"use client";

import { useState, useEffect, useRef } from "react";

type VideoStatus =
  | "pending"
  | "downloading"
  | "ready"
  | "degraded_online_only"
  | "error"
  | null;

export default function ReleaseToggleButton({
  lessonId,
  classId,
  initialReleased,
  initialVideoStatus = null,
  initialProgressPct = 0,
  isOfflineBuild = false,
}: {
  lessonId: string;
  classId: string;
  initialReleased: boolean;
  initialVideoStatus?: VideoStatus;
  initialProgressPct?: number;
  isOfflineBuild?: boolean;
}) {
  const [released, setReleased] = useState(initialReleased);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<VideoStatus>(initialVideoStatus);
  const [progressPct, setProgressPct] = useState(initialProgressPct);
  const [showOnlinePlayer, setShowOnlinePlayer] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const isDownloading = videoStatus === "downloading";
  const shouldPoll = released && isOfflineBuild && videoStatus !== null && videoStatus !== "ready";

  useEffect(() => {
    if (!shouldPoll) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }

    const interval = isDownloading ? 2000 : 5000;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/school/sync/status?id=${lessonId}`);
        if (!res.ok) return;
        const data = await res.json();
        const entry = data.statuses?.[lessonId];
        if (!entry) return;
        const s = entry.status as VideoStatus;
        const pct = (entry.progressPct as number) ?? 0;
        if (s && s !== videoStatus) setVideoStatus(s);
        setProgressPct(pct);
      } catch { /* non-fatal */ }
    }, interval);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPoll, isDownloading, lessonId]);

  async function toggle() {
    setLoading(true);
    setShowOnlinePlayer(false);
    setError(null);
    try {
      const res = await fetch(`/api/school/lessons/${lessonId}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong — try again.");
        return;
      }
      setReleased(data.released);
      if (data.released) {
        setVideoStatus((data.videoStatus as VideoStatus) ?? null);
        setProgressPct(0);
      } else {
        setVideoStatus(null);
        setProgressPct(0);
      }
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Status row content ──────────────────────────────────────────────────────
  function renderStatusRow() {
    if (!released) return null;

    // Cloud build — students stream over the internet
    if (!isOfflineBuild) {
      return (
        <p className="font-mono text-xs text-muted">
          Released — students can access this lesson online
        </p>
      );
    }

    // Offline build states
    if (videoStatus === "ready") {
      return (
        <p className="font-mono text-xs text-navy-deep">
          ✓ Saved for offline viewing
        </p>
      );
    }

    if (videoStatus === "pending") {
      return (
        <p className="font-mono text-xs text-muted">
          Queued — will download when internet is available
        </p>
      );
    }

    if (videoStatus === "degraded_online_only" || videoStatus === "error") {
      return (
        <p className="font-mono text-xs text-[#B45309]">
          Download failed after retries · streaming online for now
        </p>
      );
    }

    if (videoStatus === "downloading") {
      return (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs text-muted">
              Downloading for offline…
            </p>
            {progressPct > 0 && (
              <span className="font-mono text-xs font-semibold text-navy-deep">
                {progressPct}%
              </span>
            )}
          </div>
          {/* Progress bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-navy transition-all duration-500 ease-out"
              style={{ width: `${progressPct > 0 ? progressPct : 6}%` }}
            />
          </div>
        </div>
      );
    }

    // null state on offline build — status unknown (e.g. just installed)
    return (
      <p className="font-mono text-xs text-muted">
        Video status unknown — try refreshing
      </p>
    );
  }

  const showViewOnline =
    released && isOfflineBuild && videoStatus !== null && videoStatus !== "ready";

  return (
    <div className="space-y-2">
      {/* ── Toggle + View Online ── */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={toggle}
          disabled={loading}
          className={`flex items-center gap-2 rounded-[3px] px-3 py-1.5 font-mono text-xs transition-colors disabled:opacity-50 ${
            released
              ? "bg-navy-deep text-surface hover:bg-navy"
              : "border border-line text-muted hover:border-navy hover:text-navy"
          }`}
        >
          {loading ? (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
          ) : (
            <span className={`inline-block h-2 w-2 rounded-full ${released ? "bg-surface" : "bg-line"}`} />
          )}
          {released ? "Released" : "Locked"}
        </button>

        {isDownloading && (
          <span className="inline-block h-3 w-3 animate-spin rounded-full border border-navy border-t-transparent" />
        )}

        {showViewOnline && (
          <button
            onClick={() => setShowOnlinePlayer((p) => !p)}
            className="font-mono text-xs text-steel underline-offset-2 hover:underline"
          >
            {showOnlinePlayer ? "Hide player" : "View Online"}
          </button>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <p className="font-mono text-xs text-[#B45309]">{error}</p>
      )}

      {/* ── Status / progress row (always visible when released) ── */}
      {renderStatusRow()}

      {/* ── View Online inline player ── */}
      {showOnlinePlayer && (
        <div className="overflow-hidden rounded-[3px] border border-line bg-surface">
          <video
            className="w-full"
            controls
            autoPlay={false}
            src={`/api/school/video/${lessonId}?mode=online`}
          />
          <p className="px-3 py-1.5 font-mono text-xs text-muted">
            Streaming live — local copy still downloading in the background.
          </p>
        </div>
      )}
    </div>
  );
}
