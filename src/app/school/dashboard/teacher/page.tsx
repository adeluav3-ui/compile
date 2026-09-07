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
  studentClasses,
  profiles,
} from "@/db/schema";
import { and, eq, desc, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import DashboardHeader from "@/components/school/DashboardHeader";
import ClassStatusPanel from "@/components/school/ClassStatusPanel";
import ReleaseToggleButton from "./ReleaseToggleButton";
import QAReplyForm from "./QAReplyForm";
import GradeConfirm from "./GradeConfirm";
import TeacherLessonPreview from "./TeacherLessonPreview";
import PlayForClassPlayer from "./PlayForClassPlayer";
import AddStudentsSection from "./AddStudentsSection";
import StudentList, { type StudentRow } from "./StudentList";
import { getVideoSyncStates } from "@/lib/video-sync";
import { isOnlineDelivery } from "@/lib/delivery-mode";

export default async function TeacherDashboard() {
  const session = await getSchoolSession();
  if (!session || session.role !== "teacher") redirect("/school/login");

  // Phase 1 — load assignments to know which classes this teacher has
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

  const classFilter =
    assignedClassIds.length === 1
      ? eq(classes.id, assignedClassIds[0])
      : inArray(classes.id, assignedClassIds);

  const releaseFilter =
    assignedClassIds.length === 1
      ? eq(lessonReleases.classId, assignedClassIds[0])
      : inArray(lessonReleases.classId, assignedClassIds);

  const qaFilter =
    assignedClassIds.length === 1
      ? eq(lessonQuestions.classId, assignedClassIds[0])
      : inArray(lessonQuestions.classId, assignedClassIds);

  const subFilter =
    assignedClassIds.length === 1
      ? eq(submissions.classId, assignedClassIds[0])
      : inArray(submissions.classId, assignedClassIds);

  // Phase 2 — all remaining queries in parallel
  const studentProfiles = profiles;
  const [allAssignedClasses, allLessons, releases, pendingQA, pendingSubmissions, studentRows] =
    await Promise.all([
      db
        .select({ id: classes.id, name: classes.name, level: classes.level, academicYear: classes.academicYear })
        .from(classes)
        .where(classFilter),

      // All lessons — no level filter; release control is per class
      db.select().from(lessons).orderBy(lessons.order),

      db
        .select({ lessonId: lessonReleases.lessonId, classId: lessonReleases.classId })
        .from(lessonReleases)
        .where(releaseFilter),

      db
        .select({
          id: lessonQuestions.id,
          questionText: lessonQuestions.questionText,
          aiAnswer: lessonQuestions.aiAnswer,
          status: lessonQuestions.status,
          studentName: studentProfiles.fullName,
          className: classes.name,
        })
        .from(lessonQuestions)
        .innerJoin(studentProfiles, eq(lessonQuestions.studentId, studentProfiles.id))
        .innerJoin(classes, eq(lessonQuestions.classId, classes.id))
        .where(and(qaFilter, eq(lessonQuestions.status, "ai_answered")))
        .orderBy(desc(lessonQuestions.createdAt)),

      db
        .select({
          id: submissions.id,
          type: submissions.type,
          content: submissions.content,
          submittedAt: submissions.submittedAt,
          aiScore: submissions.aiScore,
          aiFeedback: submissions.aiFeedback,
          studentName: studentProfiles.fullName,
          className: classes.name,
        })
        .from(submissions)
        .innerJoin(studentProfiles, eq(submissions.studentId, studentProfiles.id))
        .innerJoin(classes, eq(submissions.classId, classes.id))
        .where(and(subFilter, eq(submissions.status, "ai_graded")))
        .orderBy(desc(submissions.submittedAt)),

      // All students across all assigned classes with basic progress stats
      db
        .select({
          profileId: studentClasses.profileId,
          classId: studentClasses.classId,
          enrolledAt: studentClasses.enrolledAt,
          fullName: profiles.fullName,
          username: profiles.username,
          submissionCount: sql<number>`count(distinct ${submissions.id})::int`,
          lastActive: sql<string | null>`max(${submissions.submittedAt})`,
        })
        .from(studentClasses)
        .innerJoin(profiles, eq(studentClasses.profileId, profiles.id))
        .leftJoin(
          submissions,
          and(
            eq(submissions.studentId, studentClasses.profileId),
            eq(submissions.classId, studentClasses.classId),
          )
        )
        .where(
          assignedClassIds.length === 1
            ? eq(studentClasses.classId, assignedClassIds[0])
            : inArray(studentClasses.classId, assignedClassIds)
        )
        .groupBy(
          studentClasses.profileId,
          studentClasses.classId,
          studentClasses.enrolledAt,
          profiles.fullName,
          profiles.username,
        )
        .orderBy(profiles.fullName),
    ]);

  // Build per-lesson release map: lessonId → classIds that have it released
  const releasedClassIdsByLesson = new Map<string, string[]>();
  for (const r of releases) {
    const arr = releasedClassIdsByLesson.get(r.lessonId) ?? [];
    arr.push(r.classId);
    releasedClassIdsByLesson.set(r.lessonId, arr);
  }

  const classNameById = Object.fromEntries(allAssignedClasses.map((c) => [c.id, c.name]));

  const students: StudentRow[] = studentRows.map((r) => ({
    ...r,
    className: classNameById[r.classId] ?? r.classId,
    enrolledAt: r.enrolledAt instanceof Date ? r.enrolledAt.toISOString() : String(r.enrolledAt),
    lastActive: r.lastActive ? String(r.lastActive) : null,
    fullName: r.fullName,
    username: r.username,
  }));

  const releasedLessonIds = [...releasedClassIdsByLesson.keys()];
  const onlineMode = isOnlineDelivery();
  // In online mode this always returns {} — kept so offline mode works unchanged.
  const videoSyncStates = getVideoSyncStates(releasedLessonIds);

  return (
    <div className="min-h-screen bg-paper">
      <DashboardHeader name={session.name} role="teacher" isReal={session.isReal} />

      <main className="mx-auto max-w-4xl space-y-10 px-6 py-8">

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-navy-deep">
              {session.name}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {allAssignedClasses.length} class{allAssignedClasses.length !== 1 ? "es" : ""} assigned
            </p>
          </div>
          <Link
            href="/school/dashboard/teacher/assessments"
            className="shrink-0 rounded-[3px] border border-line bg-surface px-4 py-2 font-mono text-xs text-navy hover:border-navy"
          >
            Assessments →
          </Link>
        </div>

        {/* ── Class Status (all classes) ── */}
        <ClassStatusPanel classes={allAssignedClasses} />

        {/* ── Lessons ── */}
        <section>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-brass">
            Lessons — Release Control
          </h2>
          {allLessons.length === 0 ? (
            <p className="text-sm text-muted">No lessons in the curriculum yet.</p>
          ) : (
            <div className="space-y-2">
              {allLessons.map((lesson) => {
                const lessonReleasedClassIds = releasedClassIdsByLesson.get(lesson.id) ?? [];
                const lessonReleasedClasses = allAssignedClasses.filter((c) =>
                  lessonReleasedClassIds.includes(c.id)
                );

                return (
                  <div key={lesson.id} className="rounded-[3px] border border-line bg-surface">
                    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-navy-deep">
                          {lesson.order}. {lesson.title}
                        </div>
                        {lesson.description && (
                          <div className="mt-0.5 max-w-md text-xs text-muted">{lesson.description}</div>
                        )}
                      </div>
                      <div className="shrink-0 sm:max-w-xs">
                        <ReleaseToggleButton
                          lessonId={lesson.id}
                          classes={allAssignedClasses}
                          initialReleasedClassIds={lessonReleasedClassIds}
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

                    {lessonReleasedClasses.length > 0 && (
                      <PlayForClassPlayer
                        lessonId={lesson.id}
                        releasedClasses={lessonReleasedClasses}
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
                );
              })}
            </div>
          )}
        </section>

        {/* ── Q&A Review (all classes) ── */}
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
                  <div className="mb-3 flex flex-wrap items-baseline gap-2">
                    <span className="font-semibold text-sm text-navy-deep">
                      {q.studentName ?? "Student"}
                    </span>
                    <span className="font-mono text-xs text-muted">asked · {q.className}</span>
                  </div>
                  <p className="mb-4 text-sm text-ink">{q.questionText}</p>
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

        {/* ── Add Students (real/local sessions only) ── */}
        {(session.isReal || session.isLocal) && (
          <AddStudentsSection classes={allAssignedClasses} />
        )}

        {/* ── Student List ── */}
        <StudentList initialStudents={students} />

        {/* ── Submissions Review (all classes) ── */}
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
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-semibold text-sm text-navy-deep">
                          {sub.studentName ?? "Student"}
                        </span>
                        <span className="font-mono text-xs uppercase text-muted">
                          {sub.type} · {sub.className}
                        </span>
                      </div>
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
