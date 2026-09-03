"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Lesson = { id: string; title: string; order: number };

export default function NewAssessmentForm({ lessons }: { lessons: Lesson[] }) {
  const router = useRouter();
  const [type, setType] = useState<"midterm" | "exam">("midterm");
  const [startId, setStartId] = useState(lessons[0]?.id ?? "");
  const [endId, setEndId] = useState(lessons[lessons.length - 1]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const qCount = type === "midterm" ? 20 : 30;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/school/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, lessonRangeStartId: startId, lessonRangeEndId: endId }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Generation failed.");
      setLoading(false);
      return;
    }

    router.push(`/school/dashboard/teacher/assessments/${data.assessmentId}`);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Type */}
      <div>
        <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-brass">
          Assessment type
        </label>
        <div className="flex gap-3">
          {(["midterm", "exam"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 rounded-[3px] border px-4 py-3 text-left transition-colors ${
                type === t
                  ? "border-navy bg-navy/5 text-navy-deep"
                  : "border-line bg-surface text-muted hover:border-navy"
              }`}
            >
              <div className="font-semibold capitalize">
                {t === "midterm" ? "Mid-Term" : "Final Exam"}
              </div>
              <div className="mt-0.5 font-mono text-xs text-muted">
                {t === "midterm" ? "20" : "30"} OBJ questions
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lesson range */}
      <div className="space-y-3">
        <label className="block font-mono text-xs uppercase tracking-widest text-brass">
          Lesson range
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block font-mono text-xs text-muted">From</label>
            <select
              value={startId}
              onChange={(e) => setStartId(e.target.value)}
              disabled={loading}
              className="w-full rounded-[3px] border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:border-navy focus:outline-none"
            >
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.order}. {l.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block font-mono text-xs text-muted">To</label>
            <select
              value={endId}
              onChange={(e) => setEndId(e.target.value)}
              disabled={loading}
              className="w-full rounded-[3px] border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:border-navy focus:outline-none"
            >
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.order}. {l.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="font-mono text-[10px] text-muted">
          Only lessons already released to your class appear here.
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-[3px] bg-navy/5 px-4 py-3">
        <p className="text-sm text-ink">
          Generating <strong>{qCount} multiple-choice questions</strong> + 1 practical exercise.{" "}
          This uses lesson notes as the source — may take 15–30 seconds.
        </p>
      </div>

      {error && (
        <div className="rounded-[3px] bg-[#FEF2F2] px-4 py-3 font-mono text-xs text-[#991B1B]">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-[3px] bg-navy py-3 font-mono text-sm text-surface transition-colors hover:bg-navy-deep disabled:opacity-50"
      >
        {loading ? "Generating questions… (this takes ~20s)" : "Generate assessment →"}
      </button>
    </form>
  );
}
