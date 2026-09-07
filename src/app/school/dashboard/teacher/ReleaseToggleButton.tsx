"use client";

import { useState, useEffect, useRef } from "react";

type VideoStatus =
  | "pending"
  | "downloading"
  | "ready"
  | "degraded_online_only"
  | "error"
  | null;

type ClassOption = { id: string; name: string };

export default function ReleaseToggleButton({
  lessonId,
  classes,
  initialReleasedClassIds,
  initialVideoStatus = null,
  initialProgressPct = 0,
  isOfflineBuild = false,
}: {
  lessonId: string;
  classes: ClassOption[];
  initialReleasedClassIds: string[];
  initialVideoStatus?: VideoStatus;
  initialProgressPct?: number;
  isOfflineBuild?: boolean;
}) {
  const [releasedIds, setReleasedIds] = useState(() => new Set(initialReleasedClassIds));
  const [showPicker, setShowPicker] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<VideoStatus>(initialVideoStatus);
  const [progressPct, setProgressPct] = useState(initialProgressPct);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const anyReleased = releasedIds.size > 0;
  const isDownloading = videoStatus === "downloading";
  const shouldPoll = anyReleased && isOfflineBuild && videoStatus !== null && videoStatus !== "ready";

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

  async function toggle(classId: string) {
    setLoadingId(classId);
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
      if (data.released) {
        setReleasedIds((prev) => new Set([...prev, classId]));
        setVideoStatus((data.videoStatus as VideoStatus) ?? null);
        setProgressPct(0);
      } else {
        setReleasedIds((prev) => {
          const next = new Set(prev);
          next.delete(classId);
          if (next.size === 0) { setVideoStatus(null); setProgressPct(0); }
          return next;
        });
      }
      setShowPicker(false);
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setLoadingId(null);
    }
  }

  const releasedClasses = classes.filter((c) => releasedIds.has(c.id));
  const unreleasedClasses = classes.filter((c) => !releasedIds.has(c.id));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Released class badges with un-release button */}
        {releasedClasses.map((cls) => (
          <span
            key={cls.id}
            className="flex items-center gap-1.5 rounded-[3px] bg-navy-deep/10 px-2 py-1 font-mono text-xs text-navy-deep"
          >
            {cls.name}
            <button
              onClick={() => toggle(cls.id)}
              disabled={loadingId !== null}
              title={`Un-release from ${cls.name}`}
              className="opacity-50 hover:opacity-100 disabled:opacity-30"
            >
              {loadingId === cls.id ? (
                <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border border-current border-t-transparent" />
              ) : (
                "×"
              )}
            </button>
          </span>
        ))}

        {/* Class picker or trigger button */}
        {unreleasedClasses.length > 0 && (
          showPicker ? (
            <>
              {unreleasedClasses.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => toggle(cls.id)}
                  disabled={loadingId !== null}
                  className="rounded-[3px] border border-line px-2.5 py-1 font-mono text-xs text-muted transition-colors hover:border-navy hover:text-navy disabled:opacity-50"
                >
                  {loadingId === cls.id ? (
                    <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border border-current border-t-transparent" />
                  ) : (
                    cls.name
                  )}
                </button>
              ))}
              <button
                onClick={() => setShowPicker(false)}
                className="font-mono text-xs text-muted hover:text-ink"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowPicker(true)}
              disabled={loadingId !== null}
              className="rounded-[3px] border border-dashed border-line px-2.5 py-1 font-mono text-xs text-muted transition-colors hover:border-navy hover:text-navy disabled:opacity-50"
            >
              {releasedIds.size === 0 ? "Release to a class →" : "+ Release to another class"}
            </button>
          )
        )}
      </div>

      {error && <p className="font-mono text-xs text-[#B45309]">{error}</p>}

      {/* Offline video status row */}
      {anyReleased && isOfflineBuild && (
        videoStatus === "ready" ? (
          <p className="font-mono text-xs text-navy-deep">✓ Saved for offline viewing</p>
        ) : videoStatus === "pending" ? (
          <p className="font-mono text-xs text-muted">Queued — will download when internet is available</p>
        ) : videoStatus === "degraded_online_only" || videoStatus === "error" ? (
          <p className="font-mono text-xs text-[#B45309]">Download failed after retries · streaming online for now</p>
        ) : videoStatus === "downloading" ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs text-muted">Downloading for offline…</p>
              {progressPct > 0 && (
                <span className="font-mono text-xs font-semibold text-navy-deep">{progressPct}%</span>
              )}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-navy transition-all duration-500 ease-out"
                style={{ width: `${progressPct > 0 ? progressPct : 6}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="font-mono text-xs text-muted">Video status unknown — try refreshing</p>
        )
      )}
    </div>
  );
}
