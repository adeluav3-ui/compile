"use client";
import { useState } from "react";

export default function GradeConfirm({
  submissionId,
  aiScore,
}: {
  submissionId: string;
  aiScore: number;
}) {
  const [score, setScore] = useState(String(aiScore));
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  async function confirm() {
    setConfirming(true);
    try {
      await fetch(`/api/school/submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherScore: Number(score) }),
      });
      setDone(true);
    } finally {
      setConfirming(false);
    }
  }

  if (done) {
    return (
      <p className="font-mono text-xs text-muted">
        Grade confirmed: {score}/100
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-xs text-muted">Adjust score:</span>
      <input
        type="number"
        min={0}
        max={100}
        value={score}
        onChange={(e) => setScore(e.target.value)}
        className="w-16 rounded-[3px] border border-line bg-paper px-2 py-1 font-mono text-sm text-navy-deep focus:border-navy focus:outline-none"
      />
      <span className="font-mono text-xs text-muted">/100</span>
      <button
        onClick={confirm}
        disabled={confirming}
        className="rounded-[3px] bg-navy px-4 py-1.5 font-mono text-xs text-surface transition-colors hover:bg-navy-deep disabled:opacity-50"
      >
        {confirming ? "Saving…" : "Confirm Grade"}
      </button>
    </div>
  );
}
