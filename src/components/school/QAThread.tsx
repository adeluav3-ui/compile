"use client";
import { useState } from "react";

export type QAItem = {
  id: string;
  studentId: string;
  questionText: string;
  aiAnswer: string | null;
  aiAnsweredAt: string | null;
  teacherResponse: string | null;
  teacherRepliedAt: string | null;
  status: string;
  createdAt: string;
};

export default function QAThread({
  lessonId,
  initialItems,
  studentId,
}: {
  lessonId: string;
  initialItems: QAItem[];
  studentId: string;
}) {
  const [items, setItems] = useState<QAItem[]>(initialItems);
  const [question, setQuestion] = useState("");
  const [posting, setPosting] = useState(false);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/school/lessons/${lessonId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionText: question }),
      });
      const newItem = await res.json();
      setItems((prev) => [...prev, newItem]);
      setQuestion("");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="rounded-[3px] border border-line bg-surface">
      <div className="divide-y divide-line">
        {items.length === 0 && (
          <p className="px-5 py-6 text-center text-sm text-muted">
            No questions yet. Ask one below.
          </p>
        )}
        {items.map((item) => (
          <div key={item.id} className="px-5 py-4 space-y-3">
            {/* Question */}
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-navy/10 font-mono text-xs text-navy">
                {item.studentId === studentId ? "You" : "S"}
              </span>
              <p className="text-sm text-ink">{item.questionText}</p>
            </div>

            {/* AI answer */}
            {item.status === "queued" && !item.aiAnswer && (
              <div className="ml-9 font-mono text-xs text-muted">
                AI answer pending (offline queue)…
              </div>
            )}
            {item.aiAnswer && (
              <div className="ml-9 flex items-start gap-3">
                <span className="mt-0.5 flex-shrink-0 font-mono text-xs text-brass">AI</span>
                <div className="rounded bg-paper px-3 py-2 text-sm text-ink space-y-2">
                  {item.aiAnswer
                    .split(/\n\n+/)
                    .map((para, i) => (
                      <p key={i} className="whitespace-pre-wrap leading-relaxed">
                        {para.trim()}
                      </p>
                    ))}
                </div>
              </div>
            )}

            {/* Teacher reply */}
            {item.teacherResponse && (
              <div className="ml-9 flex items-start gap-3">
                <span className="mt-0.5 flex-shrink-0 font-mono text-xs text-steel">
                  Teacher
                </span>
                <div className="rounded border border-steel/20 bg-steel/5 px-3 py-2 text-sm text-ink">
                  {item.teacherResponse}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Ask input */}
      <form onSubmit={post} className="flex gap-2 border-t border-line p-4">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about this lesson…"
          className="flex-1 rounded-[3px] border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none"
        />
        <button
          type="submit"
          disabled={posting || !question.trim()}
          className="rounded-[3px] bg-navy px-4 py-2 text-sm text-surface transition-colors hover:bg-navy-deep disabled:opacity-50"
        >
          {posting ? "Asking…" : "Ask"}
        </button>
      </form>
    </div>
  );
}
