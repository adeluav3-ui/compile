import { getSchoolSession } from "@/lib/school-session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  teacherAssignments,
  classes,
  lessons,
  lessonReleases,
  lessonQuestions,
  submissions,
  profiles,
} from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import Link from "next/link";
import DashboardHeader from "@/components/school/DashboardHeader";
import ClassStatusPanel from "@/components/school/ClassStatusPanel";
import ReleaseToggleButton from "./ReleaseToggleButton";
import QAReplyForm from "./QAReplyForm";
import GradeConfirm from "./GradeConfirm";
import TeacherLessonPreview from "./TeacherLessonPreview";

export default async function TeacherDashboard() {
  const session = await getSchoolSession();
  if (!session || session.role !== "teacher") redirect("/school/login");
  if (session.subscriptionBlocked) redirect("/school/suspended");

  const [assignment] = await db
    .select()
    .from(teacherAssignments)
    .where(eq(teacherAssignments.profileId, session.profileId))
    .limit(1);

  if (!assignment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <p className="text-muted">No class assigned to your account.</p>
      </div>
    );
  }

  const classId = assignment.classId;
  const [cls] = await db.select().from(classes).where(eq(classes.id, classId));

  const allLessons = await db
    .select()
    .from(lessons)
    .where(eq(lessons.level, cls.level))
    .orderBy(lessons.order);

  const releases = await db
    .select({ lessonId: lessonReleases.lessonId })
    .from(lessonReleases)
    .where(eq(lessonReleases.classId, classId));

  const releasedIds = new Set(releases.map((r) => r.lessonId));

  // Q&A items that need a teacher reply — with the student's name
  const studentProfiles = profiles;
  const pendingQA = await db
    .select({
      id: lessonQuestions.id,
      questionText: lessonQuestions.questionText,
      aiAnswer: lessonQuestions.aiAnswer,
      status: lessonQuestions.status,
      studentName: studentProfiles.fullName,
    })
    .from(lessonQuestions)
    .innerJoin(studentProfiles, eq(lessonQuestions.studentId, studentProfiles.id))
    .where(
      and(
        eq(lessonQuestions.classId, classId),
        eq(lessonQuestions.status, "ai_answered")
      )
    )
    .orderBy(desc(lessonQuestions.createdAt));

  // Submissions awaiting review — with the student's name
  const pendingSubmissions = await db
    .select({
      id: submissions.id,
      type: submissions.type,
      content: submissions.content,
      submittedAt: submissions.submittedAt,
      aiScore: submissions.aiScore,
      aiFeedback: submissions.aiFeedback,
      studentName: studentProfiles.fullName,
    })
    .from(submissions)
    .innerJoin(studentProfiles, eq(submissions.studentId, studentProfiles.id))
    .where(
      and(
        eq(submissions.classId, classId),
        eq(submissions.status, "ai_graded")
      )
    )
    .orderBy(desc(submissions.submittedAt));

  return (
    <div className="min-h-screen bg-paper">
      <DashboardHeader name={session.name} role="teacher" isReal={session.isReal} />

      <main className="mx-auto max-w-4xl space-y-10 px-6 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-navy-deep">{cls.name}</h1>
            <p className="mt-1 text-sm text-muted">{cls.level} · {cls.academicYear}</p>
          </div>
          <Link
            href="/school/dashboard/teacher/assessments"
            className="shrink-0 rounded-[3px] border border-line bg-surface px-4 py-2 font-mono text-xs text-navy hover:border-navy"
          >
            Assessments →
          </Link>
        </div>

        {/* ── Class Status ── */}
        <ClassStatusPanel teacherProfileId={session.profileId} />

        {/* ── Lessons ── */}
        <section>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-brass">
            Lessons — Release Control
          </h2>
          <div className="space-y-2">
            {allLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="rounded-[3px] border border-line bg-surface"
              >
                <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-navy-deep">
                      {lesson.order}. {lesson.title}
                    </div>
                    {lesson.description && (
                      <div className="mt-0.5 max-w-md text-xs text-muted">{lesson.description}</div>
                    )}
                  </div>
                  <div className="shrink-0">
                    <ReleaseToggleButton
                      lessonId={lesson.id}
                      classId={classId}
                      initialReleased={releasedIds.has(lesson.id)}
                    />
                  </div>
                </div>
                <TeacherLessonPreview
                  lesson={{
                    id: lesson.id,
                    title: lesson.title,
                    description: lesson.description ?? null,
                    videoId: lesson.videoId ?? null,
                    videoProvider: lesson.videoProvider ?? null,
                    order: lesson.order,
                    notes: lesson.notes ?? null,
                  }}
                />
              </div>
            ))}
          </div>
        </section>

        {/* ── Q&A Review ── */}
        <section>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-brass">
            Q&A — Needs Your Reply ({pendingQA.length})
          </h2>
          {pendingQA.length === 0 ? (
            <p className="text-sm text-muted">No questions waiting for your reply.</p>
          ) : (
            <div className="space-y-4">
              {pendingQA.map((q) => (
                <div key={q.id} className="rounded-[3px] border border-line bg-surface p-5">
                  <div className="mb-3">
                    <span className="font-semibold text-sm text-navy-deep">
                      {q.studentName ?? "Student"}
                    </span>
                    <span className="ml-2 font-mono text-xs text-muted">asked:</span>
                    <p className="mt-1 text-sm text-ink">{q.questionText}</p>
                  </div>
                  {q.aiAnswer && (
                    <div className="mb-4 rounded bg-paper p-3">
                      <span className="font-mono text-xs text-brass font-semibold">AI answer</span>
                      <div className="mt-1 space-y-2">
                        {q.aiAnswer.split(/\n\n+/).map((para, i) => (
                          <p key={i} className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                            {para.trim()}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  <QAReplyForm questionId={q.id} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Submissions Review ── */}
        <section>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-brass">
            Review Queue — AI Graded ({pendingSubmissions.length})
          </h2>
          {pendingSubmissions.length === 0 ? (
            <p className="text-sm text-muted">No submissions waiting for review.</p>
          ) : (
            <div className="space-y-4">
              {pendingSubmissions.map((sub) => (
                <div key={sub.id} className="rounded-[3px] border border-line bg-surface p-5">
                  <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <span className="font-semibold text-sm text-navy-deep">
                        {sub.studentName ?? "Student"}
                      </span>
                      <span className="ml-2 font-mono text-xs uppercase text-muted">
                        · {sub.type}
                      </span>
                      <p className="mt-0.5 text-xs text-muted">
                        Submitted {new Date(sub.submittedAt).toLocaleDateString("en-GB")}
                      </p>
                    </div>
                    <span className="font-mono text-lg font-semibold text-navy-deep sm:ml-4 sm:shrink-0">
                      {sub.aiScore}/100
                    </span>
                  </div>
                  <pre className="mb-4 max-h-48 overflow-y-auto overflow-x-auto whitespace-pre-wrap rounded bg-paper p-3 font-mono text-xs text-ink">
                    {sub.content}
                  </pre>
                  {sub.aiFeedback && (
                    <div className="mb-4 rounded bg-paper p-3">
                      <span className="font-mono text-xs text-muted">AI feedback</span>
                      <div className="mt-1 space-y-2">
                        {sub.aiFeedback.split(/\n\n+/).map((para, i) => (
                          <p key={i} className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                            {para.trim()}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  <GradeConfirm submissionId={sub.id} aiScore={sub.aiScore ?? 0} />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
