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
import { and, eq, desc, inArray } from "drizzle-orm";
import Link from "next/link";
import DashboardHeader from "@/components/school/DashboardHeader";
import ClassStatusPanel from "@/components/school/ClassStatusPanel";
import ReleaseToggleButton from "./ReleaseToggleButton";
import QAReplyForm from "./QAReplyForm";
import GradeConfirm from "./GradeConfirm";
import TeacherLessonPreview from "./TeacherLessonPreview";
import PlayForClassPlayer from "./PlayForClassPlayer";
import AddStudentsSection from "./AddStudentsSection";
import { getVideoSyncStates } from "@/lib/video-sync";
import { isOnlineDelivery } from "@/lib/delivery-mode";

export default async function TeacherDashboard({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const session = await getSchoolSession();
  if (!session || session.role !== "teacher") redirect("/school/login");

  // Load all DB assignments
  const dbAssignments = await db
    .select({ classId: teacherAssignments.classId })
    .from(teacherAssignments)
    .where(eq(teacherAssignments.profileId, session.profileId));

  // Demo/local sessions have no DB assignments — fall back to session.classId
  const assignedClassIds: string[] =
    dbAssignments.length > 0
      ? dbAssignments.map((a) => a.classId)
      : session.classId
        ? [session.classId]
        : [];

  if (assignedClassIds.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <p className="text-muted">No class assigned to your account.</p>
      </div>
    );
  }

  const { classId: classIdParam } = await searchParams;

  const activeClassId =
    (classIdParam && assignedClassIds.includes(classIdParam) ? classIdParam : null) ??
    assignedClassIds[0];

  // Load class info for all assigned classes (for the picker + active class header)
  const allAssignedClasses = await db
    .select({ id: classes.id, name: classes.name, level: classes.level, academicYear: classes.academicYear })
    .from(classes)
    .where(
      assignedClassIds.length === 1
        ? eq(classes.id, assignedClassIds[0])
        : inArray(classes.id, assignedClassIds)
    );

  const cls = allAssignedClasses.find((c) => c.id === activeClassId) ?? null;

  const allLessons = cls
    ? await db
        .select()
        .from(lessons)
        .where(eq(lessons.level, cls.level))
        .orderBy(lessons.order)
    : [];

  const releases = await db
    .select({ lessonId: lessonReleases.lessonId })
    .from(lessonReleases)
    .where(eq(lessonReleases.classId, activeClassId));

  const releasedIds = new Set(releases.map((r) => r.lessonId));

  const releasedLessonIds = allLessons.filter((l) => releasedIds.has(l.id)).map((l) => l.id);
  const onlineMode = isOnlineDelivery();
  // In online mode this always returns {} — kept so offline mode works unchanged.
  const videoSyncStates = getVideoSyncStates(releasedLessonIds);

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
        eq(lessonQuestions.classId, activeClassId),
        eq(lessonQuestions.status, "ai_answered")
      )
    )
    .orderBy(desc(lessonQuestions.createdAt));

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
        eq(submissions.classId, activeClassId),
        eq(submissions.status, "ai_graded")
      )
    )
    .orderBy(desc(submissions.submittedAt));

  return (
    <div className="min-h-screen bg-paper">
      <DashboardHeader name={session.name} role="teacher" isReal={session.isReal} />

      <main className="mx-auto max-w-4xl space-y-10 px-6 py-8">

        {/* ── Class picker (only shown when teacher has multiple classes) ── */}
        {allAssignedClasses.length > 1 && (
          <div className="flex gap-1 border-b border-line">
            {allAssignedClasses.map((c) => (
              <Link
                key={c.id}
                href={`/school/dashboard/teacher?classId=${c.id}`}
                className={`rounded-t-[3px] px-4 py-2 font-mono text-xs transition-colors ${
                  c.id === activeClassId
                    ? "border border-b-0 border-line bg-surface text-navy-deep"
                    : "text-muted hover:text-navy"
                }`}
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-navy-deep">
              {cls?.name ?? "Demo Class"}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {cls ? `${cls.level} · ${cls.academicYear}` : "Demo session"}
            </p>
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
          {allLessons.length === 0 ? (
            <p className="text-sm text-muted">No lessons available for this class level.</p>
          ) : (
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
                        classId={activeClassId}
                        initialReleased={releasedIds.has(lesson.id)}
                        initialVideoStatus={
                          onlineMode ? null :
                          (videoSyncStates[lesson.id]?.status ?? null) as
                            | "pending" | "downloading" | "ready" | "error" | null
                        }
                        initialProgressPct={onlineMode ? 0 : (videoSyncStates[lesson.id]?.progressPct ?? 0)}
                        isOfflineBuild={!onlineMode}
                      />
                    </div>
                  </div>
                  {releasedIds.has(lesson.id) && (
                    <PlayForClassPlayer
                      lessonId={lesson.id}
                      classId={activeClassId}
                      classSection={cls?.name ?? "Demo Class"}
                      isLocalReady={!onlineMode && videoSyncStates[lesson.id]?.status === "ready"}
                      isOnlineMode={onlineMode}
                      videoProvider={lesson.videoProvider}
                      videoId={lesson.videoId}
                    />
                  )}
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
          )}
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

        {/* ── Add Students ── */}
        <AddStudentsSection classId={activeClassId} />

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
