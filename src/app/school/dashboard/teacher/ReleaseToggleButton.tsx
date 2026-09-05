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
  if (status === "degraded_online_only" || status === "error") {
    return "Still processing.";
  }
  return "Processing — not yet ready to view";
}

function statusColor(status: NonNullable<Exclude<VideoStatus, "ready">>): string {
  if (status === "degraded_online_only" || status === "error") return "text-[#B45309]";
  return "text-muted";
}

function isActive(status: VideoStatus): boolean {
  return status === "downloading";
}

function VideoStatusBadge({ status }: { status: VideoStatus }) {
  if (!status || status === "ready") return null;
  const s = status as NonNullable<Exclude<VideoStatus, "ready">>;

  return (
    <span className={`ml-2 font-mono text-xs ${statusColor(s)}`}>
      {isActive(status) && (
        <span className="mr-1 inline-block h-2 w-2 animate-spin rounded-full border border-current border-t-transparent" />
      )}
      {statusLabel(s)}
    </span>
  );
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
  const [showOnlinePlayer, setShowOnlinePlayer] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const shouldPoll =
    released && videoStatus !== null && videoStatus !== "ready";

  // Poll sync status while any non-ready state is active
  useEffect(() => {
    if (!shouldPoll) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/school/sync/status?id=${lessonId}`);
        if (!res.ok) return;
        const data = await res.json();
        const s = data.statuses?.[lessonId]?.status as VideoStatus | undefined;
        if (s && s !== videoStatus) {
          setVideoStatus(s);
        }
      } catch {
        // Non-fatal — keep polling
      }
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [shouldPoll, videoStatus, lessonId]);

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
      } else if (!data.released) {
        setVideoStatus(null);
      }
    } finally {
      setLoading(false);
    }
  }

  const showViewOnline =
    released && videoStatus !== null && videoStatus !== "ready";

  return (
    <div className="space-y-2">
      <div className="flex items-center">
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
              className={`inline-block h-2 w-2 rounded-full ${
                released ? "bg-surface" : "bg-line"
              }`}
            />
          )}
          {released ? "Released" : "Locked"}
        </button>

        {released && <VideoStatusBadge status={videoStatus} />}

        {showViewOnline && (
          <button
            onClick={() => setShowOnlinePlayer((prev) => !prev)}
            className="ml-3 font-mono text-xs text-steel underline-offset-2 hover:underline"
          >
            {showOnlinePlayer ? "Hide player" : "View Online"}
          </button>
        )}
      </div>

      {showOnlinePlayer && (
        <div className="overflow-hidden rounded-[3px] border border-line bg-surface">
          <video
            className="w-full"
            controls
            autoPlay={false}
            src={`/api/school/video/${lessonId}?mode=online`}
          />
          <p className="px-3 py-1.5 font-mono text-xs text-muted">
            Streaming live from source — local copy still processing in the background.
          </p>
        </div>
      )}
    </div>
  );
}
