import { getSchoolSession } from "@/lib/school-session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { classes, lessons, lessonReleases, assessments, assessmentResults } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import DashboardHeader from "@/components/school/DashboardHeader";

export default async function StudentDashboard() {
  const session = await getSchoolSession();
  if (!session || session.role !== "student") redirect("/school/login");
  if (session.subscriptionBlocked) redirect("/school/suspended");

  const classId = session.classId!;
  const [cls] = await db.select().from(classes).where(eq(classes.id, classId));

  const availableAssessments = await db
    .select({
      id: assessments.id,
      type: assessments.type,
      objQuestionCount: assessments.objQuestionCount,
    })
    .from(assessments)
    .where(and(
      eq(assessments.classId, classId),
      eq(assessments.status, "finalized"),
      eq(assessments.deliveryMethod, "in_platform"),
    ));

  const myResults = availableAssessments.length > 0
    ? await db
        .select({
          assessmentId: assessmentResults.assessmentId,
          objScore: assessmentResults.objScore,
          totalScore: assessmentResults.totalScore,
        })
        .from(assessmentResults)
        .where(eq(assessmentResults.studentId, session.profileId))
    : [];

  const resultMap = Object.fromEntries(myResults.map((r) => [r.assessmentId, r]));

  const releasedLessons = await db
    .select({
      id: lessons.id,
      title: lessons.title,
      description: lessons.description,
      order: lessons.order,
      notesUrl: lessons.notesUrl,
    })
    .from(lessonReleases)
    .innerJoin(lessons, eq(lessonReleases.lessonId, lessons.id))
    .where(eq(lessonReleases.classId, classId))
    .orderBy(lessons.order);

  return (
    <div className="min-h-screen bg-paper">
      <DashboardHeader name={session.name} role="student" isReal={session.isReal} />

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-2xl font-semibold text-navy-deep">
            {cls?.name ?? "My Class"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {cls?.level} · {cls?.academicYear}
          </p>
        </div>

        {availableAssessments.length > 0 && (
          <section>
            <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-brass">
              Assessments
            </h2>
            <div className="space-y-2">
              {availableAssessments.map((a) => {
                const result = resultMap[a.id];
                const submitted = result?.objScore !== null && result?.objScore !== undefined;
                return (
                  <Link
                    key={a.id}
                    href={`/school/dashboard/student/assessments/${a.id}`}
                    className="group flex items-center justify-between rounded-[3px] border border-line bg-surface px-5 py-4 transition-colors hover:border-navy"
                  >
                    <div>
                      <div className="text-sm font-semibold text-navy-deep group-hover:text-navy">
                        {a.type === "midterm" ? "Mid-Term Assessment" : "Final Exam"}
                      </div>
                      <div className="mt-0.5 font-mono text-xs text-muted">
                        {a.objQuestionCount} questions
                      </div>
                    </div>
                    {submitted ? (
                      <span className="font-mono text-xs text-emerald-700">
                        {result.totalScore !== null ? `${result.totalScore}%` : "Submitted"}
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-steel group-hover:text-navy">
                        Take →
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-brass">
            Lessons
          </h2>

          {releasedLessons.length === 0 ? (
            <div className="rounded-[3px] border border-line bg-surface px-5 py-10 text-center">
              <p className="text-sm text-muted">
                No lessons released yet.
              </p>
              <p className="mt-1 text-xs text-muted">
                Check back after your teacher unlocks them.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {releasedLessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/school/dashboard/student/lesson/${lesson.id}`}
                  className="group flex items-center justify-between rounded-[3px] border border-line bg-surface px-5 py-4 transition-colors hover:border-navy"
                >
                  <div>
                    <div className="text-sm font-semibold text-navy-deep group-hover:text-navy">
                      Lesson {lesson.order}: {lesson.title}
                    </div>
                    {lesson.description && (
                      <div className="mt-0.5 text-xs text-muted">
                        {lesson.description}
                      </div>
                    )}
                  </div>
                  <span className="text-muted transition-colors group-hover:text-navy">
                    →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
