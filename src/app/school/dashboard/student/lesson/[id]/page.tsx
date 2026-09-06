import { getSchoolSession } from "@/lib/school-session";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { lessons, lessonReleases, workspaceSaves, lessonQuestions, profiles } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";
import Link from "next/link";
import CodeWorkspace from "@/components/school/CodeWorkspace";
import QAThread, { type QAItem } from "@/components/school/QAThread";
import NotesSection from "@/components/school/NotesSection";
import { getVideoSyncState } from "@/lib/video-sync";
import { isOnlineDelivery } from "@/lib/delivery-mode";

export default async function StudentLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSchoolSession();
  if (!session || session.role !== "student") redirect("/school/login");

  const classId = session.classId!;

  const [release] = await db
    .select()
    .from(lessonReleases)
    .where(and(eq(lessonReleases.lessonId, id), eq(lessonReleases.classId, classId)));

  if (!release) notFound();

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, id));
  if (!lesson) notFound();

  // Offline builds only: check whether the video has been downloaded locally.
  // Online delivery mode skips local file handling entirely — videoSync stays null.
  const videoSync = (!isOnlineDelivery() && process.env.LOCAL_DB_PATH)
    ? getVideoSyncState(id)
    : null;

  const [savedDraft] = await db
    .select()
    .from(workspaceSaves)
    .where(and(eq(workspaceSaves.studentId, session.profileId), eq(workspaceSaves.lessonId, id)));

  // JOIN profiles so every question row carries the student's name
  const rawQA = await db
    .select({
      id: lessonQuestions.id,
      studentId: lessonQuestions.studentId,
      studentName: profiles.fullName,
      questionText: lessonQuestions.questionText,
      aiAnswer: lessonQuestions.aiAnswer,
      aiAnsweredAt: lessonQuestions.aiAnsweredAt,
      teacherResponse: lessonQuestions.teacherResponse,
      teacherRepliedAt: lessonQuestions.teacherRepliedAt,
      status: lessonQuestions.status,
      createdAt: lessonQuestions.createdAt,
    })
    .from(lessonQuestions)
    .innerJoin(profiles, eq(lessonQuestions.studentId, profiles.id))
    .where(and(eq(lessonQuestions.lessonId, id), eq(lessonQuestions.classId, classId)))
    .orderBy(asc(lessonQuestions.createdAt));

  const qaItems: QAItem[] = rawQA.map((q) => ({
    id: q.id,
    studentId: q.studentId,
    studentName: q.studentName,
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
      <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/school/dashboard/student"
            className="text-xs text-muted transition-colors hover:text-navy"
          >
            ← Back
          </Link>
          <span className="text-line">|</span>
          <span className="font-mono text-xs tracking-widest text-brass uppercase">Compile</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="max-w-[100px] truncate text-sm font-semibold text-navy-deep sm:max-w-none">{session.name}</span>
          <span className="rounded bg-steel/10 px-2 py-0.5 font-mono text-xs text-steel">
            Student
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-8">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-navy-deep">
            Lesson {lesson.order}: {lesson.title}
          </h1>
          {lesson.description && (
            <p className="mt-2 max-w-xl text-sm text-muted">{lesson.description}</p>
          )}
        </div>

        <section>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-brass">Video</h2>
          <div className="overflow-hidden rounded-[3px] border border-line bg-surface" style={{ aspectRatio: "16/9" }}>
            {/*
              Offline School Edition build (LOCAL_DB_PATH set):
              ALL videos — regardless of original source (YouTube or storage) — go
              through the local sync pipeline. No YouTube embeds reach this view.
              Playback is always via /api/school/video/[lessonId].
            */}
            {videoSync !== null ? (
              videoSync.status !== "ready" ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <div className={`mb-2 text-4xl text-muted ${videoSync.status === "downloading" ? "animate-spin" : ""}`}>
                      {videoSync.status === "downloading" ? "⟳" : "▶"}
                    </div>
                    {videoSync.status === "downloading" ? (
                      <>
                        <p className="text-sm text-muted">Video is downloading…</p>
                        <p className="mt-1 font-mono text-xs text-muted">
                          Refresh this page in a moment to check.
                        </p>
                      </>
                    ) : videoSync.status === "pending" ? (
                      <>
                        <p className="text-sm text-muted">Video not yet available.</p>
                        <p className="mt-1 font-mono text-xs text-muted">
                          The server is waiting for an internet connection to download it.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted">Video unavailable.</p>
                        <p className="mt-1 font-mono text-xs text-muted">
                          Ask your teacher to check the school server.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                // status === "ready" — decrypt-and-stream through the gated route
                <video className="h-full w-full" controls>
                  <source src={`/api/school/video/${id}`} type="video/mp4" />
                </video>
              )
            ) : isOnlineDelivery() && lesson.videoProvider === "youtube" && lesson.videoId ? (
              /* Online delivery mode — YouTube embed. The raw CDN URL is never
                 returned to the browser; only the nocookie embed URL is visible. */
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${lesson.videoId}?modestbranding=1&rel=0&iv_load_policy=3`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Lesson video"
              />
            ) : (
              /* Offline build, no local file ready yet — or no source configured */
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mb-2 text-4xl text-muted">▶</div>
                  <p className="text-sm text-muted">Video available in the School Edition app.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {lesson.notes && (
          <section>
            <NotesSection notes={lesson.notes} />
          </section>
        )}

        <section>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-brass">
            Practice Workspace
          </h2>
          <CodeWorkspace lessonId={id} initialCode={savedDraft?.code ?? defaultCode} />
        </section>

        <section>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-brass">Q&A</h2>
          <QAThread
            lessonId={id}
            initialItems={qaItems}
            studentId={session.profileId}
            studentName={session.name}
          />
        </section>
      </main>
    </div>
  );
}
