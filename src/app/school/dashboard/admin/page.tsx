import { getSchoolSession } from "@/lib/school-session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  schools,
  classes,
  studentClasses,
  teacherAssignments,
  lessons,
  lessonReleases,
  submissions,
  profiles,
} from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import Link from "next/link";

export default async function AdminDashboard() {
  const session = await getSchoolSession();
  if (!session || session.role !== "school_admin") redirect("/school/login");

  const schoolId = session.schoolId;

  // School record
  const [school] = await db.select().from(schools).where(eq(schools.id, schoolId));

  // All classes for this school
  const allClasses = await db
    .select()
    .from(classes)
    .where(eq(classes.schoolId, schoolId))
    .orderBy(classes.name);

  // Teacher name per class
  const teacherRows = await db
    .select({
      classId: teacherAssignments.classId,
      teacherName: profiles.fullName,
    })
    .from(teacherAssignments)
    .innerJoin(profiles, eq(teacherAssignments.profileId, profiles.id))
    .where(eq(teacherAssignments.schoolId, schoolId));

  const teacherByClass = Object.fromEntries(
    teacherRows.map((r) => [r.classId, r.teacherName])
  );

  // Student count per class
  const studentCountRows = await db
    .select({
      classId: studentClasses.classId,
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(studentClasses)
    .innerJoin(classes, eq(studentClasses.classId, classes.id))
    .where(eq(classes.schoolId, schoolId))
    .groupBy(studentClasses.classId);

  const studentCountByClass = Object.fromEntries(
    studentCountRows.map((r) => [r.classId, r.count])
  );

  // Released lesson count per class
  const releaseCountRows = await db
    .select({
      classId: lessonReleases.classId,
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(lessonReleases)
    .innerJoin(classes, eq(lessonReleases.classId, classes.id))
    .where(eq(classes.schoolId, schoolId))
    .groupBy(lessonReleases.classId);

  const releasedByClass = Object.fromEntries(
    releaseCountRows.map((r) => [r.classId, r.count])
  );

  // Total lesson count for the school's levels
  const totalLessonCount = await db
    .select({ count: sql<number>`count(*)::int`.as("count") })
    .from(lessons);

  const totalLessons = totalLessonCount[0]?.count ?? 0;

  // School-wide submission stats
  const submissionStats = await db
    .select({
      status: submissions.status,
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(submissions)
    .innerJoin(classes, eq(submissions.classId, classes.id))
    .where(eq(classes.schoolId, schoolId))
    .groupBy(submissions.status);

  const statsByStatus = Object.fromEntries(
    submissionStats.map((s) => [s.status, s.count])
  );

  const totalSubmissions =
    (statsByStatus["submitted"] ?? 0) +
    (statsByStatus["ai_graded"] ?? 0) +
    (statsByStatus["teacher_confirmed"] ?? 0);

  // Total students across school
  const totalStudents = Object.values(studentCountByClass).reduce((a, b) => a + b, 0);

  const isActive =
    school?.subscriptionStatus === "active" &&
    (!school.subscriptionExpiresAt || new Date(school.subscriptionExpiresAt) > new Date());

  return (
    <div className="min-h-screen bg-paper">
      {/* Nav */}
      <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="font-mono text-xs tracking-widest text-brass uppercase">Compile</span>
          <span className="hidden text-line sm:inline">|</span>
          <span className="hidden text-sm text-muted sm:inline">School Edition</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="max-w-[100px] truncate text-sm font-semibold text-navy-deep sm:max-w-none">{session.name}</span>
          <span className="rounded bg-brass/10 px-2 py-0.5 font-mono text-xs text-brass">
            Admin
          </span>
          <Link href="/school/login" className="hidden text-xs text-muted transition-colors hover:text-navy sm:block">
            Switch account
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-10 px-6 py-8">
        {/* School header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-navy-deep">
              {school?.name ?? "Your School"}
            </h1>
            <p className="mt-1 text-sm text-muted">{school?.state} · {school?.address ?? "School Edition"}</p>
          </div>
          <div className={`rounded-[3px] px-3 py-1.5 font-mono text-xs ${
            isActive
              ? "bg-navy-deep/10 text-navy-deep"
              : "bg-brass/10 text-brass"
          }`}>
            {isActive ? "Subscription active" : "Subscription inactive"}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Classes", value: allClasses.length },
            { label: "Students", value: totalStudents },
            { label: "Lessons available", value: totalLessons },
            { label: "Submissions", value: totalSubmissions },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-[3px] border border-line bg-surface px-5 py-4 text-center"
            >
              <div className="font-serif text-3xl font-bold text-navy-deep">{s.value}</div>
              <div className="mt-1 text-xs text-muted">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Classes */}
        <section>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-brass">
            Classes
          </h2>
          <div className="space-y-2">
            {allClasses.map((cls) => {
              const students = studentCountByClass[cls.id] ?? 0;
              const released = releasedByClass[cls.id] ?? 0;
              const teacher = teacherByClass[cls.id];
              return (
                <div
                  key={cls.id}
                  className="flex flex-col gap-3 rounded-[3px] border border-line bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="text-sm font-semibold text-navy-deep">{cls.name}</div>
                    <div className="mt-0.5 text-xs text-muted">
                      {cls.level} · {cls.academicYear}
                      {teacher && ` · Teacher: ${teacher}`}
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <div className="font-mono text-sm text-navy-deep">
                      {students} student{students !== 1 ? "s" : ""}
                    </div>
                    <div className="mt-0.5 font-mono text-xs text-muted">
                      {released}/{totalLessons} lessons released
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Submission overview */}
        <section>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-brass">
            Submissions — School Overview
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: "Submitted", value: statsByStatus["submitted"] ?? 0, note: "Awaiting AI grade" },
              { label: "AI graded", value: statsByStatus["ai_graded"] ?? 0, note: "Awaiting teacher review" },
              { label: "Confirmed", value: statsByStatus["teacher_confirmed"] ?? 0, note: "Teacher signed off" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-[3px] border border-line bg-surface px-5 py-4"
              >
                <div className="font-serif text-2xl font-bold text-navy-deep">{s.value}</div>
                <div className="mt-1 text-xs font-semibold text-ink">{s.label}</div>
                <div className="mt-0.5 text-xs text-muted">{s.note}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Subscription details */}
        <section>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-brass">
            Subscription
          </h2>
          <div className="rounded-[3px] border border-line bg-surface px-5 py-4">
            <div className="grid grid-cols-2 gap-y-3 text-sm sm:grid-cols-3">
              <div>
                <div className="font-mono text-xs text-muted">Status</div>
                <div className="mt-0.5 font-semibold text-navy-deep capitalize">
                  {school?.subscriptionStatus ?? "—"}
                </div>
              </div>
              <div>
                <div className="font-mono text-xs text-muted">Expires</div>
                <div className="mt-0.5 font-semibold text-navy-deep">
                  {school?.subscriptionExpiresAt
                    ? new Date(school.subscriptionExpiresAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "—"}
                </div>
              </div>
              <div>
                <div className="font-mono text-xs text-muted">License key</div>
                <div className="mt-0.5 font-mono text-xs text-ink">
                  {school?.licenseKey ?? "—"}
                </div>
              </div>
            </div>
            <div className="mt-4 border-t border-line pt-4">
              <a
                href="mailto:compile100@gmail.com"
                className="text-xs text-steel transition-colors hover:text-navy"
              >
                Contact Compile to renew or upgrade →
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
