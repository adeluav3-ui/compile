import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  schools,
  profiles,
  classes,
  studentClasses,
  teacherAssignments,
  submissions,
  lessonReleases,
} from "@/db/schema";
import { eq, count, avg } from "drizzle-orm";
import Link from "next/link";
import SubscriptionControls from "./SubscriptionControls";
import AddTeacherForm from "./AddTeacherForm";

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  trial: "bg-brass/10 text-brass",
  expired: "bg-[#FEF2F2] text-[#991B1B]",
};

function fmt(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysDiff(date: Date | null): { label: string; urgent: boolean } {
  if (!date) return { label: "No expiry set", urgent: false };
  const diff = Math.ceil((date.getTime() - Date.now()) / 86400000);
  if (diff < 0) return { label: `Expired ${Math.abs(diff)} days ago`, urgent: true };
  if (diff === 0) return { label: "Expires today", urgent: true };
  if (diff <= 14) return { label: `${diff} days remaining`, urgent: true };
  return { label: `${diff} days remaining`, urgent: false };
}

export default async function SchoolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [school] = await db
    .select({
      id: schools.id,
      name: schools.name,
      state: schools.state,
      subscriptionStatus: schools.subscriptionStatus,
      subscriptionExpiresAt: schools.subscriptionExpiresAt,
      licenseKey: schools.licenseKey,
      adminId: schools.adminId,
      adminEmail: profiles.email,
      adminName: profiles.fullName,
      createdAt: schools.createdAt,
    })
    .from(schools)
    .leftJoin(profiles, eq(schools.adminId, profiles.id))
    .where(eq(schools.id, id))
    .limit(1);

  if (!school) notFound();

  const schoolClasses = await db
    .select({ id: classes.id, name: classes.name, level: classes.level })
    .from(classes)
    .where(eq(classes.schoolId, id));

  // Students (distinct, across all classes in this school)
  const studentRows = await db
    .selectDistinct({ profileId: studentClasses.profileId })
    .from(studentClasses)
    .innerJoin(classes, eq(studentClasses.classId, classes.id))
    .where(eq(classes.schoolId, id));

  // Teachers
  const teacherRows = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      email: profiles.email,
      classId: teacherAssignments.classId,
    })
    .from(teacherAssignments)
    .innerJoin(profiles, eq(teacherAssignments.profileId, profiles.id))
    .where(eq(teacherAssignments.schoolId, id));

  // Lessons released (across all classes in school)
  const classIds = schoolClasses.map((c) => c.id);
  let releasedCount = 0;
  if (classIds.length > 0) {
    const [r] = await db
      .select({ n: count() })
      .from(lessonReleases)
      .where(eq(lessonReleases.classId, classIds[0]));
    releasedCount = r?.n ?? 0;
  }

  // Submissions — join through classes to filter by school
  const [{ submissionCount }] = await db
    .select({ submissionCount: count() })
    .from(submissions)
    .innerJoin(classes, eq(submissions.classId, classes.id))
    .where(eq(classes.schoolId, id));

  const [{ avgScore }] = await db
    .select({ avgScore: avg(submissions.aiScore) })
    .from(submissions)
    .innerJoin(classes, eq(submissions.classId, classes.id))
    .where(eq(classes.schoolId, id));

  const expiry = daysDiff(school.subscriptionExpiresAt);

  return (
    <div className="space-y-8">
      {/* Back */}
      <Link href="/admin" className="font-mono text-xs text-muted hover:text-navy">
        ← All schools
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-navy-deep">{school.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {school.state ?? "—"} · Onboarded {fmt(school.createdAt)}
          </p>
        </div>
        <span
          className={`self-start rounded-[2px] px-3 py-1 font-mono text-sm font-semibold uppercase tracking-wider ${STATUS_BADGE[school.subscriptionStatus] ?? "text-muted bg-line"}`}
        >
          {school.subscriptionStatus}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Students", value: studentRows.length },
          { label: "Teachers", value: teacherRows.length },
          { label: "Lessons released", value: releasedCount },
          { label: "Submissions", value: submissionCount },
        ].map((s) => (
          <div key={s.label} className="rounded-[3px] border border-line bg-surface p-5">
            <div className="font-serif text-3xl font-semibold text-navy-deep">{s.value}</div>
            <div className="mt-1 font-mono text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {avgScore !== null && (
        <div className="rounded-[3px] border border-line bg-surface px-5 py-4">
          <span className="font-mono text-xs text-muted">Average submission score: </span>
          <span className="font-semibold text-navy-deep">
            {Math.round(Number(avgScore))}/100
          </span>
        </div>
      )}

      {/* Subscription management */}
      <section className="rounded-[3px] border border-line bg-surface p-6">
        <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-brass">
          Subscription
        </h2>
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Status</p>
            <p className="mt-0.5 font-semibold text-navy-deep capitalize">
              {school.subscriptionStatus}
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Expires</p>
            <p className={`mt-0.5 font-semibold ${expiry.urgent ? "text-[#991B1B]" : "text-navy-deep"}`}>
              {fmt(school.subscriptionExpiresAt)}
            </p>
            <p className="font-mono text-xs text-muted">{expiry.label}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted">License key</p>
            <p className="mt-0.5 font-mono text-sm text-ink">{school.licenseKey ?? "—"}</p>
          </div>
        </div>
        <SubscriptionControls schoolId={id} currentStatus={school.subscriptionStatus} />
      </section>

      {/* Admin contact */}
      <section className="rounded-[3px] border border-line bg-surface p-6">
        <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-brass">
          School Admin
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Name</p>
            <p className="mt-0.5 font-semibold text-navy-deep">{school.adminName ?? "—"}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Email</p>
            <p className="mt-0.5 font-mono text-sm text-ink">{school.adminEmail ?? "—"}</p>
          </div>
        </div>
      </section>

      {/* Classes */}
      {schoolClasses.length > 0 && (
        <section className="rounded-[3px] border border-line bg-surface p-6">
          <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-brass">Classes</h2>
          <div className="space-y-2">
            {schoolClasses.map((cls) => (
              <div
                key={cls.id}
                className="flex items-center justify-between rounded-[3px] border border-line px-4 py-3"
              >
                <div>
                  <span className="font-semibold text-navy-deep">{cls.name}</span>
                  <span className="ml-2 font-mono text-xs text-muted">{cls.level}</span>
                </div>
                <span className="font-mono text-xs text-muted">{cls.id.slice(0, 8)}…</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Teachers */}
      <section className="rounded-[3px] border border-line bg-surface p-6">
        <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-brass">
          Teachers ({teacherRows.length})
        </h2>

        {teacherRows.length > 0 && (
          <div className="mb-6 overflow-hidden rounded-[3px] border border-line">
            <table className="w-full text-sm">
              <thead className="bg-paper">
                <tr>
                  {["Name", "Email", "Class"].map((h) => (
                    <th
                      key={h}
                      className="border-b border-line px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-muted"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teacherRows.map((t) => {
                  const cls = schoolClasses.find((c) => c.id === t.classId);
                  return (
                    <tr key={t.id} className="border-b border-line last:border-b-0">
                      <td className="px-4 py-3 font-semibold text-navy-deep">{t.fullName}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted">{t.email}</td>
                      <td className="px-4 py-3 text-muted">{cls?.name ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <AddTeacherForm schoolId={id} classes={schoolClasses} />
      </section>
    </div>
  );
}
