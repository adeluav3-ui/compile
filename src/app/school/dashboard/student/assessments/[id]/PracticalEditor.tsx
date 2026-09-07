"use client";
import dynamic from "next/dynamic";
import { useState, useRef, useEffect } from "react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type WorkspaceFile = { name: string; content: string };

function langFor(name: string) {
  if (name.endsWith(".css")) return "css";
  if (name.endsWith(".js")) return "javascript";
  return "html";
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildPreview(files: WorkspaceFile[]): string {
  const htmlFile = files.find((f) => f.name === "index.html");
  if (!htmlFile) return "";
  let html = htmlFile.content;
  for (const f of files) {
    if (f.name.endsWith(".css")) {
      html = html.replace(
        new RegExp(`<link[^>]*href=["']${escapeRegex(f.name)}["'][^>]*/?>`, "gi"),
        `<style>\n${f.content}\n</style>`
      );
    } else if (f.name.endsWith(".js")) {
      html = html.replace(
        new RegExp(`<script[^>]*src=["']${escapeRegex(f.name)}["'][^>]*><\\/script>`, "gi"),
        `<script>\n${f.content}\n</script>`
      );
    }
  }
  return html;
}

const DEFAULT_FILES: WorkspaceFile[] = [{ name: "index.html", content: "" }];

export default function PracticalEditor({
  assessmentId,
  onSubmitted,
}: {
  assessmentId: string;
  onSubmitted: () => void;
}) {
  const [files, setFiles] = useState<WorkspaceFile[]>(DEFAULT_FILES);
  const [activeFile, setActiveFile] = useState("index.html");
  const [preview, setPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [addingFile, setAddingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [addError, setAddError] = useState("");
  const newFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingFile) newFileInputRef.current?.focus();
  }, [addingFile]);

  function handleCodeChange(val: string | undefined) {
    const newContent = val ?? "";
    setFiles((prev) =>
      prev.map((f) => (f.name === activeFile ? { ...f, content: newContent } : f))
    );
  }

  function runPreview() {
    setPreview(buildPreview(files));
  }

  function confirmAddFile() {
    const name = newFileName.trim();
    setAddError("");
    if (!name) { cancelAddFile(); return; }
    if (!/\.(html|css|js)$/i.test(name)) {
      setAddError("Must end in .html, .css, or .js");
      return;
    }
    if (files.some((f) => f.name === name)) {
      setAddError("File already exists");
      return;
    }
    setFiles((prev) => [...prev, { name, content: "" }]);
    setActiveFile(name);
    setNewFileName("");
    setAddingFile(false);
  }

  function cancelAddFile() {
    setNewFileName("");
    setAddingFile(false);
    setAddError("");
  }

  function deleteFile(name: string) {
    if (name === "index.html") return;
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    setFiles((prev) => prev.filter((f) => f.name !== name));
    if (activeFile === name) setActiveFile("index.html");
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const content = files
        .map((f) => `=== ${f.name} ===\n${f.content}`)
        .join("\n\n");
      const res = await fetch(`/api/school/assessments/${assessmentId}/submit-practical`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Submission failed."); return; }
      onSubmitted();
    } finally {
      setSubmitting(false);
    }
  }

  const activeContent = files.find((f) => f.name === activeFile)?.content ?? "";

  return (
    <div className="overflow-hidden rounded-[3px] border border-line">
      {/* File tabs */}
      <div className="flex items-stretch overflow-x-auto border-b border-line bg-paper">
        {files.map((f) => {
          const isActive = f.name === activeFile;
          return (
            <div
              key={f.name}
              className={`group flex shrink-0 items-center gap-1 border-r border-line ${
                isActive ? "bg-surface" : "hover:bg-surface/60"
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveFile(f.name)}
                className={`px-3 py-2 font-mono text-xs ${
                  isActive ? "text-navy-deep" : "text-muted hover:text-ink"
                }`}
              >
                {f.name}
              </button>
              {f.name !== "index.html" && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); deleteFile(f.name); }}
                  className="pr-2 font-mono text-xs text-muted opacity-0 transition-opacity hover:text-[#991B1B] group-hover:opacity-100"
                  title={`Delete ${f.name}`}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}

        {addingFile ? (
          <div className="flex items-center gap-1.5 px-2">
            <input
              ref={newFileInputRef}
              value={newFileName}
              onChange={(e) => { setNewFileName(e.target.value); setAddError(""); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmAddFile();
                if (e.key === "Escape") cancelAddFile();
              }}
              onBlur={() => { if (!newFileName.trim()) cancelAddFile(); }}
              placeholder="styles.css"
              className="w-28 rounded-xs border border-navy px-1.5 py-0.5 font-mono text-xs text-ink focus:outline-none"
            />
            {addError && (
              <span className="font-mono text-[10px] text-[#991B1B]">{addError}</span>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingFile(true)}
            className="px-3 py-2 font-mono text-xs text-muted hover:text-navy"
          >
            + file
          </button>
        )}
      </div>

      {/* Editor + Preview */}
      <div className="flex flex-col sm:flex-row">
        <div className="h-75 border-b border-line sm:h-110 sm:flex-1 sm:border-b-0 sm:border-r">
          <MonacoEditor
            key={activeFile}
            height="100%"
            language={langFor(activeFile)}
            defaultValue={activeContent}
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
        <div className="h-60 bg-white sm:h-110 sm:flex-1">
          <iframe
            srcDoc={preview}
            sandbox="allow-scripts"
            className="h-full w-full border-0"
            title="Practical preview"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between border-t border-line bg-paper px-4 py-2.5">
        <button
          onClick={runPreview}
          className="rounded-[3px] border border-line bg-surface px-3 py-1.5 font-mono text-xs text-navy transition-colors hover:border-navy"
        >
          ▶ Run
        </button>
        <div className="flex items-center gap-3">
          {error && (
            <span className="font-mono text-xs text-[#991B1B]">{error}</span>
          )}
          <button
            onClick={submit}
            disabled={submitting}
            className="rounded-[3px] bg-navy px-4 py-1.5 font-mono text-xs text-surface transition-colors hover:bg-navy-deep disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit Practical →"}
          </button>
        </div>
      </div>
    </div>
  );
}
