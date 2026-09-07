import { getSchoolSession } from "@/lib/school-session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { teacherAssignments, classes, lessonReleases, lessons } from "@/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import Link from "next/link";
import NewAssessmentForm from "./NewAssessmentForm";

export default async function NewAssessmentPage() {
  const session = await getSchoolSession();
  if (!session || session.role !== "teacher") redirect("/school/login");

  // Get all classes this teacher is assigned to
  const assignments = await db
    .select({ classId: teacherAssignments.classId })
    .from(teacherAssignments)
    .where(eq(teacherAssignments.profileId, session.profileId));

  const classIds =
    assignments.length > 0
      ? assignments.map((a) => a.classId)
      : session.classId
        ? [session.classId]
        : [];

  if (classIds.length === 0) {
    return (
      <div className="min-h-screen bg-paper">
        <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3 sm:px-6">
          <Link href="/school/dashboard/teacher/assessments" className="font-mono text-xs text-muted hover:text-navy">
            ← Assessments
          </Link>
          <span className="text-line">|</span>
          <span className="font-mono text-xs uppercase tracking-widest text-brass">New Assessment</span>
        </header>
        <main className="mx-auto max-w-lg px-6 py-8">
          <p className="text-sm text-muted">No classes assigned to your account.</p>
        </main>
      </div>
    );
  }

  // Fetch class names
  const allClasses = await db
    .select({ id: classes.id, name: classes.name })
    .from(classes)
    .where(classIds.length === 1 ? eq(classes.id, classIds[0]) : inArray(classes.id, classIds));

  // All releases across all teacher classes
  const releases = await db
    .select({ lessonId: lessonReleases.lessonId, classId: lessonReleases.classId })
    .from(lessonReleases)
    .where(classIds.length === 1 ? eq(lessonReleases.classId, classIds[0]) : inArray(lessonReleases.classId, classIds));

  // Fetch all distinct released lessons
  const allReleasedIds = [...new Set(releases.map((r) => r.lessonId))];
  const allReleasedLessons =
    allReleasedIds.length > 0
      ? await db
          .select({ id: lessons.id, title: lessons.title, order: lessons.order })
          .from(lessons)
          .where(inArray(lessons.id, allReleasedIds))
          .orderBy(asc(lessons.order))
      : [];

  // Build per-class lesson list
  const releasedIdsByClass = new Map<string, Set<string>>();
  for (const r of releases) {
    const s = releasedIdsByClass.get(r.classId) ?? new Set();
    s.add(r.lessonId);
    releasedIdsByClass.set(r.classId, s);
  }

  const lessonsByClassId: Record<string, { id: string; title: string; order: number }[]> = {};
  for (const cls of allClasses) {
    const releasedForClass = releasedIdsByClass.get(cls.id) ?? new Set();
    lessonsByClassId[cls.id] = allReleasedLessons.filter((l) => releasedForClass.has(l.id));
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3 sm:px-6">
        <Link href="/school/dashboard/teacher/assessments" className="font-mono text-xs text-muted hover:text-navy">
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

        <NewAssessmentForm classes={allClasses} lessonsByClassId={lessonsByClassId} />
      </main>
    </div>
  );
}
