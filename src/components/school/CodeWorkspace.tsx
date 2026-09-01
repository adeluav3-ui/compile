"use client";
import dynamic from "next/dynamic";
import { useState, useRef, useCallback } from "react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export default function CodeWorkspace({
  lessonId,
  initialCode,
}: {
  lessonId: string;
  initialCode: string;
}) {
  const [code, setCode] = useState(initialCode);
  const [preview, setPreview] = useState(initialCode);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    score?: number | null;
    feedback?: string | null;
  } | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const autoSave = useCallback(
    async (newCode: string) => {
      setSaving(true);
      try {
        await fetch("/api/school/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId, code: newCode }),
        });
      } finally {
        setSaving(false);
      }
    },
    [lessonId]
  );

  function handleCodeChange(val: string | undefined) {
    const newCode = val ?? "";
    setCode(newCode);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => autoSave(newCode), 2000);
  }

  function runPreview() {
    setPreview(code);
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/school/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, content: code, type: "class_activity" }),
      });
      const data = await res.json();
      setSubmitResult({ score: data.aiScore, feedback: data.aiFeedback });
      setSubmitDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-[3px] border border-line">
      {/* Editor + Preview */}
      <div className="flex h-[420px]">
        <div className="flex-1 border-r border-line">
          <MonacoEditor
            height="100%"
            defaultLanguage="html"
            value={code}
            onChange={handleCodeChange}
            theme="vs-light"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              wordWrap: "on",
              padding: { top: 12 },
            }}
          />
        </div>
        <div className="flex-1 bg-white">
          <iframe
            srcDoc={preview}
            sandbox="allow-scripts"
            className="h-full w-full border-0"
            title="Preview"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between border-t border-line bg-paper px-4 py-2.5">
        <div className="flex items-center gap-3">
          <button
            onClick={runPreview}
            className="rounded-[3px] border border-line bg-surface px-3 py-1.5 font-mono text-xs text-navy transition-colors hover:border-navy"
          >
            ▶ Run
          </button>
          {saving && (
            <span className="font-mono text-xs text-muted">Saving…</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {submitDone && submitResult && (
            <span className="font-mono text-xs text-navy-deep">
              Score: {submitResult.score ?? "—"}/100
            </span>
          )}
          <button
            onClick={submit}
            disabled={submitting || submitDone}
            className="rounded-[3px] bg-navy px-4 py-1.5 font-mono text-xs text-surface transition-colors hover:bg-navy-deep disabled:opacity-50"
          >
            {submitting ? "Submitting…" : submitDone ? "Submitted ✓" : "Submit Work"}
          </button>
        </div>
      </div>

      {/* AI feedback panel */}
      {submitResult?.feedback && (
        <div className="border-t border-line bg-paper px-4 py-3">
          <span className="font-mono text-xs text-muted">AI Feedback</span>
          <p className="mt-1 text-sm text-ink">{submitResult.feedback}</p>
        </div>
      )}
    </div>
  );
}
