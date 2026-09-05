"use client";

import { useState, useEffect, useRef } from "react";

type VideoStatus = "pending" | "downloading" | "ready" | "error" | null;

function VideoStatusBadge({ status }: { status: VideoStatus }) {
  if (!status || status === "ready") return null;

  const styles: Record<NonNullable<Exclude<VideoStatus, "ready">>, string> = {
    downloading: "text-steel",
    pending: "text-muted",
    error: "text-[#991B1B]",
  };

  const labels: Record<NonNullable<Exclude<VideoStatus, "ready">>, string> = {
    downloading: "Downloading…",
    pending: "Waiting for connection",
    error: "Download failed",
  };

  return (
    <span className={`ml-2 font-mono text-xs ${styles[status]}`}>
      {status === "downloading" && (
        <span className="mr-1 inline-block h-2 w-2 animate-spin rounded-full border border-current border-t-transparent" />
      )}
      {labels[status]}
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
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Poll sync status while a download is in-flight
  useEffect(() => {
    if (videoStatus !== "downloading") {
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
        if (s && s !== "downloading") {
          setVideoStatus(s);
        }
      } catch {
        // Non-fatal
      }
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [videoStatus, lessonId]);

  async function toggle() {
    setLoading(true);
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
      }
    } finally {
      setLoading(false);
    }
  }

  return (
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
    </div>
  );
}
