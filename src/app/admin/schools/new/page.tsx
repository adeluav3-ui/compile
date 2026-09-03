"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo",
  "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa",
  "Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba",
  "Yobe","Zamfara",
];

export default function OnboardSchoolPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    schoolName: "",
    state: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    router.push(`/admin/schools/${data.schoolId}`);
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-semibold text-navy-deep">Onboard a new school</h1>
        <p className="mt-1 text-sm text-muted">
          Creates the school record and the admin&apos;s login credentials immediately.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        {/* School details */}
        <fieldset className="space-y-4 rounded-[3px] border border-line p-5">
          <legend className="px-1 font-mono text-xs uppercase tracking-widest text-brass">
            School
          </legend>

          <div>
            <label className="mb-1.5 block font-mono text-xs text-muted">School name</label>
            <input
              required
              value={form.schoolName}
              onChange={set("schoolName")}
              disabled={loading}
              placeholder="Greenfield Secondary School"
              className="w-full rounded-[3px] border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none disabled:opacity-60"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-xs text-muted">State</label>
            <select
              required
              value={form.state}
              onChange={set("state")}
              disabled={loading}
              className="w-full rounded-[3px] border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:border-navy focus:outline-none disabled:opacity-60"
            >
              <option value="">Select state…</option>
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </fieldset>

        {/* Admin account */}
        <fieldset className="space-y-4 rounded-[3px] border border-line p-5">
          <legend className="px-1 font-mono text-xs uppercase tracking-widest text-brass">
            School Admin Account
          </legend>

          <div>
            <label className="mb-1.5 block font-mono text-xs text-muted">Full name</label>
            <input
              required
              value={form.adminName}
              onChange={set("adminName")}
              disabled={loading}
              placeholder="Mrs. Adaeze Obi"
              className="w-full rounded-[3px] border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none disabled:opacity-60"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-xs text-muted">Email address</label>
            <input
              type="email"
              required
              value={form.adminEmail}
              onChange={set("adminEmail")}
              disabled={loading}
              placeholder="admin@school.edu.ng"
              className="w-full rounded-[3px] border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none disabled:opacity-60"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-xs text-muted">
              Password{" "}
              <span className="text-muted">(share this with the admin directly)</span>
            </label>
            <input
              type="text"
              required
              minLength={8}
              value={form.adminPassword}
              onChange={set("adminPassword")}
              disabled={loading}
              placeholder="Min. 8 characters"
              className="w-full rounded-[3px] border border-line bg-surface px-3 py-2.5 font-mono text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none disabled:opacity-60"
            />
            <p className="mt-1 font-mono text-[10px] text-muted">
              Password is shown in plain text so you can copy it for the admin.
            </p>
          </div>
        </fieldset>

        {error && (
          <div className="rounded-[3px] bg-[#FEF2F2] px-4 py-3 font-mono text-xs text-[#991B1B]">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-[3px] bg-navy px-6 py-2.5 font-mono text-sm text-surface transition-colors hover:bg-navy-deep disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create school →"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            disabled={loading}
            className="rounded-[3px] border border-line px-6 py-2.5 font-mono text-sm text-muted transition-colors hover:border-navy hover:text-navy disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
