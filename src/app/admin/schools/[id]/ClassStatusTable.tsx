import { db } from "@/db";
import {
  classes,
  lessons,
  lessonReleases,
  submissions,
  assessments,
  assessmentResults,
  studentClasses,
} from "@/db/schema";
import { eq, desc, count, and, ne, isNull, max, inArray } from "drizzle-orm";

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
      <div className="h-1.5 w-16 flex-shrink-0 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-navy" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs text-muted">{released}/{total}</span>
    </div>
  );
}

function ActivityBadge({ activeAssessment, pendingPractical, pendingSubmissions }: {
  activeAssessment: { type: string; status: string } | null;
  pendingPractical: number;
  pendingSubmissions: number;
}) {
  if (activeAssessment) {
    const label = activeAssessment.type === "midterm" ? "Midterm" : "Final Exam";
    return (
      <span className="rounded-[2px] bg-brass/10 px-2 py-0.5 font-mono text-[10px] text-brass whitespace-nowrap">
        {label} — {activeAssessment.status.replace(/_/g, " ")}
      </span>
    );
  }
  if (pendingPractical > 0) {
    return (
      <span className="rounded-[2px] bg-steel/10 px-2 py-0.5 font-mono text-[10px] text-steel whitespace-nowrap">
        {pendingPractical} practical{pendingPractical !== 1 ? "s" : ""} to score
      </span>
    );
  }
  if (pendingSubmissions > 0) {
    return (
      <span className="rounded-[2px] bg-brass/10 px-2 py-0.5 font-mono text-[10px] text-brass whitespace-nowrap">
        {pendingSubmissions} to grade
      </span>
    );
  }
  return <span className="font-mono text-[10px] text-muted">—</span>;
}

