import { getSchoolSession } from "@/lib/school-session";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { assessments, assessmentResults, profiles } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import Link from "next/link";
import ScoreEntryTable from "./ScoreEntryTable";

export default async function ScoresPage({
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
  if (assessment.status !== "finalized") redirect(`/school/dashboard/teacher/assessments/${id}`);

  // All students with existing results
  const results = await db
    .select({
      resultId: assessmentResults.id,
      studentId: assessmentResults.studentId,
      studentName: profiles.fullName,
      objScore: assessmentResults.objScore,
      objSource: assessmentResults.objSource,
      practicalScore: assessmentResults.practicalScore,
      totalScore: assessmentResults.totalScore,
    })
    .from(assessmentResults)
    .innerJoin(profiles, eq(assessmentResults.studentId, profiles.id))
    .where(eq(assessmentResults.assessmentId, id));

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3 sm:px-6">
        <Link
          href={`/school/dashboard/teacher/assessments/${id}`}
          className="font-mono text-xs text-muted hover:text-navy"
        >
          ← Assessment
        </Link>
        <span className="text-line">|</span>
        <span className="font-mono text-xs uppercase tracking-widest text-brass">Enter Scores</span>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="mb-1 font-serif text-2xl font-semibold text-navy-deep">Score Entry</h1>
        <p className="mb-6 text-sm text-muted">
          {assessment.type === "midterm" ? "Mid-Term" : "Final Exam"} ·{" "}
          {assessment.objQuestionCount} OBJ questions · delivery: {assessment.deliveryMethod?.replace("_", " ")}
        </p>

        <ScoreEntryTable
          assessmentId={id}
          objQuestionCount={assessment.objQuestionCount}
          deliveryMethod={assessment.deliveryMethod ?? "pdf"}
          initialResults={results.map((r) => ({
            resultId: r.resultId,
            studentId: r.studentId,
            studentName: r.studentName ?? "Unknown",
            objScore: r.objScore,
            objSource: r.objSource,
            practicalScore: r.practicalScore,
            totalScore: r.totalScore,
          }))}
        />
      </main>
    </div>
  );
}
