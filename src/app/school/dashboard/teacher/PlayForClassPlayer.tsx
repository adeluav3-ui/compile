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
  classSection: string;
  isLocalReady: boolean;          // true only when local encrypted file is ready
  isOnlineMode?: boolean;         // true in online delivery mode (pilot)
  videoProvider?: string | null;  // "youtube" | "vdocipher" | null
  videoId?: string | null;        // YouTube video ID or provider ID
};

export default function PlayForClassPlayer({
  lessonId,
  classId,
  classSection,
  isLocalReady,
  isOnlineMode = false,
  videoProvider,
  videoId,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resumeFrom, setResumeFrom] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedPositionRef = useRef<number>(0);
  const didSeekRef = useRef<boolean>(false);

  const saveProgress = useCallback(
    async (positionSeconds: number) => {
      lastSavedPositionRef.current = positionSeconds;
      try {
        await fetch(`/api/school/lessons/${lessonId}/class-progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classId, lastPositionSeconds: Math.floor(positionSeconds) }),
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

    // Progress tracking only applies to the local video player (not YouTube embed)
    let savedPosition = 0;
    if (isLocalReady) {
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

  function handleLoadedMetadata() {
    const video = videoRef.current;
    if (!video || didSeekRef.current || resumeFrom <= 0) return;
    video.currentTime = resumeFrom;
    didSeekRef.current = true;
  }

  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video) return;
    if (video.currentTime - lastSavedPositionRef.current >= 10) {
      void saveProgress(video.currentTime);
    }
  }

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

  const hasYoutube = videoProvider === "youtube" && !!videoId;

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
            {isLocalReady ? (
              /* Local encrypted file — decrypt-and-stream via the video route */
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
            ) : hasYoutube ? (
              /* Cloud / demo — YouTube embed fallback */
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}?modestbranding=1&rel=0&iv_load_policy=3`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Lesson video"
              />
            ) : (
              /* No source at all */
              <div className="flex h-full items-center justify-center">
                <p className="text-center text-sm text-muted">
                  Video not yet available for this lesson.
                </p>
              </div>
            )}
          </div>

          {isLocalReady && (
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
          )}

          {!isLocalReady && hasYoutube && (
            <p className="text-xs text-muted">
              Playing for <span className="font-semibold text-ink">{classSection}</span>
              {!isOnlineMode && (
                <>{" · "}<span className="text-muted">Local video not yet downloaded — showing source video.</span></>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
