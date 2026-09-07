import { getSchoolSession } from "@/lib/school-session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { assessments, lessons, teacherAssignments, classes } from "@/db/schema";
import { and, eq, asc, inArray } from "drizzle-orm";
import Link from "next/link";

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-line text-muted",
  questions_generated: "bg-brass/10 text-brass",
  reviewed: "bg-steel/10 text-steel",
  finalized: "bg-emerald-50 text-emerald-700",
};

export default async function AssessmentsListPage() {
  const session = await getSchoolSession();
  if (!session || session.role !== "teacher") redirect("/school/login");

  const assignments = await db
    .select({ classId: teacherAssignments.classId })
    .from(teacherAssignments)
    .where(eq(teacherAssignments.profileId, session.profileId));

  const classIds =
    assignments.length > 0
      ? assignments.map((a) => a.classId)
      : session.classId
        ? [session.classId]
        : [];

  const rows =
    classIds.length === 0
      ? []
      : await db
          .select({
            id: assessments.id,
            type: assessments.type,
            status: assessments.status,
            deliveryMethod: assessments.deliveryMethod,
            objQuestionCount: assessments.objQuestionCount,
            createdAt: assessments.createdAt,
            startTitle: lessons.title,
            className: classes.name,
          })
          .from(assessments)
          .innerJoin(lessons, eq(assessments.lessonRangeStartId, lessons.id))
          .innerJoin(classes, eq(assessments.classId, classes.id))
          .where(
            and(
              classIds.length === 1
                ? eq(assessments.classId, classIds[0])
                : inArray(assessments.classId, classIds),
              eq(assessments.teacherId, session.profileId)
            )
          )
          .orderBy(asc(assessments.createdAt));

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/school/dashboard/teacher" className="font-mono text-xs text-muted hover:text-navy">
            ← Dashboard
          </Link>
          <span className="text-line">|</span>
          <span className="font-mono text-xs uppercase tracking-widest text-brass">Assessments</span>
        </div>
        <Link
          href="/school/dashboard/teacher/assessments/new"
          className="rounded-[3px] bg-navy px-4 py-2 font-mono text-xs text-surface hover:bg-navy-deep"
        >
          + New assessment
        </Link>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="mb-6 font-serif text-2xl font-semibold text-navy-deep">Assessments</h1>

        {rows.length === 0 ? (
          <div className="rounded-[3px] border border-line bg-surface p-10 text-center">
            <p className="text-muted">No assessments yet.</p>
            <Link href="/school/dashboard/teacher/assessments/new"
              className="mt-4 inline-block font-mono text-xs text-steel hover:underline">
              Generate your first one →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((a) => (
              <div key={a.id}
                className="flex flex-col gap-3 rounded-[3px] border border-line bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold capitalize text-navy-deep">
                      {a.type === "midterm" ? "Mid-Term" : "Final Exam"}
                    </span>
                    <span className="rounded-xs bg-navy/10 px-2 py-0.5 font-mono text-[10px] text-navy-deep">
                      {a.className}
                    </span>
                    <span className={`rounded-[2px] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${STATUS_BADGE[a.status]}`}>
                      {a.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {a.objQuestionCount} OBJ questions · from &quot;{a.startTitle}&quot; ·{" "}
                    {new Date(a.createdAt).toLocaleDateString("en-NG")}
                  </p>
                </div>
                <Link href={`/school/dashboard/teacher/assessments/${a.id}`}
                  className="self-start font-mono text-xs text-steel hover:underline sm:self-auto">
                  Review / Manage →
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
