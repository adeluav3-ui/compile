import { db } from "@/db";
import {
  lessons,
  lessonReleases,
  submissions,
  assessments,
  assessmentResults,
  studentClasses,
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
      <div className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-line">
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

type ClassInfo = { id: string; name: string; level: string };

// ─── Bulk data fetch ──────────────────────────────────────────────────────────
// One set of parallel queries covering all classes, instead of N×7 queries.

async function fetchAllClassStats(classIds: string[], allClasses: ClassInfo[]): Promise<ClassStat[]> {
  if (classIds.length === 0) return [];

  const [
    [totalRow],
    releaseAggRows,
    allReleaseRows,
    allAssessmentRows,
    pendingSubRows,
    allSubRows,
    studentCountRows,
  ] = await Promise.all([
    // Total curriculum lessons — same for every class, no level filter
    db.select({ n: count() }).from(lessons),

    // Released count + latest release timestamp per class
    db.select({
      classId: lessonReleases.classId,
      n: count(),
      lastAt: max(lessonReleases.releasedAt),
    })
      .from(lessonReleases)
      .where(inArray(lessonReleases.classId, classIds))
      .groupBy(lessonReleases.classId),

    // All releases with lesson info — grouped in JS to find latest per class
    db.select({
      classId: lessonReleases.classId,
      title: lessons.title,
      order: lessons.order,
      releasedAt: lessonReleases.releasedAt,
    })
      .from(lessonReleases)
      .innerJoin(lessons, eq(lessonReleases.lessonId, lessons.id))
      .where(inArray(lessonReleases.classId, classIds))
      .orderBy(desc(lessonReleases.releasedAt)),

    // Non-finalized assessments — first per class (by createdAt DESC) is the active one
    db.select({
      classId: assessments.classId,
      type: assessments.type,
      status: assessments.status,
    })
      .from(assessments)
      .where(and(
        inArray(assessments.classId, classIds),
        ne(assessments.status, "finalized"),
      ))
      .orderBy(desc(assessments.createdAt)),

    // AI-graded submission count per class
    db.select({ classId: submissions.classId, n: count() })
      .from(submissions)
      .where(and(
        inArray(submissions.classId, classIds),
        eq(submissions.status, "ai_graded"),
      ))
      .groupBy(submissions.classId),

    // All submissions ordered by date DESC — first per class is the latest
    db.select({ classId: submissions.classId, submittedAt: submissions.submittedAt })
      .from(submissions)
      .where(inArray(submissions.classId, classIds))
      .orderBy(desc(submissions.submittedAt)),

    // Student count per class
    db.select({ classId: studentClasses.classId, n: count() })
      .from(studentClasses)
      .where(inArray(studentClasses.classId, classIds))
      .groupBy(studentClasses.classId),
  ]);

  const totalLessons = totalRow?.n ?? 0;

  // Group all results by classId
  const releaseByClass = Object.fromEntries(releaseAggRows.map((r) => [r.classId, r]));

  const lastLessonByClass: Record<string, { title: string; order: number; releasedAt: Date }> = {};
  for (const row of allReleaseRows) {
    if (!lastLessonByClass[row.classId]) {
      lastLessonByClass[row.classId] = { title: row.title, order: row.order, releasedAt: new Date(row.releasedAt) };
    }
  }

  const activeAssessmentByClass: Record<string, { type: string; status: string }> = {};
  for (const row of allAssessmentRows) {
    if (!activeAssessmentByClass[row.classId]) {
      activeAssessmentByClass[row.classId] = { type: row.type, status: row.status };
    }
  }

  const pendingSubByClass = Object.fromEntries(pendingSubRows.map((r) => [r.classId, r.n]));

  const lastSubByClass: Record<string, Date> = {};
  for (const row of allSubRows) {
    if (!lastSubByClass[row.classId]) {
      lastSubByClass[row.classId] = new Date(row.submittedAt);
    }
  }

  const studentByClass = Object.fromEntries(studentCountRows.map((r) => [r.classId, r.n]));

  // Pending practical scores — only for classes without an active assessment
  const noActiveIds = classIds.filter((id) => !activeAssessmentByClass[id]);
  const pendingPracticalByClass: Record<string, number> = {};

  if (noActiveIds.length > 0) {
    const finalizedRows = await db
      .select({ classId: assessments.classId, id: assessments.id })
      .from(assessments)
      .where(and(
        inArray(assessments.classId, noActiveIds),
        eq(assessments.status, "finalized"),
      ))
      .orderBy(desc(assessments.createdAt));

    const latestFinalizedByClass: Record<string, string> = {};
    for (const row of finalizedRows) {
      if (!latestFinalizedByClass[row.classId]) latestFinalizedByClass[row.classId] = row.id;
    }

    const finalizedIds = Object.values(latestFinalizedByClass);
    if (finalizedIds.length > 0) {
      const practicalRows = await db
        .select({ assessmentId: assessmentResults.assessmentId, n: count() })
        .from(assessmentResults)
        .where(and(
          inArray(assessmentResults.assessmentId, finalizedIds),
          isNull(assessmentResults.practicalScore),
        ))
        .groupBy(assessmentResults.assessmentId);

      const practicalByAssessment = Object.fromEntries(practicalRows.map((r) => [r.assessmentId, r.n]));
      for (const [classId, assessmentId] of Object.entries(latestFinalizedByClass)) {
        pendingPracticalByClass[classId] = practicalByAssessment[assessmentId] ?? 0;
      }
    }
  }

  return allClasses.map((cls) => {
    const releaseAgg = releaseByClass[cls.id];
    const lastReleaseAt = releaseAgg?.lastAt ? new Date(releaseAgg.lastAt) : null;
    const lastSubAt = lastSubByClass[cls.id] ?? null;
    const lastActivity =
      lastReleaseAt && lastSubAt
        ? lastReleaseAt > lastSubAt ? lastReleaseAt : lastSubAt
        : lastReleaseAt ?? lastSubAt;

    return {
      classId: cls.id,
      className: cls.name,
      level: cls.level,
      totalLessons,
      releasedCount: releaseAgg?.n ?? 0,
      lastLesson: lastLessonByClass[cls.id] ?? null,
      activeAssessment: activeAssessmentByClass[cls.id] ?? null,
      pendingPracticalCount: pendingPracticalByClass[cls.id] ?? 0,
      pendingSubmissions: pendingSubByClass[cls.id] ?? 0,
      lastActivity,
      studentCount: studentByClass[cls.id] ?? 0,
    };
  });
}

// ─── Activity badge ───────────────────────────────────────────────────────────

function ActivityBadge({ stat }: { stat: ClassStat }) {
  if (stat.activeAssessment) {
    const label = stat.activeAssessment.type === "midterm" ? "Midterm" : "Final Exam";
    const status = stat.activeAssessment.status.replace(/_/g, " ");
    return (
      <span className="rounded-xs bg-brass/10 px-2 py-0.5 font-mono text-[10px] text-brass whitespace-nowrap">
        {label} — {status}
      </span>
    );
  }
  if (stat.pendingPracticalCount > 0) {
    return (
      <span className="rounded-xs bg-steel/10 px-2 py-0.5 font-mono text-[10px] text-steel whitespace-nowrap">
        {stat.pendingPracticalCount} practical{stat.pendingPracticalCount !== 1 ? "s" : ""} to score
      </span>
    );
  }
  if (stat.pendingSubmissions > 0) {
    return (
      <span className="rounded-xs bg-brass/10 px-2 py-0.5 font-mono text-[10px] text-brass whitespace-nowrap">
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

export default async function ClassStatusPanel({
  classes: assignedClasses,
}: {
  classes: { id: string; name: string; level: string }[];
}) {
  if (assignedClasses.length === 0) return null;

  const classIds = assignedClasses.map((c) => c.id);
  const stats = await fetchAllClassStats(classIds, assignedClasses);

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