export default async function ClassStatusTable({ schoolId }: { schoolId: string }) {
  const schoolClasses = await db
    .select({ id: classes.id, name: classes.name, level: classes.level })
    .from(classes)
    .where(eq(classes.schoolId, schoolId));

  if (schoolClasses.length === 0) return null;

  const classIds = schoolClasses.map((c) => c.id);

  const [totalLessonsRow] = await db.select({ n: count() }).from(lessons);
  const totalLessons = totalLessonsRow?.n ?? 0;

  const [releasedRows, lastLessonRows, activeAssessmentRows, pendingSubRows, lastSubRows, studentCountRows] =
    await Promise.all([
      db.select({ classId: lessonReleases.classId, n: count(), lastAt: max(lessonReleases.releasedAt) })
        .from(lessonReleases)
        .where(inArray(lessonReleases.classId, classIds))
        .groupBy(lessonReleases.classId),

      Promise.all(classIds.map((id) =>
        db.select({ classId: lessonReleases.classId, title: lessons.title, order: lessons.order, releasedAt: lessonReleases.releasedAt })
          .from(lessonReleases)
          .innerJoin(lessons, eq(lessonReleases.lessonId, lessons.id))
          .where(eq(lessonReleases.classId, id))
          .orderBy(desc(lessonReleases.releasedAt))
          .limit(1)
          .then(([r]) => r ?? null)
      )),

      Promise.all(classIds.map((id) =>
        db.select({ classId: assessments.classId, type: assessments.type, status: assessments.status })
          .from(assessments)
          .where(and(eq(assessments.classId, id), ne(assessments.status, "finalized")))
          .orderBy(desc(assessments.createdAt))
          .limit(1)
          .then(([r]) => r ?? null)
      )),

      db.select({ classId: submissions.classId, n: count() })
        .from(submissions)
        .where(and(inArray(submissions.classId, classIds), eq(submissions.status, "ai_graded")))
        .groupBy(submissions.classId),

      db.select({ classId: submissions.classId, lastAt: max(submissions.submittedAt) })
        .from(submissions)
        .where(inArray(submissions.classId, classIds))
        .groupBy(submissions.classId),

      db.select({ classId: studentClasses.classId, n: count() })
        .from(studentClasses)
        .where(inArray(studentClasses.classId, classIds))
        .groupBy(studentClasses.classId),
    ]);

  // Build lookup maps
  const releasedMap = Object.fromEntries(releasedRows.map((r) => [r.classId, r]));
  const lastLessonMap = Object.fromEntries(classIds.map((id, i) => [id, lastLessonRows[i]]));
  const activeAssessmentMap = Object.fromEntries(classIds.map((id, i) => [id, activeAssessmentRows[i]]));
  const pendingSubMap = Object.fromEntries(pendingSubRows.map((r) => [r.classId, r.n]));
  const lastSubMap = Object.fromEntries(lastSubRows.map((r) => [r.classId, r.lastAt]));
  const studentCountMap = Object.fromEntries(studentCountRows.map((r) => [r.classId, r.n]));

  // Pending practicals per class (conditional — only when no active assessment)
  const pendingPracticalMap: Record<string, number> = {};
  await Promise.all(classIds.map(async (id) => {
    if (activeAssessmentMap[id]) { pendingPracticalMap[id] = 0; return; }
    const [latest] = await db
      .select({ id: assessments.id })
      .from(assessments)
      .where(and(eq(assessments.classId, id), eq(assessments.status, "finalized")))
      .orderBy(desc(assessments.createdAt))
      .limit(1);
    if (!latest) { pendingPracticalMap[id] = 0; return; }
    const [pr] = await db
      .select({ n: count() })
      .from(assessmentResults)
      .where(and(eq(assessmentResults.assessmentId, latest.id), isNull(assessmentResults.practicalScore)));
    pendingPracticalMap[id] = pr?.n ?? 0;
  }));

  // Sort by last activity desc
  const sorted = [...schoolClasses].sort((a, b) => {
    const aRelease = releasedMap[a.id]?.lastAt ? new Date(releasedMap[a.id].lastAt!).getTime() : 0;
    const aSub = lastSubMap[a.id] ? new Date(lastSubMap[a.id]!).getTime() : 0;
    const bRelease = releasedMap[b.id]?.lastAt ? new Date(releasedMap[b.id].lastAt!).getTime() : 0;
    const bSub = lastSubMap[b.id] ? new Date(lastSubMap[b.id]!).getTime() : 0;
    return Math.max(bRelease, bSub) - Math.max(aRelease, aSub);
  });

  return (
    <div className="overflow-x-auto rounded-[3px] border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-paper">
            {["Class", "Students", "Progress", "Last lesson", "In progress", "Last activity"].map((h) => (
              <th key={h} className="px-5 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-surface">
          {sorted.map((cls) => {
            const released = releasedMap[cls.id];
            const lastLesson = lastLessonMap[cls.id];
            const activeAssessment = activeAssessmentMap[cls.id];
            const lastRelease = released?.lastAt ? new Date(released.lastAt) : null;
            const lastSub = lastSubMap[cls.id] ? new Date(lastSubMap[cls.id]!) : null;
            const lastActivity = lastRelease && lastSub
              ? (lastRelease > lastSub ? lastRelease : lastSub)
              : lastRelease ?? lastSub;

            return (
              <tr key={cls.id} className="border-b border-line last:border-b-0">
                <td className="px-5 py-4">
                  <p className="font-semibold text-navy-deep">{cls.name}</p>
                  <p className="font-mono text-xs text-muted">{cls.level}</p>
                </td>
                <td className="px-5 py-4 font-mono text-xs text-ink">
                  {studentCountMap[cls.id] ?? 0}
                </td>
                <td className="px-5 py-4">
                  <ProgressBar released={released?.n ?? 0} total={totalLessons} />
                </td>
                <td className="px-5 py-4">
                  {lastLesson ? (
                    <>
                      <p className="text-ink">L{lastLesson.order} — {lastLesson.title}</p>
                      <p className="font-mono text-[10px] text-muted">{timeAgo(lastLesson.releasedAt)}</p>
                    </>
                  ) : (
                    <span className="font-mono text-xs text-muted">None</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <ActivityBadge
                    activeAssessment={activeAssessment ?? null}
                    pendingPractical={pendingPracticalMap[cls.id] ?? 0}
                    pendingSubmissions={pendingSubMap[cls.id] ?? 0}
                  />
                </td>
                <td className="px-5 py-4 font-mono text-xs text-muted">
                  {timeAgo(lastActivity)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
