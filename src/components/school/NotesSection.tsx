"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const MarkdownRenderer = dynamic(() => import("./MarkdownRenderer"), {
  ssr: false,
  loading: () => (
    <p className="text-sm text-muted">Loading notes…</p>
  ),
});

export default function NotesSection({ notes }: { notes: string }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-[3px] border border-line">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <span className="font-mono text-xs uppercase tracking-widest text-brass">
          Lesson Notes
        </span>
        <span className="font-mono text-xs text-muted">{open ? "▲ Hide" : "▼ Show"}</span>
      </button>

      {open && (
        <div className="border-t border-line px-5 pb-6 pt-4">
          <MarkdownRenderer content={notes} />

          {/* PDF export stub */}
          <div className="mt-6 border-t border-line pt-4">
            <button
              onClick={() => window.print()}
              className="rounded-[3px] border border-line bg-surface px-4 py-2 font-mono text-xs text-navy transition-colors hover:border-navy"
            >
              ⬇ Print / Save as PDF
            </button>
            <p className="mt-1.5 font-mono text-[10px] text-muted">
              Use your browser&apos;s print dialog and choose &quot;Save as PDF&quot;.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
