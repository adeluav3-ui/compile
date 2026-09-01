import { getSchoolSession } from "@/lib/school-session";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { lessons, lessonReleases, workspaceSaves, lessonQuestions } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";
import Link from "next/link";
import CodeWorkspace from "@/components/school/CodeWorkspace";
import QAThread, { type QAItem } from "@/components/school/QAThread";

export default async function StudentLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSchoolSession();
  if (!session || session.role !== "student") redirect("/school/login");

  const classId = session.classId!;

  // Guard: lesson must be released for this class
  const [release] = await db
    .select()
    .from(lessonReleases)
    .where(
      and(eq(lessonReleases.lessonId, id), eq(lessonReleases.classId, classId))
    );

  if (!release) notFound();

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, id));
  if (!lesson) notFound();

  const [savedDraft] = await db
    .select()
    .from(workspaceSaves)
    .where(
      and(
        eq(workspaceSaves.studentId, session.profileId),
        eq(workspaceSaves.lessonId, id)
      )
    );

  const rawQA = await db
    .select()
    .from(lessonQuestions)
    .where(
      and(eq(lessonQuestions.lessonId, id), eq(lessonQuestions.classId, classId))
    )
    .orderBy(asc(lessonQuestions.createdAt));

  // Serialize Date objects so they can be passed to client components
  const qaItems: QAItem[] = rawQA.map((q) => ({
    id: q.id,
    studentId: q.studentId,
    questionText: q.questionText,
    aiAnswer: q.aiAnswer,
    aiAnsweredAt: q.aiAnsweredAt?.toISOString() ?? null,
    teacherResponse: q.teacherResponse,
    teacherRepliedAt: q.teacherRepliedAt?.toISOString() ?? null,
    status: q.status,
    createdAt: q.createdAt.toISOString(),
  }));

  const defaultCode = `<!-- Lesson ${lesson.order}: ${lesson.title} -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${lesson.title}</title>
</head>
<body>
  <h1>Hello, World!</h1>
</body>
</html>`;

  return (
    <div className="min-h-screen bg-paper">
      {/* Nav */}
      <header className="flex items-center justify-between border-b border-line bg-surface px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/school/dashboard/student"
            className="text-xs text-muted transition-colors hover:text-navy"
          >
            ← Back
          </Link>
          <span className="text-line">|</span>
          <span className="font-mono text-xs tracking-widest text-brass uppercase">
            Compile
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-navy-deep">{session.name}</span>
          <span className="rounded bg-steel/10 px-2 py-0.5 font-mono text-xs text-steel">
            Student
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-8">
        {/* Lesson header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-navy-deep">
              Lesson {lesson.order}: {lesson.title}
            </h1>
            {lesson.description && (
              <p className="mt-2 max-w-xl text-sm text-muted">
                {lesson.description}
              </p>
            )}
          </div>
          {lesson.notesUrl && (
            <a
              href={lesson.notesUrl}
              download
              className="flex flex-shrink-0 items-center gap-2 rounded-[3px] border border-line bg-surface px-4 py-2 font-mono text-xs text-navy transition-colors hover:border-navy"
            >
              ↓ Lesson Notes
            </a>
          )}
        </div>

        {/* Video */}
        <section>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-brass">
            Video
          </h2>
          <div className="flex aspect-video items-center justify-center rounded-[3px] border border-line bg-surface">
            {lesson.contentUrl ? (
              <video className="h-full w-full rounded-[3px]" controls>
                <source src={lesson.contentUrl} />
              </video>
            ) : (
              <div className="text-center">
                <div className="mb-2 text-4xl text-muted">▶</div>
                <p className="text-sm text-muted">
                  Video syncs from the school server.
                </p>
                <p className="mt-1 font-mono text-xs text-muted">
                  {lesson.title}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Practice Workspace */}
        <section>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-brass">
            Practice Workspace
          </h2>
          <CodeWorkspace
            lessonId={id}
            initialCode={savedDraft?.code ?? defaultCode}
          />
        </section>

        {/* Q&A Thread */}
        <section>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-brass">
            Q&A
          </h2>
          <QAThread
            lessonId={id}
            initialItems={qaItems}
            studentId={session.profileId}
          />
        </section>
      </main>
    </div>
  );
}
