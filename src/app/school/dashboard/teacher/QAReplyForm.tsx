"use client";
import { useState } from "react";

export default function QAReplyForm({ questionId }: { questionId: string }) {
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`/api/school/questions/${questionId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherResponse: reply }),
      });
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return <p className="font-mono text-xs text-muted">Reply sent.</p>;
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        type="text"
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        placeholder="Add your reply…"
        className="flex-1 rounded-[3px] border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none"
      />
      <button
        type="submit"
        disabled={submitting || !reply.trim()}
        className="rounded-[3px] bg-navy px-4 py-2 text-sm text-surface transition-colors hover:bg-navy-deep disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Reply"}
      </button>
    </form>
  );
}
