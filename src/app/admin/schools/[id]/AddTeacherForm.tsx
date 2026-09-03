"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  schoolId: string;
  classes: { id: string; name: string; level: string }[];
};

export default function AddTeacherForm({ schoolId, classes }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    teacherName: "",
    teacherEmail: "",
    teacherPassword: "",
    classId: classes[0]?.id ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const res = await fetch(`/api/admin/schools/${schoolId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
    } else {
      setSuccess(`Teacher account created. Share the email and password with them directly.`);
      setForm({ teacherName: "", teacherEmail: "", teacherPassword: "", classId: classes[0]?.id ?? "" });
      router.refresh();
    }
    setLoading(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-[3px] border border-line bg-paper px-4 py-2 font-mono text-xs text-navy transition-colors hover:border-navy"
      >
        + Add teacher
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-[3px] border border-line bg-paper p-5">
      <p className="font-mono text-xs uppercase tracking-widest text-brass">New Teacher</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block font-mono text-xs text-muted">Full name</label>
          <input
            required
            value={form.teacherName}
            onChange={set("teacherName")}
            disabled={loading}
            placeholder="Adebayo Okafor"
            className="w-full rounded-[3px] border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none disabled:opacity-60"
          />
        </div>
        <div>
          <label className="mb-1.5 block font-mono text-xs text-muted">Email</label>
          <input
            type="email"
            required
            value={form.teacherEmail}
            onChange={set("teacherEmail")}
            disabled={loading}
            placeholder="teacher@school.ng"
            className="w-full rounded-[3px] border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none disabled:opacity-60"
          />
        </div>
        <div>
          <label className="mb-1.5 block font-mono text-xs text-muted">Password</label>
          <input
            type="text"
            required
            minLength={8}
            value={form.teacherPassword}
            onChange={set("teacherPassword")}
            disabled={loading}
            placeholder="Min. 8 characters"
            className="w-full rounded-[3px] border border-line bg-surface px-3 py-2 font-mono text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none disabled:opacity-60"
          />
        </div>
        <div>
          <label className="mb-1.5 block font-mono text-xs text-muted">Assign to class</label>
          <select
            required
            value={form.classId}
            onChange={set("classId")}
            disabled={loading || classes.length === 0}
            className="w-full rounded-[3px] border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-navy focus:outline-none disabled:opacity-60"
          >
            {classes.length === 0 ? (
              <option>No classes yet</option>
            ) : (
              classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.level})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {error && <p className="font-mono text-xs text-[#991B1B]">{error}</p>}
      {success && <p className="font-mono text-xs text-emerald-700">{success}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-[3px] bg-navy px-5 py-2 font-mono text-xs text-surface transition-colors hover:bg-navy-deep disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create teacher account"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(""); setSuccess(""); }}
          disabled={loading}
          className="rounded-[3px] border border-line px-5 py-2 font-mono text-xs text-muted transition-colors hover:border-navy hover:text-navy disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
