"use client";

import { useState, useRef } from "react";

type TeacherQuestion = {
  id: string;
  questionText: string;
  aiAnswer: string | null;
  createdAt: string;
};

type Props = {
  lesson: {
    id: string;
    title: string;
    description: string | null;
    videoId: string | null;
    videoProvider: string | null;
    order: number;
  };
};

export default function TeacherLessonPreview({ lesson }: Props) {
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState<TeacherQuestion[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) {
      const res = await fetch(`/api/school/lessons/${lesson.id}/teacher-questions`);
      const data = await res.json();
      setQuestions(data.questions ?? []);
      setLoaded(true);
    }
  }

  async function ask() {
    const text = inputRef.current?.value.trim() ?? "";
    if (!text || asking) return;

    setAsking(true);
    setError("");

    const res = await fetch(`/api/school/lessons/${lesson.id}/teacher-questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionText: text }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
    } else {
      setQuestions((prev) => [...prev, data.question]);
      if (inputRef.current) inputRef.current.value = "";
    }
    setAsking(false);
  }

  return (
    <div className="border-t border-line">
      <button
        onClick={toggle}
        className="flex w-full items-center gap-2 px-5 py-2.5 text-left"
      >
        <span className="font-mono text-xs text-steel transition-colors hover:text-navy">
          {open ? "▲ Close preview" : "▼ Preview lesson & ask AI"}
        </span>
      </button>

      {open && (
        <div className="space-y-5 px-5 pb-5">
          {/* Video */}
          <div
            className="overflow-hidden rounded-[3px] border border-line bg-surface"
            style={{ aspectRatio: "16/9" }}
          >
            {lesson.videoId && lesson.videoProvider === "youtube" ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${lesson.videoId}?modestbranding=1&rel=0&iv_load_policy=3`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={lesson.title}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mb-2 text-3xl text-muted">▶</div>
                  <p className="text-sm text-muted">Video not yet uploaded.</p>
                </div>
              </div>
            )}
          </div>

          {/* Private AI Q&A */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-brass">
                Private AI notes
              </span>
              <span className="rounded-[2px] bg-brass/10 px-1.5 py-0.5 font-mono text-[10px] text-brass">
                Only you can see this
              </span>
            </div>

            {/* Past questions */}
            {questions.length > 0 && (
              <div className="mb-4 space-y-4">
                {questions.map((q) => (
                  <div key={q.id} className="rounded-[3px] border border-line bg-paper p-4">
                    <p className="mb-3 text-sm font-semibold text-navy-deep">{q.questionText}</p>
                    {q.aiAnswer && (
                      <div className="space-y-2">
                        {q.aiAnswer.split(/\n\n+/).map((para, i) => (
                          <p key={i} className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                            {para.trim()}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Ask input */}
            <div className="space-y-2">
              <textarea
                ref={inputRef}
                rows={3}
                placeholder="Ask the AI anything about this lesson — how to explain it, what students might struggle with, example exercises..."
                disabled={asking}
                className="w-full resize-none rounded-[3px] border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none disabled:opacity-60"
              />
              {error && (
                <p className="text-xs text-[#991B1B]">{error}</p>
              )}
              <button
                onClick={ask}
                disabled={asking}
                className="rounded-[3px] bg-navy px-4 py-2 font-mono text-xs text-surface transition-colors hover:bg-navy-deep disabled:opacity-50"
              >
                {asking ? "Asking…" : "Ask AI →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
