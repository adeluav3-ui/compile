"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LEVELS = ["JSS1", "JSS2", "JSS3", "SSS1", "SSS2", "SSS3"] as const;

export default function AddClassSection() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [level, setLevel] = useState<string>("");
  const [academicYear, setAcademicYear] = useState(() => {
    const y = new Date().getFullYear();
    return `${y}/${y + 1}`;
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: true; className: string } | { ok: false; error: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const res = await fetch("/api/school/admin/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, level, academicYear }),
    });

    const data = await res.json();
    if (!res.ok) {
      setResult({ ok: false, error: data.error ?? "Failed to create class." });
    } else {
      setResult({ ok: true, className: data.class.name });
      setName("");
      setLevel("");
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <section>
      <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-brass">
        Create Class
      </h2>
      <div className="rounded-[3px] border border-line bg-surface px-5 py-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block font-mono text-xs text-muted">Class name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                placeholder="JSS1 A"
                className="w-full rounded-[3px] border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-xs text-muted">Level</label>
              <select
                required
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                disabled={loading}
                className="w-full rounded-[3px] border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-navy focus:outline-none disabled:opacity-60"
              >
                <option value="" disabled>Select level</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-xs text-muted">Academic year</label>
              <input
                type="text"
                required
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                disabled={loading}
                placeholder="2025/2026"
                pattern="\d{4}/\d{4}"
                className="w-full rounded-[3px] border border-line bg-paper px-3 py-2 font-mono text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none disabled:opacity-60"
              />
            </div>
          </div>

          {result && !result.ok && (
            <p className="rounded-[3px] bg-[#FEF2F2] px-3 py-2 font-mono text-xs text-[#991B1B]">
              {result.error}
            </p>
          )}

          {result && result.ok && (
            <p className="rounded-[3px] border border-navy/20 bg-navy/5 px-3 py-2 font-mono text-xs text-navy-deep">
              Class &quot;{result.className}&quot; created.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-[3px] bg-navy px-5 py-2.5 font-mono text-xs text-surface transition-colors hover:bg-navy-deep disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create class →"}
          </button>
        </form>
      </div>
    </section>
  );
}
