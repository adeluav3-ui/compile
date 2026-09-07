"use client";

import { useState, useRef, useCallback } from "react";

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Props = {
  lessonId: string;
  releasedClasses: { id: string; name: string }[];
  isLocalReady: boolean;
  isOnlineMode?: boolean;
  videoProvider?: string | null;
  videoId?: string | null;
};

export default function PlayForClassPlayer({
  lessonId,
  releasedClasses,
  isLocalReady,
  isOnlineMode = false,
  videoProvider,
  videoId,
}: Props) {
  const [selectedClassId, setSelectedClassId] = useState(releasedClasses[0]?.id ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resumeFrom, setResumeFrom] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedPositionRef = useRef<number>(0);
  const didSeekRef = useRef<boolean>(false);

  const selectedClass = releasedClasses.find((c) => c.id === selectedClassId) ?? releasedClasses[0];

  const saveProgress = useCallback(
    async (positionSeconds: number) => {
      lastSavedPositionRef.current = positionSeconds;
      try {
        await fetch(`/api/school/lessons/${lessonId}/class-progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classId: selectedClassId, lastPositionSeconds: Math.floor(positionSeconds) }),
        });
      } catch {
        // Best-effort
      }
    },
    [lessonId, selectedClassId]
  );

  async function open() {
    setLoading(true);
    didSeekRef.current = false;
    lastSavedPositionRef.current = 0;

    let savedPosition = 0;
    if (isLocalReady && selectedClassId) {
      try {
        const res = await fetch(`/api/school/lessons/${lessonId}/class-progress?classId=${selectedClassId}`);
        if (res.ok) {
          const data = (await res.json()) as { lastPositionSeconds?: number };
          savedPosition = data.lastPositionSeconds ?? 0;
        }
      } catch { /* start from 0 */ }
    }

    setResumeFrom(savedPosition);
    setLoading(false);
    setIsOpen(true);
  }

  function close() {
    const video = videoRef.current;
    if (video) {
      if (!video.paused) video.pause();
      else void saveProgress(video.currentTime);
    }
    setIsOpen(false);
  }

  function handleToggle() {
    if (isOpen) close();
    else void open();
  }

  function handleClassChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (isOpen) close();
    setSelectedClassId(e.target.value);
    setResumeFrom(0);
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
    if (video.currentTime - lastSavedPositionRef.current >= 10) void saveProgress(video.currentTime);
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
    if (video) { video.currentTime = 0; void video.play().catch(() => {}); }
  }

  if (releasedClasses.length === 0) return null;

  const hasYoutube = videoProvider === "youtube" && !!videoId;

  return (
    <div className="border-t border-line">
      <div className="flex items-center gap-3 px-5 py-2.5">
        <button
          onClick={handleToggle}
          disabled={loading}
          className="font-mono text-xs text-navy transition-colors hover:text-navy-deep disabled:opacity-60"
        >
          {loading ? "Loading…" : isOpen ? "▲ Close class player" : "▼ Play for Class"}
        </button>

        {/* Class selector — shown when not playing, and multiple classes are released */}
        {!isOpen && releasedClasses.length > 1 && (
          <select
            value={selectedClassId}
            onChange={handleClassChange}
            className="rounded-[3px] border border-line bg-paper px-2 py-1 font-mono text-xs text-ink focus:border-navy focus:outline-none"
          >
            {releasedClasses.map((cls) => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        )}
      </div>

      {isOpen && (
        <div className="space-y-3 px-5 pb-5">
          <div
            className="overflow-hidden rounded-[3px] border border-line bg-surface"
            style={{ aspectRatio: "16/9" }}
          >
            {isLocalReady ? (
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
              /*
               * KNOWN LIMITATION — PILOT ONLY.
               * The YouTube video ID is visible in page source and the embed
               * URL carries no session or subscription check — anyone who
               * finds the ID can watch on YouTube directly. This is an
               * accepted trade-off for the initial pilot schools.
               * Must be replaced with VdoCipher (or equivalent) signed/expiring
               * URLs before scaling beyond the pilot.
               */
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}?modestbranding=1&rel=0&iv_load_policy=3`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Lesson video"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-center text-sm text-muted">Video not yet available for this lesson.</p>
              </div>
            )}
          </div>

          {isLocalReady && (
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-muted">
                {resumeFrom > 0 ? (
                  <>
                    Resumed from{" "}
                    <span className="font-mono font-semibold text-ink">{formatTime(resumeFrom)}</span>
                    {" "}for{" "}
                    <span className="font-semibold text-ink">{selectedClass?.name}</span>
                  </>
                ) : (
                  <>
                    Playing for{" "}
                    <span className="font-semibold text-ink">{selectedClass?.name}</span>
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
              Playing for <span className="font-semibold text-ink">{selectedClass?.name}</span>
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
