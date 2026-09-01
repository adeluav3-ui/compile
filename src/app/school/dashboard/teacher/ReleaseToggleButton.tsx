"use client";
import { useState } from "react";

export default function ReleaseToggleButton({
  lessonId,
  classId,
  initialReleased,
}: {
  lessonId: string;
  classId: string;
  initialReleased: boolean;
}) {
  const [released, setReleased] = useState(initialReleased);
  const [loading, setLoading] = useState(false);

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
    } finally {
      setLoading(false);
    }
  }

  return (
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
  );
}
