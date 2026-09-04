import { db } from "@/db";
import {
  classes,
  lessons,
  lessonReleases,
  submissions,
  assessments,
  assessmentResults,
  studentClasses,
  teacherAssignments,
} from "@/db/schema";
import { eq, desc, count, and, ne, isNull, max, inArray } from "drizzle-orm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

function ProgressBar({ released, total }: { released: number; total: number }) {
  const pct = total > 0 ? Math.round((released / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 flex-shrink-0 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-navy transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs text-muted">{released}/{total}</span>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ClassStat = {
  classId: string;
  className: string;
  level: string;
  totalLessons: number;
  releasedCount: number;
  lastLesson: { title: string; order: number; releasedAt: Date } | null;
  activeAssessment: { type: string; status: string } | null;
  pendingPracticalCount: number;
  pendingSubmissions: number;
  lastActivity: Date | null;
  studentCount: number;
};

// ─── Per-class data fetch ─────────────────────────────────────────────────────

async function fetchClassStats(cls: { id: string; name: string; level: string }): Promise<ClassStat> {
  const [
    [totalRow],
    [releasedRow],
    [lastLessonRow],
    [activeAssessmentRow],
    [pendingSubRow],
    [lastSubRow],
    [studentRow],
  ] = await Promise.all([
    db.select({ n: count() }).from(lessons).where(eq(lessons.level, cls.level as "JSS1" | "JSS2" | "JSS3" | "SSS1" | "SSS2" | "SSS3")),

    db.select({ n: count(), lastAt: max(lessonReleases.releasedAt) })
      .from(lessonReleases)
      .where(eq(lessonReleases.classId, cls.id)),

    db.select({ title: lessons.title, order: lessons.order, releasedAt: lessonReleases.releasedAt })
      .from(lessonReleases)
      .innerJoin(lessons, eq(lessonReleases.lessonId, lessons.id))
      .where(eq(lessonReleases.classId, cls.id))
      .orderBy(desc(lessonReleases.releasedAt))
      .limit(1),

    db.select({ id: assessments.id, type: assessments.type, status: assessments.status })
      .from(assessments)
      .where(and(eq(assessments.classId, cls.id), ne(assessments.status, "finalized")))
      .orderBy(desc(assessments.createdAt))
      .limit(1),

    db.select({ n: count() })
      .from(submissions)
      .where(and(eq(submissions.classId, cls.id), eq(submissions.status, "ai_graded"))),

    db.select({ submittedAt: submissions.submittedAt })
      .from(submissions)
      .where(eq(submissions.classId, cls.id))
      .orderBy(desc(submissions.submittedAt))
      .limit(1),

    db.select({ n: count() })
      .from(studentClasses)
      .where(eq(studentClasses.classId, cls.id)),
  ]);

  // Pending practical scores on most recently finalized assessment
  let pendingPracticalCount = 0;
  if (!activeAssessmentRow) {
    const [latestFinalized] = await db
      .select({ id: assessments.id })
      .from(assessments)
      .where(and(eq(assessments.classId, cls.id), eq(assessments.status, "finalized")))
      .orderBy(desc(assessments.createdAt))
      .limit(1);

    if (latestFinalized) {
      const [pr] = await db
        .select({ n: count() })
        .from(assessmentResults)
        .where(and(
          eq(assessmentResults.assessmentId, latestFinalized.id),
          isNull(assessmentResults.practicalScore),
        ));
      pendingPracticalCount = pr?.n ?? 0;
    }
  }

  const lastReleaseAt = releasedRow?.lastAt ? new Date(releasedRow.lastAt) : null;
  const lastSubAt = lastSubRow?.submittedAt ? new Date(lastSubRow.submittedAt) : null;
  const lastActivity =
    lastReleaseAt && lastSubAt
      ? (lastReleaseAt > lastSubAt ? lastReleaseAt : lastSubAt)
      : lastReleaseAt ?? lastSubAt;

  return {
    classId: cls.id,
    className: cls.name,
    level: cls.level,
    totalLessons: totalRow?.n ?? 0,
    releasedCount: releasedRow?.n ?? 0,
    lastLesson: lastLessonRow
      ? { title: lastLessonRow.title, order: lastLessonRow.order, releasedAt: new Date(lastLessonRow.releasedAt) }
      : null,
    activeAssessment: activeAssessmentRow ?? null,
    pendingPracticalCount,
    pendingSubmissions: pendingSubRow?.n ?? 0,
    lastActivity,
    studentCount: studentRow?.n ?? 0,
  };
}

// ─── Activity badge ───────────────────────────────────────────────────────────

function ActivityBadge({ stat }: { stat: ClassStat }) {
  if (stat.activeAssessment) {
    const label = stat.activeAssessment.type === "midterm" ? "Midterm" : "Final Exam";
    const status = stat.activeAssessment.status.replace(/_/g, " ");
    return (
      <span className="rounded-[2px] bg-brass/10 px-2 py-0.5 font-mono text-[10px] text-brass whitespace-nowrap">
        {label} — {status}
      </span>
    );
  }
  if (stat.pendingPracticalCount > 0) {
    return (
      <span className="rounded-[2px] bg-steel/10 px-2 py-0.5 font-mono text-[10px] text-steel whitespace-nowrap">
        {stat.pendingPracticalCount} practical{stat.pendingPracticalCount !== 1 ? "s" : ""} to score
      </span>
    );
  }
  if (stat.pendingSubmissions > 0) {
    return (
      <span className="rounded-[2px] bg-brass/10 px-2 py-0.5 font-mono text-[10px] text-brass whitespace-nowrap">
        {stat.pendingSubmissions} submission{stat.pendingSubmissions !== 1 ? "s" : ""} to grade
      </span>
    );
  }
  return <span className="font-mono text-[10px] text-muted">All clear</span>;
}

// ─── Single-class card ────────────────────────────────────────────────────────

function SingleClassCard({ stat }: { stat: ClassStat }) {
  const pct = stat.totalLessons > 0
    ? Math.round((stat.releasedCount / stat.totalLessons) * 100)
    : 0;

  return (
    <div className="rounded-[3px] border border-line bg-surface p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-navy-deep">{stat.className}</p>
          <p className="font-mono text-xs text-muted">{stat.level} · {stat.studentCount} students</p>
        </div>
        <ActivityBadge stat={stat} />
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted">Progress</p>
          <ProgressBar released={stat.releasedCount} total={stat.totalLessons} />
          <p className="mt-1 font-mono text-[10px] text-muted">{pct}% of curriculum released</p>
        </div>

        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted">Last lesson released</p>
          {stat.lastLesson ? (
            <>
              <p className="text-sm text-ink">
                Lesson {stat.lastLesson.order} — {stat.lastLesson.title}
              </p>
              <p className="font-mono text-[10px] text-muted">{timeAgo(stat.lastLesson.releasedAt)}</p>
            </>
          ) : (
            <p className="font-mono text-xs text-muted">No lessons released yet</p>
          )}
        </div>

        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted">Last activity</p>
          <p className="font-mono text-sm text-ink">{timeAgo(stat.lastActivity)}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Multi-class table ────────────────────────────────────────────────────────

function MultiClassTable({ stats }: { stats: ClassStat[] }) {
  return (
    <div className="overflow-x-auto rounded-[3px] border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-paper">
            {["Class", "Progress", "Last lesson", "In progress", "Last activity"].map((h) => (
              <th key={h} className="px-5 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-surface">
          {stats.map((stat) => (
            <tr key={stat.classId} className="border-b border-line last:border-b-0">
              <td className="px-5 py-4">
                <p className="font-semibold text-navy-deep">{stat.className}</p>
                <p className="font-mono text-xs text-muted">{stat.level} · {stat.studentCount} students</p>
              </td>
              <td className="px-5 py-4">
                <ProgressBar released={stat.releasedCount} total={stat.totalLessons} />
              </td>
              <td className="px-5 py-4">
                {stat.lastLesson ? (
                  <>
                    <p className="text-ink">L{stat.lastLesson.order} — {stat.lastLesson.title}</p>
                    <p className="font-mono text-[10px] text-muted">{timeAgo(stat.lastLesson.releasedAt)}</p>
                  </>
                ) : (
                  <span className="font-mono text-xs text-muted">None</span>
                )}
              </td>
              <td className="px-5 py-4"><ActivityBadge stat={stat} /></td>
              <td className="px-5 py-4 font-mono text-xs text-muted">{timeAgo(stat.lastActivity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default async function ClassStatusPanel({ teacherProfileId }: { teacherProfileId: string }) {
  const assignments = await db
    .select({ classId: teacherAssignments.classId })
    .from(teacherAssignments)
    .where(eq(teacherAssignments.profileId, teacherProfileId));

  if (assignments.length === 0) return null;

  const classIds = assignments.map((a) => a.classId);

  const allClasses = await db
    .select({ id: classes.id, name: classes.name, level: classes.level })
    .from(classes)
    .where(classIds.length === 1 ? eq(classes.id, classIds[0]) : inArray(classes.id, classIds));

  const stats = await Promise.all(allClasses.map(fetchClassStats));

  stats.sort((a, b) => {
    if (!a.lastActivity && !b.lastActivity) return 0;
    if (!a.lastActivity) return 1;
    if (!b.lastActivity) return -1;
    return b.lastActivity.getTime() - a.lastActivity.getTime();
  });

  return (
    <section>
      <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-brass">
        Class Status
      </h2>
      {stats.length === 1
        ? <SingleClassCard stat={stats[0]} />
        : <MultiClassTable stats={stats} />}
    </section>
  );
}
