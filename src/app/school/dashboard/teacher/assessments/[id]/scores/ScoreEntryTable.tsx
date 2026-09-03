"use client";

import { useState } from "react";

type ResultRow = {
  resultId: string | null;
  studentId: string;
  studentName: string;
  objScore: number | null;
  objSource: string | null;
  practicalScore: number | null;
  totalScore: number | null;
};

type Props = {
  assessmentId: string;
  objQuestionCount: number;
  deliveryMethod: string;
  initialResults: ResultRow[];
};

export default function ScoreEntryTable({
  assessmentId,
  objQuestionCount,
  deliveryMethod,
  initialResults,
}: Props) {
  const [rows, setRows] = useState<ResultRow[]>(initialResults);
  const [drafts, setDrafts] = useState<Record<string, { obj?: string; practical?: string }>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const needsObjEntry = deliveryMethod !== "in_platform";

  function setDraft(studentId: string, field: "obj" | "practical", value: string) {
    setDrafts((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
    setSaved(false);
  }

  async function saveAll() {
    setSaving(true);
    setError("");
    setSaved(false);

    const entries = rows
      .map((r) => {
        const d = drafts[r.studentId] ?? {};
        const objScore =
          needsObjEntry && d.obj !== undefined
            ? parseInt(d.obj, 10)
            : r.objScore;
        const practicalScore =
          d.practical !== undefined
            ? parseInt(d.practical, 10)
            : r.practicalScore;
        return {
          studentId: r.studentId,
          ...(objScore !== null && !isNaN(objScore as number) && { objScore }),
          ...(practicalScore !== null && !isNaN(practicalScore as number) && { practicalScore }),
        };
      })
      .filter((e) => e.objScore !== undefined || e.practicalScore !== undefined);

    const res = await fetch(`/api/school/assessments/${assessmentId}/results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Save failed.");
      return;
    }

    // Refresh rows from response
    if (Array.isArray(data.results)) {
      setRows(data.results as ResultRow[]);
    }
    setDrafts({});
    setSaved(true);
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-[3px] bg-[#FEF2F2] px-4 py-3 font-mono text-xs text-[#991B1B]">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-[3px] border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper text-left">
              <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">
                Student
              </th>
              {needsObjEntry && (
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">
                  OBJ (/{objQuestionCount})
                </th>
              )}
              {!needsObjEntry && (
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">
                  OBJ Score
                </th>
              )}
              <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">
                Practical (/100)
              </th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => {
              const d = drafts[r.studentId] ?? {};
              const displayObj = needsObjEntry
                ? (d.obj ?? (r.objScore !== null ? String(r.objScore) : ""))
                : (r.objScore !== null ? String(r.objScore) : "—");
              const displayPractical =
                d.practical ?? (r.practicalScore !== null ? String(r.practicalScore) : "");

              return (
                <tr key={r.studentId} className="bg-surface">
                  <td className="px-4 py-3 text-ink">{r.studentName}</td>

                  {needsObjEntry ? (
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        max={objQuestionCount}
                        value={displayObj}
                        onChange={(e) => setDraft(r.studentId, "obj", e.target.value)}
                        placeholder="—"
                        className="w-20 rounded-[3px] border border-line bg-paper px-2 py-1 text-sm text-ink focus:border-navy focus:outline-none"
                      />
                    </td>
                  ) : (
                    <td className="px-4 py-3 font-mono text-xs text-ink">
                      {r.objScore !== null ? `${r.objScore}/${objQuestionCount}` : "—"}
                      {r.objSource === "in_platform" && (
                        <span className="ml-1 text-muted">(auto)</span>
                      )}
                    </td>
                  )}

                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={displayPractical}
                      onChange={(e) => setDraft(r.studentId, "practical", e.target.value)}
                      placeholder="—"
                      className="w-20 rounded-[3px] border border-line bg-paper px-2 py-1 text-sm text-ink focus:border-navy focus:outline-none"
                    />
                  </td>

                  <td className="px-4 py-3 font-mono text-xs font-semibold text-navy-deep">
                    {r.totalScore !== null ? `${r.totalScore}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={saving}
          onClick={saveAll}
          className="rounded-[3px] bg-navy px-5 py-2.5 font-mono text-sm text-surface hover:bg-navy-deep disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save scores"}
        </button>
        {saved && (
          <span className="font-mono text-xs text-emerald-600">Saved.</span>
        )}
      </div>

      <p className="font-mono text-[10px] text-muted">
        Total = (OBJ correct / {objQuestionCount}) × 50 + (practical / 100) × 50
      </p>
    </div>
  );
}
