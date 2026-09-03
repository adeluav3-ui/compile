import { getSchoolSession } from "@/lib/school-session";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { assessments, assessmentQuestions, lessons } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";
import Link from "next/link";
import AssessmentControls from "./AssessmentControls";
import QuestionReviewList from "./QuestionReviewList";

const STATUS_STEPS = ["draft", "questions_generated", "reviewed", "finalized"];

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSchoolSession();
  if (!session || session.role !== "teacher") redirect("/school/login");

  const { id } = await params;

  const [assessment] = await db.select().from(assessments)
    .where(and(eq(assessments.id, id), eq(assessments.teacherId, session.profileId)))
    .limit(1);
  if (!assessment) notFound();

  const questions = await db.select().from(assessmentQuestions)
    .where(eq(assessmentQuestions.assessmentId, id))
    .orderBy(asc(assessmentQuestions.orderIndex));

  const [startLesson] = await db.select({ title: lessons.title, order: lessons.order })
    .from(lessons).where(eq(lessons.id, assessment.lessonRangeStartId)).limit(1);
  const [endLesson] = await db.select({ title: lessons.title, order: lessons.order })
    .from(lessons).where(eq(lessons.id, assessment.lessonRangeEndId)).limit(1);

  const typeLabel = assessment.type === "midterm" ? "Mid-Term" : "Final Exam";
  const stepIndex = STATUS_STEPS.indexOf(assessment.status);

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/school/dashboard/teacher/assessments"
            className="font-mono text-xs text-muted hover:text-navy">
            ← Assessments
          </Link>
          <span className="text-line">|</span>
          <span className="font-mono text-xs uppercase tracking-widest text-brass">{typeLabel}</span>
        </div>
        {assessment.status === "finalized" && (
          <div className="flex items-center gap-3">
            <a
              href={`/api/school/assessments/${id}/export/csv`}
              className="rounded-[3px] border border-line px-3 py-1.5 font-mono text-xs text-navy hover:border-navy"
            >
              ↓ CSV
            </a>
            <Link
              href={`/school/dashboard/teacher/assessments/${id}/print`}
              target="_blank"
              className="rounded-[3px] border border-line px-3 py-1.5 font-mono text-xs text-navy hover:border-navy"
            >
              ⎙ Print
            </Link>
            <Link
              href={`/school/dashboard/teacher/assessments/${id}/scores`}
              className="rounded-[3px] bg-navy px-3 py-1.5 font-mono text-xs text-surface hover:bg-navy-deep"
            >
              Enter scores →
            </Link>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-8">
        {/* Title + range */}
        <div>
          <h1 className="font-serif text-2xl font-semibold text-navy-deep">{typeLabel} Assessment</h1>
          <p className="mt-1 text-sm text-muted">
            Lessons {startLesson?.order}–{endLesson?.order}: &quot;{startLesson?.title}&quot; → &quot;{endLesson?.title}&quot;
            · {assessment.objQuestionCount} OBJ questions
          </p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {STATUS_STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${
                i <= stepIndex ? "bg-navy text-surface" : "bg-line text-muted"
              }`}>
                {step.replace(/_/g, " ")}
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <span className="text-line">→</span>
              )}
            </div>
          ))}
        </div>

        {/* Practical prompt */}
        {assessment.practicalPrompt && (
          <section className="rounded-[3px] border border-line bg-surface p-5">
            <h2 className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">
              Practical Exercise (in-platform)
            </h2>
            <p className="text-sm leading-relaxed text-ink">{assessment.practicalPrompt}</p>
          </section>
        )}

        {/* Controls (finalize, delivery) */}
        <AssessmentControls assessment={{
          id: assessment.id,
          status: assessment.status,
          deliveryMethod: assessment.deliveryMethod,
          questionCount: questions.length,
          objQuestionCount: assessment.objQuestionCount,
        }} />

        {/* Questions */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-mono text-xs uppercase tracking-widest text-brass">
              Questions ({questions.length}/{assessment.objQuestionCount})
            </h2>
          </div>
          <QuestionReviewList
            assessmentId={id}
            initialQuestions={questions.map((q) => ({
              id: q.id,
              orderIndex: q.orderIndex,
              questionText: q.questionText,
              options: q.options as string[],
              correctOptionIndex: q.correctOptionIndex,
              aiGenerated: q.aiGenerated,
              editedByTeacher: q.editedByTeacher,
            }))}
            readonly={assessment.status === "finalized"}
          />
        </section>
      </main>
    </div>
  );
}
