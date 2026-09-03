import { getSchoolSession } from "@/lib/school-session";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { assessments, assessmentQuestions, assessmentResults, lessons } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";
import Link from "next/link";
import MCQAssessment from "./MCQAssessment";

export default async function StudentAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSchoolSession();
  if (!session || session.role !== "student") redirect("/school/login");

  const { id } = await params;

  const [assessment] = await db.select().from(assessments)
    .where(and(
      eq(assessments.id, id),
      eq(assessments.classId, session.classId!),
    )).limit(1);

  if (!assessment) notFound();

  if (assessment.status !== "finalized" || assessment.deliveryMethod !== "in_platform") {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <p className="text-sm text-muted">This assessment is not available in-platform.</p>
          <Link href="/school/dashboard/student" className="mt-4 inline-block font-mono text-xs text-steel hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const [existing] = await db.select().from(assessmentResults)
    .where(and(
      eq(assessmentResults.assessmentId, id),
      eq(assessmentResults.studentId, session.profileId),
    )).limit(1);

  const alreadySubmitted = existing?.objScore !== null && existing?.objScore !== undefined;

  const questions = await db.select().from(assessmentQuestions)
    .where(eq(assessmentQuestions.assessmentId, id))
    .orderBy(asc(assessmentQuestions.orderIndex));

  const [startLesson] = await db.select({ title: lessons.title, order: lessons.order })
    .from(lessons).where(eq(lessons.id, assessment.lessonRangeStartId)).limit(1);
  const [endLesson] = await db.select({ title: lessons.title, order: lessons.order })
    .from(lessons).where(eq(lessons.id, assessment.lessonRangeEndId)).limit(1);

  const typeLabel = assessment.type === "midterm" ? "Mid-Term Assessment" : "Final Exam";

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3 sm:px-6">
        <Link href="/school/dashboard/student" className="font-mono text-xs text-muted hover:text-navy">
          ← Dashboard
        </Link>
        <span className="text-line">|</span>
        <span className="font-mono text-xs uppercase tracking-widest text-brass">{typeLabel}</span>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6">
          <h1 className="font-serif text-2xl font-semibold text-navy-deep">{typeLabel}</h1>
          <p className="mt-1 text-sm text-muted">
            Lessons {startLesson?.order}–{endLesson?.order} · {assessment.objQuestionCount} questions
          </p>
        </div>

        {alreadySubmitted ? (
          <div className="rounded-[3px] border border-line bg-surface p-8 text-center space-y-3">
            <p className="font-semibold text-navy-deep">Submitted</p>
            <p className="text-sm text-muted">
              OBJ score: {existing.objScore}/{assessment.objQuestionCount}
            </p>
            {existing.totalScore !== null && (
              <p className="font-mono text-sm text-navy-deep">
                Total: {existing.totalScore}%
              </p>
            )}
            {existing.totalScore === null && (
              <p className="font-mono text-xs text-muted">
                Practical not yet scored — check back later.
              </p>
            )}
          </div>
        ) : (
          <MCQAssessment
            assessmentId={id}
            questions={questions.map((q) => ({
              id: q.id,
              orderIndex: q.orderIndex,
              questionText: q.questionText,
              options: q.options as string[],
            }))}
            practicalPrompt={assessment.practicalPrompt}
          />
        )}
      </main>
    </div>
  );
}
