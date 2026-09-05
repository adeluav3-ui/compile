"use client";

import { useState, useEffect, useRef } from "react";

type VideoStatus =
  | "pending"
  | "downloading"
  | "ready"
  | "degraded_online_only"
  | "error"
  | null;

function statusLabel(status: NonNullable<Exclude<VideoStatus, "ready">>): string {
  if (status === "degraded_online_only" || status === "error") return "Still processing.";
  if (status === "pending") return "Waiting for internet…";
  return "Downloading…";
}

function statusColor(status: NonNullable<Exclude<VideoStatus, "ready">>): string {
  if (status === "degraded_online_only" || status === "error") return "text-[#B45309]";
  return "text-muted";
}

export default function ReleaseToggleButton({
  lessonId,
  classId,
  initialReleased,
  initialVideoStatus = null,
}: {
  lessonId: string;
  classId: string;
  initialReleased: boolean;
  initialVideoStatus?: VideoStatus;
}) {
  const [released, setReleased] = useState(initialReleased);
  const [loading, setLoading] = useState(false);
  const [videoStatus, setVideoStatus] = useState<VideoStatus>(initialVideoStatus);
  const [progressPct, setProgressPct] = useState(0);
  const [showOnlinePlayer, setShowOnlinePlayer] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const isDownloading = videoStatus === "downloading";
  const shouldPoll = released && videoStatus !== null && videoStatus !== "ready";

  useEffect(() => {
    if (!shouldPoll) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }

    // Poll every 2s while downloading for smooth progress; every 5s otherwise
    const interval = isDownloading ? 2000 : 5000;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/school/sync/status?id=${lessonId}`);
        if (!res.ok) return;
        const data = await res.json();
        const entry = data.statuses?.[lessonId];
        if (!entry) return;
        const s = entry.status as VideoStatus;
        const pct = entry.progressPct as number ?? 0;
        if (s && s !== videoStatus) setVideoStatus(s);
        setProgressPct(pct);
      } catch {
        // Non-fatal — keep polling
      }
    }, interval);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPoll, isDownloading, lessonId]);

  async function toggle() {
    setLoading(true);
    setShowOnlinePlayer(false);
    try {
      const res = await fetch(`/api/school/lessons/${lessonId}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId }),
      });
      const data = await res.json();
      setReleased(data.released);
      if (data.released && data.videoStatus) {
        setVideoStatus(data.videoStatus as VideoStatus);
        setProgressPct(0);
      } else if (!data.released) {
        setVideoStatus(null);
        setProgressPct(0);
      }
    } finally {
      setLoading(false);
    }
  }

  const showViewOnline =
    released && videoStatus !== null && videoStatus !== "ready";

  const notReady = released && videoStatus !== null && videoStatus !== "ready";

  return (
    <div className="space-y-2">
      {/* ── Top row: toggle + status label ── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
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
            <span
              className={`inline-block h-2 w-2 rounded-full ${released ? "bg-surface" : "bg-line"}`}
            />
          )}
          {released ? "Released" : "Locked"}
        </button>

        {notReady && videoStatus && (
          <span className={`flex items-center gap-1.5 font-mono text-xs ${statusColor(videoStatus as NonNullable<Exclude<VideoStatus, "ready">>)}`}>
            {isDownloading && (
              <span className="inline-block h-2 w-2 animate-spin rounded-full border border-current border-t-transparent" />
            )}
            {statusLabel(videoStatus as NonNullable<Exclude<VideoStatus, "ready">>)}
            {isDownloading && progressPct > 0 && (
              <span className="font-semibold text-navy-deep">{progressPct}%</span>
            )}
          </span>
        )}

        {showViewOnline && (
          <button
            onClick={() => setShowOnlinePlayer((prev) => !prev)}
            className="font-mono text-xs text-steel underline-offset-2 hover:underline"
          >
            {showOnlinePlayer ? "Hide player" : "View Online"}
          </button>
        )}
      </div>

      {/* ── Progress bar (download only) ── */}
      {isDownloading && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-navy transition-all duration-500"
            style={{ width: progressPct > 0 ? `${progressPct}%` : "8%" }}
          />
        </div>
      )}

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
            Streaming live from source — local copy still downloading in the background.
          </p>
        </div>
      )}
    </div>
  );
}
