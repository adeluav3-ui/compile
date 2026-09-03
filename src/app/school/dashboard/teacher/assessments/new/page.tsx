import { getSchoolSession } from "@/lib/school-session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { lessonReleases, lessons } from "@/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import Link from "next/link";
import NewAssessmentForm from "./NewAssessmentForm";

export default async function NewAssessmentPage() {
  const session = await getSchoolSession();
  if (!session || session.role !== "teacher") redirect("/school/login");

  // Only show released lessons
  const released = await db
    .select({ lessonId: lessonReleases.lessonId })
    .from(lessonReleases)
    .where(eq(lessonReleases.classId, session.classId!));

  const releasedIds = released.map((r) => r.lessonId);

  const releasedLessons = releasedIds.length > 0
    ? await db
        .select({ id: lessons.id, title: lessons.title, order: lessons.order })
        .from(lessons)
        .where(inArray(lessons.id, releasedIds))
        .orderBy(asc(lessons.order))
    : [];

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3 sm:px-6">
        <Link href="/school/dashboard/teacher/assessments"
          className="font-mono text-xs text-muted hover:text-navy">
          ← Assessments
        </Link>
        <span className="text-line">|</span>
        <span className="font-mono text-xs uppercase tracking-widest text-brass">New Assessment</span>
      </header>

      <main className="mx-auto max-w-lg px-6 py-8">
        <h1 className="mb-1 font-serif text-2xl font-semibold text-navy-deep">Generate Assessment</h1>
        <p className="mb-8 text-sm text-muted">
          AI generates questions from lesson notes. You review and edit before finalising.
        </p>

        {releasedLessons.length < 2 ? (
          <div className="rounded-[3px] border border-line bg-surface p-6">
            <p className="text-sm text-muted">
              At least 2 released lessons are needed before generating an assessment.
            </p>
            <Link href="/school/dashboard/teacher"
              className="mt-3 inline-block font-mono text-xs text-steel hover:underline">
              ← Go release some lessons first
            </Link>
          </div>
        ) : (
          <NewAssessmentForm lessons={releasedLessons} />
        )}
      </main>
    </div>
  );
}
