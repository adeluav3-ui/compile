"use client";

import { useState } from "react";

export type StudentRow = {
  profileId: string;
  classId: string;
  className: string;
  fullName: string | null;
  username: string | null;
  submissionCount: number;
  lastActive: string | null;
  enrolledAt: string;
};

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

type PendingAction =
  | { type: "remove"; student: StudentRow }
  | { type: "delete"; student: StudentRow };

export default function StudentList({ initialStudents }: { initialStudents: StudentRow[] }) {
  const [students, setStudents] = useState(initialStudents);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!pending) return;
    setLoading(true);
    setError(null);

    const { student, type } = pending;
    const url = `/api/school/teacher/students/${student.profileId}?classId=${student.classId}${type === "delete" ? "&deleteAccount=true" : ""}`;

    try {
      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      if (type === "delete") {
        // Remove all rows for this profile (account gone)
        setStudents((prev) => prev.filter((s) => s.profileId !== student.profileId));
      } else {
        // Remove just this class enrollment
        setStudents((prev) =>
          prev.filter((s) => !(s.profileId === student.profileId && s.classId === student.classId))
        );
      }
      setPending(null);
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  }

  // Group by class
  const byClass = new Map<string, { className: string; rows: StudentRow[] }>();
  for (const s of students) {
    if (!byClass.has(s.classId)) byClass.set(s.classId, { className: s.className, rows: [] });
    byClass.get(s.classId)!.rows.push(s);
  }

  const totalCount = students.length;

  return (
    <section>
      <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-brass">
        Students ({totalCount})
      </h2>

      {/* Confirmation panel */}
      {pending && (
        <div className="mb-4 rounded-[3px] border border-line bg-surface px-5 py-4">
          {pending.type === "remove" ? (
            <p className="text-sm text-ink">
              Remove{" "}
              <span className="font-semibold text-navy-deep">
                {pending.student.fullName ?? pending.student.username}
              </span>{" "}
              from <span className="font-semibold">{pending.student.className}</span>? Their account
              stays active — they just lose access to this class.
            </p>
          ) : (
            <p className="text-sm text-ink">
              Permanently delete{" "}
              <span className="font-semibold text-navy-deep">
                {pending.student.fullName ?? pending.student.username}
              </span>
              's account? This removes them from all classes and deletes all their submissions. This
              cannot be undone.
            </p>
          )}
          {error && (
            <p className="mt-2 font-mono text-xs text-[#991B1B]">{error}</p>
          )}
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={confirm}
              disabled={loading}
              className={`rounded-[3px] px-4 py-2 font-mono text-xs text-surface transition-colors disabled:opacity-50 ${
                pending.type === "delete"
                  ? "bg-[#991B1B] hover:bg-[#7F1D1D]"
                  : "bg-navy hover:bg-navy-deep"
              }`}
            >
              {loading
                ? "Working…"
                : pending.type === "delete"
                  ? "Delete permanently"
                  : "Remove from class"}
            </button>
            <button
              onClick={() => { setPending(null); setError(null); }}
              disabled={loading}
              className="font-mono text-xs text-muted hover:text-ink disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {totalCount === 0 ? (
        <p className="text-sm text-muted">No students enrolled yet.</p>
      ) : (
        <div className="space-y-6">
          {[...byClass.entries()].map(([classId, { className, rows }]) => (
            <div key={classId}>
              <p className="mb-2 font-mono text-xs font-semibold text-navy-deep">
                {className} — {rows.length} student{rows.length !== 1 ? "s" : ""}
              </p>
              <div className="overflow-x-auto rounded-[3px] border border-line">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line bg-paper text-left">
                      <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-muted">Name</th>
                      <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-muted">Username</th>
                      <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-muted">Submissions</th>
                      <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-muted">Last active</th>
                      <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-muted">Enrolled</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-surface">
                    {rows.map((s) => {
                      const isPending =
                        pending?.student.profileId === s.profileId &&
                        pending?.student.classId === s.classId;
                      return (
                        <tr
                          key={`${s.profileId}-${s.classId}`}
                          className={isPending ? "bg-paper" : ""}
                        >
                          <td className="px-4 py-3 font-semibold text-navy-deep">
                            {s.fullName ?? "—"}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted select-all">
                            {s.username ?? "—"}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-ink">
                            {s.submissionCount}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted">
                            {timeAgo(s.lastActive)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted">
                            {new Date(s.enrolledAt).toLocaleDateString("en-NG", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3 justify-end">
                              <button
                                onClick={() => setPending({ type: "remove", student: s })}
                                disabled={loading}
                                className="font-mono text-xs text-muted transition-colors hover:text-navy disabled:opacity-40"
                              >
                                Remove
                              </button>
                              <button
                                onClick={() => setPending({ type: "delete", student: s })}
                                disabled={loading}
                                className="font-mono text-xs text-[#991B1B] opacity-60 transition-opacity hover:opacity-100 disabled:opacity-30"
                              >
                                Delete account
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
