"use client";

import { useState } from "react";

const CSV_TEMPLATE = `Full Name,Username or Email,Password
Chidi Okeke,chidi_okeke,
Amaka Eze,amaka@school.edu.ng,secret123
Emeka Nwosu,emeka_nwosu,`;

interface ImportResult {
  name: string;
  identifier: string;
  generatedPassword?: string;
}

interface ImportFailure {
  name: string;
  identifier: string;
  error: string;
}

export default function AddStudentsSection({ classId }: { classId: string }) {
  const [csv, setCsv] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<ImportResult[]>([]);
  const [failed, setFailed] = useState<ImportFailure[]>([]);
  const [done, setDone] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [error, setError] = useState("");

  function parseCsv(raw: string) {
    const lines = raw.trim().split(/\r?\n/).filter((l) => l.trim());
    const rows: { name: string; identifier: string; password?: string }[] = [];
    const startIndex = lines[0]?.toLowerCase().startsWith("full name") ? 1 : 0;

    for (const line of lines.slice(startIndex)) {
      const parts = line.split(",").map((p) => p.trim());
      const name = parts[0] ?? "";
      const identifier = parts[1] ?? "";
      const password = parts[2] ?? "";
      if (name && identifier) {
        rows.push({ name, identifier, password: password || undefined });
      }
    }
    return rows;
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreated([]);
    setFailed([]);
    setDone(false);

    const rows = parseCsv(csv);
    if (rows.length === 0) {
      setError("No valid rows found. Check the format and try again.");
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
      if (data.created?.length > 0) setCsv("");
    }

    setLoading(false);
  }

  return (
    <section>
      <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-brass">
        Add Students — Bulk Import
      </h2>
      <div className="rounded-[3px] border border-line bg-surface px-5 py-5">

        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-muted">
            Paste a CSV with student names and usernames or emails.
          </p>
          <button
            type="button"
            onClick={() => setShowTemplate((s) => !s)}
            className="font-mono text-xs text-steel hover:underline"
          >
            {showTemplate ? "Hide template" : "Show template"}
          </button>
        </div>

        {showTemplate && (
          <div className="mb-4 rounded-[3px] border border-line bg-paper px-4 py-3">
            <p className="mb-2 font-mono text-xs text-muted">CSV format (copy and fill in):</p>
            <pre className="select-all whitespace-pre-wrap font-mono text-xs text-ink">{CSV_TEMPLATE}</pre>
            <p className="mt-2 font-mono text-xs text-muted">
              Password column is optional — leave blank to auto-generate.
            </p>
          </div>
        )}

        <form onSubmit={handleImport} className="space-y-4">
          <textarea
            required
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            disabled={loading}
            rows={8}
            placeholder={`Full Name,Username or Email,Password\nChidi Okeke,chidi_okeke,\nAmaka Eze,amaka@school.edu.ng,`}
            className="w-full rounded-[3px] border border-line bg-paper px-3 py-2.5 font-mono text-xs text-ink placeholder:text-muted focus:border-navy focus:outline-none disabled:opacity-60"
          />

          {error && (
            <p className="rounded-[3px] bg-[#FEF2F2] px-3 py-2 font-mono text-xs text-[#991B1B]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-[3px] bg-navy px-5 py-2.5 font-mono text-xs text-surface transition-colors hover:bg-navy-deep disabled:opacity-50"
          >
            {loading ? "Importing…" : "Import students →"}
          </button>
        </form>

        {done && (
          <div className="mt-5 space-y-3">
            {created.length > 0 && (
              <div>
                <p className="mb-2 font-mono text-xs font-semibold text-navy-deep">
                  Created ({created.length})
                </p>
                <div className="divide-y divide-line rounded-[3px] border border-line">
                  {created.map((r, i) => (
                    <div key={i} className="flex items-start justify-between gap-4 px-4 py-2.5">
                      <div>
                        <span className="text-sm font-semibold text-ink">{r.name}</span>
                        <span className="ml-2 font-mono text-xs text-muted">{r.identifier}</span>
                      </div>
                      {r.generatedPassword && (
                        <span className="select-all font-mono text-xs text-brass">
                          pw: {r.generatedPassword}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {created.some((r) => r.generatedPassword) && (
                  <p className="mt-1.5 font-mono text-xs text-muted">
                    Save generated passwords now — they won&apos;t be shown again.
                  </p>
                )}
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
                      <span className="text-sm font-semibold text-ink">{r.name}</span>
                      <span className="ml-2 font-mono text-xs text-muted">{r.identifier}</span>
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
