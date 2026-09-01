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

const QUESTION_LIMIT = 5;

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
  const [limitReached, setLimitReached] = useState(
    initialItems.filter((q) => q.studentId === studentId).length >= QUESTION_LIMIT
  );

  const myQuestionCount = items.filter((q) => q.studentId === studentId).length;
  const remaining = Math.max(0, QUESTION_LIMIT - myQuestionCount);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || limitReached) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/school/lessons/${lessonId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionText: question }),
      });

      if (res.status === 429) {
        setLimitReached(true);
        return;
      }

      const newItem = await res.json();
      setItems((prev) => [...prev, newItem]);
      setQuestion("");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="rounded-[3px] border border-line bg-surface">
      {/* Thread */}
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

      {/* Input area */}
      {limitReached ? (
        <div className="border-t border-line bg-paper px-5 py-4 text-center">
          <p className="text-sm font-medium text-navy-deep">
            You have used all {QUESTION_LIMIT} questions for this lesson.
          </p>
          <p className="mt-1 text-sm text-muted">
            Go back and rewatch the video carefully, then read through the lesson notes — most answers are in there. If you are still stuck, ask your teacher in class.
          </p>
        </div>
      ) : (
        <div className="border-t border-line">
          <form onSubmit={post} className="flex gap-2 p-4">
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
          <p className="px-4 pb-3 font-mono text-xs text-muted">
            {remaining} of {QUESTION_LIMIT} questions remaining for this lesson
          </p>
        </div>
      )}
    </div>
  );
}
