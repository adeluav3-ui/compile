"use client";

import { useState, useRef, useCallback } from "react";

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Props = {
  lessonId: string;
  classId: string;
  classSection: string; // display name e.g. "JSS2 A"
};

export default function PlayForClassPlayer({ lessonId, classId, classSection }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resumeFrom, setResumeFrom] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  // Track the position of the last save so we only write every 10 seconds
  const lastSavedPositionRef = useRef<number>(0);
  // Prevents double-seeking if metadata loads before or after the fetch resolves
  const didSeekRef = useRef<boolean>(false);

  const saveProgress = useCallback(
    async (positionSeconds: number) => {
      const position = Math.floor(positionSeconds);
      lastSavedPositionRef.current = positionSeconds;
      try {
        await fetch(`/api/school/lessons/${lessonId}/class-progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classId, lastPositionSeconds: position }),
        });
      } catch {
        // Best-effort — playback continues regardless of save failure
      }
    },
    [lessonId, classId]
  );

  async function open() {
    setLoading(true);
    didSeekRef.current = false;
    lastSavedPositionRef.current = 0;

    let savedPosition = 0;
    try {
      const res = await fetch(
        `/api/school/lessons/${lessonId}/class-progress?classId=${classId}`
      );
      if (res.ok) {
        const data = (await res.json()) as { lastPositionSeconds?: number };
        savedPosition = data.lastPositionSeconds ?? 0;
      }
    } catch {
      // Fall through — start from 0
    }

    setResumeFrom(savedPosition);
    setLoading(false);
    setIsOpen(true);
  }

  function close() {
    const video = videoRef.current;
    if (video) {
      if (!video.paused) {
        video.pause(); // triggers onPause which saves position
      } else {
        void saveProgress(video.currentTime);
      }
    }
    setIsOpen(false);
  }

  function handleToggle() {
    if (isOpen) {
      close();
    } else {
      void open();
    }
  }

  // Seek to saved position once the video has enough metadata to accept currentTime
  function handleLoadedMetadata() {
    const video = videoRef.current;
    if (!video || didSeekRef.current || resumeFrom <= 0) return;
    video.currentTime = resumeFrom;
    didSeekRef.current = true;
  }

  // Save every 10 seconds while playing
  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video) return;
    if (video.currentTime - lastSavedPositionRef.current >= 10) {
      void saveProgress(video.currentTime);
    }
  }

  // Save immediately on pause or end
  function handlePauseOrEnd() {
    const video = videoRef.current;
    if (video) void saveProgress(video.currentTime);
  }

  async function handleRestart() {
    await saveProgress(0);
    setResumeFrom(0);
    lastSavedPositionRef.current = 0;
    didSeekRef.current = true;
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      void video.play().catch(() => {});
    }
  }

  return (
    <div className="border-t border-line">
      <button
        onClick={handleToggle}
        disabled={loading}
        className="flex w-full items-center gap-2 px-5 py-2.5 text-left disabled:opacity-60"
      >
        <span className="font-mono text-xs text-navy transition-colors hover:text-navy-deep">
          {loading
            ? "Loading…"
            : isOpen
              ? "▲ Close class player"
              : "▼ Play for Class"}
        </span>
      </button>

      {isOpen && (
        <div className="space-y-3 px-5 pb-5">
          <div
            className="overflow-hidden rounded-[3px] border border-line bg-surface"
            style={{ aspectRatio: "16/9" }}
          >
            <video
              ref={videoRef}
              className="h-full w-full"
              controls
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onPause={handlePauseOrEnd}
              onEnded={handlePauseOrEnd}
            >
              <source src={`/api/school/video/${lessonId}`} type="video/mp4" />
            </video>
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-muted">
              {resumeFrom > 0 ? (
                <>
                  Resumed from{" "}
                  <span className="font-mono font-semibold text-ink">
                    {formatTime(resumeFrom)}
                  </span>{" "}
                  for{" "}
                  <span className="font-semibold text-ink">{classSection}</span>
                </>
              ) : (
                <>
                  Playing for{" "}
                  <span className="font-semibold text-ink">{classSection}</span>
                </>
              )}
            </p>
            <button
              onClick={() => void handleRestart()}
              className="shrink-0 font-mono text-xs text-muted underline-offset-2 hover:text-navy hover:underline"
            >
              Restart from beginning
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
