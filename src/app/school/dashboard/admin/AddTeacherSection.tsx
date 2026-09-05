"use client";

import { useState } from "react";

interface ClassOption {
  id: string;
  name: string;
}

export default function AddTeacherSection({ classes }: { classes: ClassOption[] }) {
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: true; generatedPassword?: string } | { ok: false; error: string } | null>(null);

  function toggleClass(id: string) {
    setSelectedClassIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const res = await fetch("/api/school/admin/teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, identifier, password, classIds: selectedClassIds }),
    });

    const data = await res.json();
    if (!res.ok) {
      setResult({ ok: false, error: data.error ?? "Failed to create teacher." });
    } else {
      setResult({ ok: true, generatedPassword: data.generatedPassword });
      setName("");
      setIdentifier("");
      setPassword("");
      setSelectedClassIds([]);
    }

    setLoading(false);
  }

  return (
    <section>
      <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-brass">
        Add Teacher
      </h2>
      <div className="rounded-[3px] border border-line bg-surface px-5 py-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block font-mono text-xs text-muted">Full name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                placeholder="Adaeze Okonkwo"
                className="w-full rounded-[3px] border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none disabled:opacity-60"
              />
            </div>
            <div>
              <label className="mb-1.5 block font-mono text-xs text-muted">Email or username</label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={loading}
                placeholder="adaeze or adaeze@school.edu.ng"
                className="w-full rounded-[3px] border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-xs text-muted">
              Password <span className="text-muted">(leave blank to auto-generate)</span>
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="auto-generate"
              className="w-full rounded-[3px] border border-line bg-paper px-3 py-2 font-mono text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none disabled:opacity-60"
            />
          </div>

          {classes.length > 0 && (
            <div>
              <label className="mb-1.5 block font-mono text-xs text-muted">Assign to class(es)</label>
              <div className="flex flex-wrap gap-2">
                {classes.map((cls) => (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => toggleClass(cls.id)}
                    className={`rounded-[3px] px-3 py-1.5 font-mono text-xs transition-colors ${
                      selectedClassIds.includes(cls.id)
                        ? "bg-navy text-surface"
                        : "border border-line bg-paper text-muted hover:border-navy hover:text-navy"
                    }`}
                  >
                    {cls.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {result && !result.ok && (
            <p className="rounded-[3px] bg-[#FEF2F2] px-3 py-2 font-mono text-xs text-[#991B1B]">
              {result.error}
            </p>
          )}

          {result && result.ok && (
            <div className="rounded-[3px] border border-navy/20 bg-navy/5 px-3 py-2">
              <p className="font-mono text-xs text-navy-deep">Teacher account created.</p>
              {result.generatedPassword && (
                <p className="mt-1 font-mono text-xs text-muted">
                  Generated password: <span className="select-all font-semibold text-ink">{result.generatedPassword}</span>
                  {" "}— share this with the teacher now; it won&apos;t be shown again.
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-[3px] bg-navy px-5 py-2.5 font-mono text-xs text-surface transition-colors hover:bg-navy-deep disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create teacher account →"}
          </button>
        </form>
      </div>
    </section>
  );
}
