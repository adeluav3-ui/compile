"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Question = {
  id: string;
  orderIndex: number;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  aiGenerated: boolean;
  editedByTeacher: boolean;
};

type Props = {
  assessmentId: string;
  initialQuestions: Question[];
  readonly: boolean;
};

const OPTION_LETTERS = ["A", "B", "C", "D"];

export default function QuestionReviewList({ assessmentId, initialQuestions, readonly }: Props) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Question>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function startEdit(q: Question) {
    setEditing(q.id);
    setEditDraft({
      questionText: q.questionText,
      options: [...q.options],
      correctOptionIndex: q.correctOptionIndex,
    });
    setError("");
  }

  function cancelEdit() {
    setEditing(null);
    setEditDraft({});
    setError("");
  }

  async function saveEdit(qid: string) {
    setLoadingId(qid);
    setError("");
    const res = await fetch(`/api/school/assessments/${assessmentId}/questions/${qid}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editDraft),
    });
    const data = await res.json();
    setLoadingId(null);
    if (!res.ok) { setError(data.error ?? "Save failed."); return; }
    setQuestions((prev) =>
      prev.map((q) => q.id === qid ? { ...q, ...editDraft, editedByTeacher: true } as Question : q)
    );
    setEditing(null);
    setEditDraft({});
  }

  async function deleteQuestion(qid: string) {
    if (!confirm("Delete this question?")) return;
    setLoadingId(qid);
    setError("");
    const res = await fetch(`/api/school/assessments/${assessmentId}/questions/${qid}`, {
      method: "DELETE",
    });
    setLoadingId(null);
    if (!res.ok) { setError("Delete failed."); return; }
    setQuestions((prev) => prev.filter((q) => q.id !== qid));
    router.refresh();
  }

  async function regenerate(qid: string) {
    setLoadingId(qid);
    setError("");
    const res = await fetch(`/api/school/assessments/${assessmentId}/questions/${qid}/regenerate`, {
      method: "POST",
    });
    const data = await res.json();
    setLoadingId(null);
    if (!res.ok) { setError(data.error ?? "Regeneration failed."); return; }
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qid
          ? {
              ...q,
              questionText: data.questionText,
              options: data.options,
              correctOptionIndex: data.correctOptionIndex,
              aiGenerated: true,
              editedByTeacher: false,
            }
          : q
      )
    );
  }

  function setOptionText(index: number, value: string) {
    setEditDraft((prev) => {
      const opts = [...(prev.options ?? [])];
      opts[index] = value;
      return { ...prev, options: opts };
    });
  }

  if (questions.length === 0) {
    return (
      <div className="rounded-[3px] border border-line bg-surface p-8 text-center">
        <p className="font-mono text-xs text-muted">No questions yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-[3px] bg-[#FEF2F2] px-4 py-3 font-mono text-xs text-[#991B1B]">
          {error}
        </div>
      )}

      {questions.map((q) => {
        const isEditing = editing === q.id;
        const isLoading = loadingId === q.id;

        return (
          <div
            key={q.id}
            className="rounded-[3px] border border-line bg-surface p-4 space-y-3"
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-muted">Q{q.orderIndex + 1}</span>
                {q.aiGenerated && !q.editedByTeacher && (
                  <span className="rounded-[2px] bg-brass/10 px-1.5 py-0.5 font-mono text-[10px] text-brass uppercase tracking-wider">
                    AI
                  </span>
                )}
                {q.editedByTeacher && (
                  <span className="rounded-[2px] bg-steel/10 px-1.5 py-0.5 font-mono text-[10px] text-steel uppercase tracking-wider">
                    Edited
                  </span>
                )}
              </div>

              {!readonly && !isEditing && (
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => startEdit(q)}
                    className="font-mono text-xs text-steel hover:underline disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => regenerate(q.id)}
                    className="font-mono text-xs text-steel hover:underline disabled:opacity-50"
                  >
                    {isLoading ? "Regenerating…" : "Regenerate"}
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => deleteQuestion(q.id)}
                    className="font-mono text-xs text-[#991B1B] hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
              /* Edit form */
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">
                    Question
                  </label>
                  <textarea
                    value={editDraft.questionText ?? ""}
                    onChange={(e) => setEditDraft((p) => ({ ...p, questionText: e.target.value }))}
                    rows={3}
                    className="w-full rounded-[3px] border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-navy focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-muted">
                    Options (click to mark correct)
                  </label>
                  {(editDraft.options ?? []).map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditDraft((p) => ({ ...p, correctOptionIndex: i }))}
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-xs transition-colors ${
                          editDraft.correctOptionIndex === i
                            ? "border-navy bg-navy text-surface"
                            : "border-line bg-paper text-muted hover:border-navy"
                        }`}
                      >
                        {OPTION_LETTERS[i]}
                      </button>
                      <input
                        value={opt}
                        onChange={(e) => setOptionText(i, e.target.value)}
                        className="flex-1 rounded-[3px] border border-line bg-paper px-3 py-1.5 text-sm text-ink focus:border-navy focus:outline-none"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => saveEdit(q.id)}
                    className="rounded-[3px] bg-navy px-4 py-1.5 font-mono text-xs text-surface hover:bg-navy-deep disabled:opacity-50"
                  >
                    {isLoading ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="font-mono text-xs text-muted hover:text-ink"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Read view */
              <div>
                <p className="text-sm text-ink leading-relaxed">{q.questionText}</p>
                <ul className="mt-2 space-y-1">
                  {q.options.map((opt, i) => (
                    <li
                      key={i}
                      className={`flex items-center gap-2 rounded-[2px] px-2 py-1 text-sm ${
                        i === q.correctOptionIndex
                          ? "bg-emerald-50 text-emerald-800"
                          : "text-ink"
                      }`}
                    >
                      <span className="font-mono text-xs text-muted w-4 shrink-0">
                        {OPTION_LETTERS[i]}.
                      </span>
                      {opt}
                      {i === q.correctOptionIndex && (
                        <span className="ml-auto font-mono text-[10px] text-emerald-600">✓ correct</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
