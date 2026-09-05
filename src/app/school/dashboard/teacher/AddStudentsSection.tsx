"use client";

import { useRef, useState } from "react";

interface ImportResult {
  name: string;
  username: string;
  password: string;
}

interface ImportFailure {
  name: string;
  error: string;
}

export default function AddStudentsSection({ classId }: { classId: string }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<ImportResult[]>([]);
  const [failed, setFailed] = useState<ImportFailure[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setText(content);
    };
    reader.readAsText(file);
    // Reset so the same file can be re-selected if needed
    e.target.value = "";
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreated([]);
    setFailed([]);
    setDone(false);

    const rows = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((name) => ({ name }));

    if (rows.length === 0) {
      setError("Paste at least one student name.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/school/teacher/students/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, rows }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Import failed.");
    } else {
      setCreated(data.created ?? []);
      setFailed(data.failed ?? []);
      setDone(true);
      if ((data.created ?? []).length > 0) setText("");
    }

    setLoading(false);
  }

  return (
    <section>
      <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-brass">
        Add Students
      </h2>
      <div className="rounded-[3px] border border-line bg-surface px-5 py-5">
        <p className="mb-3 text-sm text-muted">
          Paste student names — one per line. Usernames and passwords are auto-generated.
        </p>

        <form onSubmit={handleImport} className="space-y-4">
          <textarea
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={loading}
            rows={8}
            placeholder={"Chidi Okeke\nAmaka Eze\nEmeka Nwosu"}
            className="w-full rounded-[3px] border border-line bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none disabled:opacity-60"
          />

          {error && (
            <p className="rounded-[3px] bg-[#FEF2F2] px-3 py-2 font-mono text-xs text-[#991B1B]">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-[3px] bg-navy px-5 py-2.5 font-mono text-xs text-surface transition-colors hover:bg-navy-deep disabled:opacity-50"
            >
              {loading ? "Creating accounts…" : "Create accounts →"}
            </button>

            <span className="text-xs text-muted">or</span>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              className="rounded-[3px] border border-line bg-paper px-4 py-2.5 font-mono text-xs text-muted transition-colors hover:border-navy hover:text-navy disabled:opacity-50"
            >
              Upload a text file
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </form>

        {done && (
          <div className="mt-6 space-y-4">
            {created.length > 0 && (
              <div>
                <p className="mb-2 font-mono text-xs font-semibold text-navy-deep">
                  Created ({created.length})
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-left">
                        <th className="pb-2 pr-4 font-mono text-xs text-muted">Name</th>
                        <th className="pb-2 pr-4 font-mono text-xs text-muted">Username</th>
                        <th className="pb-2 font-mono text-xs text-muted">Password</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {created.map((r, i) => (
                        <tr key={i}>
                          <td className="py-2 pr-4 font-semibold text-navy-deep">{r.name}</td>
                          <td className="py-2 pr-4 font-mono text-xs text-ink select-all">{r.username}</td>
                          <td className="py-2 font-mono text-xs text-brass select-all">{r.password}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 font-mono text-xs text-muted">
                  Save these credentials now — passwords won&apos;t be shown again.
                </p>
              </div>
            )}

            {failed.length > 0 && (
              <div>
                <p className="mb-2 font-mono text-xs font-semibold text-[#991B1B]">
                  Failed ({failed.length})
                </p>
                <div className="divide-y divide-line rounded-[3px] border border-[#FCA5A5]">
                  {failed.map((r, i) => (
                    <div key={i} className="px-4 py-2.5">
                      <span className="text-sm font-semibold text-ink">{r.name || "—"}</span>
                      <p className="mt-0.5 font-mono text-xs text-[#991B1B]">{r.error}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
