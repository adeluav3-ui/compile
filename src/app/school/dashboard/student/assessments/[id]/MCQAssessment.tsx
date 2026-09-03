"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Question = {
  id: string;
  orderIndex: number;
  questionText: string;
  options: string[];
};

type Props = {
  assessmentId: string;
  questions: Question[];
  practicalPrompt: string | null;
};

const OPTION_LETTERS = ["A", "B", "C", "D"];

export default function MCQAssessment({ assessmentId, questions, practicalPrompt }: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; outOf: number; total: number | null } | null>(null);
  const [error, setError] = useState("");

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length;

  function select(qid: string, optIndex: number) {
    if (result) return;
    setAnswers((prev) => ({ ...prev, [qid]: optIndex }));
  }

  async function submit() {
    if (!allAnswered) return;
    if (!confirm(`Submit ${answeredCount}/${questions.length} answers? You cannot change them after.`)) return;

    setSubmitting(true);
    setError("");

    const res = await fetch(`/api/school/assessments/${assessmentId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Submission failed.");
      return;
    }

    setResult(data);
    router.refresh();
  }

  if (result) {
    return (
      <div className="rounded-[3px] border border-line bg-surface p-8 text-center space-y-4">
        <p className="font-serif text-xl font-semibold text-navy-deep">Submitted!</p>
        <p className="text-sm text-ink">
          OBJ: <strong>{result.score}/{result.outOf}</strong>
        </p>
        {result.total !== null && (
          <p className="font-mono text-lg font-semibold text-navy-deep">
            Total: {result.total}%
          </p>
        )}
        {result.total === null && practicalPrompt && (
          <p className="text-sm text-muted">
            Practical section below — your teacher will score it.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between font-mono text-xs text-muted">
        <span>{answeredCount}/{questions.length} answered</span>
        <span>{questions.length - answeredCount} remaining</span>
      </div>

      {error && (
        <div className="rounded-[3px] bg-[#FEF2F2] px-4 py-3 font-mono text-xs text-[#991B1B]">
          {error}
        </div>
      )}

      {/* Questions */}
      {questions.map((q) => (
        <div key={q.id} className="rounded-[3px] border border-line bg-surface p-5 space-y-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 font-mono text-xs text-muted shrink-0">
              {q.orderIndex + 1}.
            </span>
            <p className="text-sm text-ink leading-relaxed">{q.questionText}</p>
          </div>

          <div className="space-y-2 pl-5">
            {q.options.map((opt, i) => {
              const selected = answers[q.id] === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => select(q.id, i)}
                  className={`flex w-full items-center gap-3 rounded-[3px] border px-4 py-3 text-left text-sm transition-colors ${
                    selected
                      ? "border-navy bg-navy/5 text-navy-deep"
                      : "border-line bg-paper text-ink hover:border-navy"
                  }`}
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-mono text-xs transition-colors ${
                    selected ? "border-navy bg-navy text-surface" : "border-line text-muted"
                  }`}>
                    {OPTION_LETTERS[i]}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Practical prompt */}
      {practicalPrompt && (
        <div className="rounded-[3px] border border-line bg-surface p-5">
          <h2 className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">
            Practical Exercise
          </h2>
          <p className="text-sm leading-relaxed text-ink">{practicalPrompt}</p>
          <p className="mt-3 font-mono text-xs text-muted">
            Your teacher will score this section separately.
          </p>
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={!allAnswered || submitting}
          onClick={submit}
          className="rounded-[3px] bg-navy px-6 py-3 font-mono text-sm text-surface hover:bg-navy-deep disabled:opacity-50"
        >
          {submitting ? "Submitting…" : `Submit (${answeredCount}/${questions.length})`}
        </button>
        {!allAnswered && (
          <p className="font-mono text-xs text-muted">
            Answer all {questions.length} questions to submit.
          </p>
        )}
      </div>
    </div>
  );
}
