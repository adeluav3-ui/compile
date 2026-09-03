import { getSchoolSession } from "@/lib/school-session";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { assessments, assessmentQuestions, lessons } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";
import PrintButton from "./PrintButton";

const OPTION_LETTERS = ["A", "B", "C", "D"];

export default async function PrintPage({
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

  const typeLabel = assessment.type === "midterm" ? "Mid-Term Assessment" : "Final Exam";

  return (
    <html lang="en">
      <head>
        <title>{typeLabel} — Compile School</title>
        <style>{`
          @page { margin: 20mm; }
          body { font-family: Georgia, serif; font-size: 12pt; color: #12151B; }
          h1 { font-size: 18pt; margin-bottom: 4pt; }
          .meta { font-family: monospace; font-size: 9pt; color: #5C6470; margin-bottom: 20pt; }
          .question { margin-bottom: 16pt; page-break-inside: avoid; }
          .q-num { font-family: monospace; font-size: 9pt; color: #5C6470; }
          .q-text { margin: 4pt 0 8pt; line-height: 1.5; }
          .option { display: flex; gap: 8pt; margin: 3pt 0; }
          .opt-letter { font-family: monospace; font-size: 9pt; min-width: 14pt; }
          .answer-key { margin-top: 32pt; border-top: 1pt solid #DFE1DA; padding-top: 12pt; }
          .answer-key h2 { font-family: monospace; font-size: 9pt; text-transform: uppercase; letter-spacing: 2pt; margin-bottom: 8pt; }
          .answer-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6pt; font-family: monospace; font-size: 9pt; }
          .practical { margin-top: 24pt; border-top: 1pt solid #DFE1DA; padding-top: 12pt; }
          .practical h2 { font-family: monospace; font-size: 9pt; text-transform: uppercase; letter-spacing: 2pt; margin-bottom: 8pt; }
          @media print { .no-print { display: none; } }
          .print-btn { position: fixed; top: 16px; right: 16px; background: #1B355E; color: white; border: none; padding: 8px 16px; font-family: monospace; font-size: 11px; cursor: pointer; border-radius: 3px; }
        `}</style>
      </head>
      <body>
        <PrintButton />

        <h1>{typeLabel}</h1>
        <p className="meta">
          Compile School · Lessons {startLesson?.order}–{endLesson?.order}: &quot;{startLesson?.title}&quot; → &quot;{endLesson?.title}&quot;
          · {assessment.objQuestionCount} questions
        </p>

        <p style={{ fontFamily: "monospace", fontSize: "9pt", marginBottom: "20pt" }}>
          Name: ________________________________ &nbsp;&nbsp; Class: ______________ &nbsp;&nbsp; Date: ______________
        </p>

        {questions.map((q, i) => (
          <div key={q.id} className="question">
            <div className="q-num">Question {i + 1}</div>
            <div className="q-text">{q.questionText}</div>
            {(q.options as string[]).map((opt, oi) => (
              <div key={oi} className="option">
                <span className="opt-letter">{OPTION_LETTERS[oi]}.</span>
                <span>{opt}</span>
              </div>
            ))}
          </div>
        ))}

        {assessment.practicalPrompt && (
          <div className="practical">
            <h2>Practical Exercise</h2>
            <p style={{ lineHeight: "1.6" }}>{assessment.practicalPrompt}</p>
          </div>
        )}

        <div className="answer-key">
          <h2>Answer Key (Teacher Copy)</h2>
          <div className="answer-grid">
            {questions.map((q, i) => (
              <div key={q.id}>
                {i + 1}. {OPTION_LETTERS[(q.options as string[]).length > q.correctOptionIndex ? q.correctOptionIndex : 0]}
              </div>
            ))}
          </div>
        </div>
      </body>
    </html>
  );
}
