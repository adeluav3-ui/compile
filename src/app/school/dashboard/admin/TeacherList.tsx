"use client";

import { useState } from "react";

export interface TeacherEntry {
  profileId: string;
  name: string;
  identifier: string;
  classIds: string[];
}

export default function TeacherList({
  initialTeachers,
  classNameById,
}: {
  initialTeachers: TeacherEntry[];
  classNameById: Record<string, string>;
}) {
  const [teachers, setTeachers] = useState(initialTeachers);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove(profileId: string, name: string) {
    if (
      !confirm(
        `Remove ${name} as a teacher? They will lose access immediately. This cannot be undone.`
      )
    )
      return;

    setDeleting(profileId);
    setError(null);

    try {
      const res = await fetch(`/api/school/admin/teachers/${profileId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to remove teacher — try again.");
      } else {
        setTeachers((prev) => prev.filter((t) => t.profileId !== profileId));
      }
    } catch {
      setError("Network error — try again.");
    } finally {
      setDeleting(null);
    }
  }

  if (teachers.length === 0) {
    return <p className="text-sm text-muted">No teachers added yet.</p>;
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-[3px] bg-[#FEF2F2] px-3 py-2 font-mono text-xs text-[#991B1B]">
          {error}
        </p>
      )}
      {teachers.map((t) => (
        <div
          key={t.profileId}
          className="flex flex-col gap-2 rounded-[3px] border border-line bg-surface px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <span className="text-sm font-semibold text-navy-deep">{t.name}</span>
            <span className="ml-2 font-mono text-xs text-muted">{t.identifier}</span>
            <div className="mt-0.5 font-mono text-xs text-muted">
              {t.classIds.length > 0
                ? t.classIds.map((id) => classNameById[id] ?? id).join(", ")
                : "No class assigned"}
            </div>
          </div>
          <button
            onClick={() => void handleRemove(t.profileId, t.name)}
            disabled={deleting === t.profileId}
            className="shrink-0 self-start rounded-[3px] border border-line px-3 py-1.5 font-mono text-xs text-muted hover:border-[#B45309] hover:text-[#B45309] disabled:opacity-50 sm:self-auto"
          >
            {deleting === t.profileId ? "Removing…" : "Remove"}
          </button>
        </div>
      ))}
    </div>
  );
}
