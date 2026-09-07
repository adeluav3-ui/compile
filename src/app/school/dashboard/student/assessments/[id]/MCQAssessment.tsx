"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PracticalEditor from "./PracticalEditor";

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
  const [objResult, setObjResult] = useState<{ score: number; outOf: number } | null>(null);
  const [practicalDone, setPracticalDone] = useState(false);
  const [error, setError] = useState("");

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length;

  function select(qid: string, optIndex: number) {
    if (objResult) return;
    setAnswers((prev) => ({ ...prev, [qid]: optIndex }));
  }

  async function submitObj() {
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

    setObjResult({ score: data.score, outOf: data.outOf });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* ── OBJ section ──────────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-brass">
          Objective Questions
        </h2>

        {/* Progress (before submission) */}
        {!objResult && (
          <div className="mb-4 flex items-center justify-between font-mono text-xs text-muted">
            <span>{answeredCount}/{questions.length} answered</span>
            <span>{questions.length - answeredCount} remaining</span>
          </div>
        )}

        {/* OBJ score (after submission) */}
        {objResult && (
          <div className="mb-4 rounded-[3px] border border-line bg-surface px-5 py-4">
            <p className="font-semibold text-navy-deep">
              OBJ score: {objResult.score}/{objResult.outOf}
            </p>
            {!practicalPrompt && (
              <p className="mt-1 font-mono text-xs text-muted">
                Assessment complete.
              </p>
            )}
            {practicalPrompt && !practicalDone && (
              <p className="mt-1 font-mono text-xs text-muted">
                Complete the practical exercise below to finish.
              </p>
            )}
            {practicalPrompt && practicalDone && (
              <p className="mt-1 font-mono text-xs text-muted">
                Practical submitted — your teacher will grade it.
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-[3px] bg-[#FEF2F2] px-4 py-3 font-mono text-xs text-[#991B1B]">
            {error}
          </div>
        )}

        {/* Questions list */}
        <div className="space-y-4">
          {questions.map((q) => (
            <div key={q.id} className="rounded-[3px] border border-line bg-surface p-5 space-y-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 font-mono text-xs text-muted shrink-0">
                  {q.orderIndex}.
                </span>
                <p className="text-sm text-ink leading-relaxed">{q.questionText}</p>
              </div>

              <div className="space-y-2 pl-5">
                {q.options.map((opt, i) => {
                  const selected = answers[q.id] === i;
                  const isCorrectReveal = objResult !== null && selected;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => select(q.id, i)}
                      disabled={!!objResult}
                      className={`flex w-full items-center gap-3 rounded-[3px] border px-4 py-3 text-left text-sm transition-colors disabled:cursor-default ${
                        selected
                          ? isCorrectReveal
                            ? "border-navy bg-navy/5 text-navy-deep"
                            : "border-navy bg-navy/5 text-navy-deep"
                          : "border-line bg-paper text-ink hover:border-navy disabled:hover:border-line"
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
        </div>

        {/* Submit OBJ button */}
        {!objResult && (
          <div className="mt-6 flex items-center gap-4">
            <button
              type="button"
              disabled={!allAnswered || submitting}
              onClick={submitObj}
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
        )}
      </div>

      {/* ── Practical section ─────────────────────────────────────────────── */}
      {practicalPrompt && (
        <div className="space-y-4">
          <div className="rounded-[3px] border border-line bg-surface p-5">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-brass">
              Practical Exercise
            </h2>
            <p className="text-sm leading-relaxed text-ink">{practicalPrompt}</p>
          </div>

          {!objResult && (
            <p className="font-mono text-xs text-muted">
              Submit your objective answers above first, then you can work on this.
            </p>
          )}

          {objResult && !practicalDone && (
            <PracticalEditor
              assessmentId={assessmentId}
              onSubmitted={() => setPracticalDone(true)}
            />
          )}

          {practicalDone && (
            <div className="rounded-[3px] border border-line bg-surface px-5 py-4 text-center">
              <p className="font-semibold text-navy-deep">Practical submitted</p>
              <p className="mt-1 font-mono text-xs text-muted">
                Your teacher will score this section.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
