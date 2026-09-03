import { getSchoolSession } from "@/lib/school-session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { classes, lessons, lessonReleases } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";

export default async function StudentDashboard() {
  const session = await getSchoolSession();
  if (!session || session.role !== "student") redirect("/school/login");

  const classId = session.classId!;
  const [cls] = await db.select().from(classes).where(eq(classes.id, classId));

  const releasedLessons = await db
    .select({
      id: lessons.id,
      title: lessons.title,
      description: lessons.description,
      order: lessons.order,
      notesUrl: lessons.notesUrl,
    })
    .from(lessonReleases)
    .innerJoin(lessons, eq(lessonReleases.lessonId, lessons.id))
    .where(eq(lessonReleases.classId, classId))
    .orderBy(lessons.order);

  return (
    <div className="min-h-screen bg-paper">
      {/* Nav */}
      <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="font-mono text-xs tracking-widest text-brass uppercase">Compile</span>
          <span className="hidden text-line sm:inline">|</span>
          <span className="hidden text-sm text-muted sm:inline">School Edition</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="max-w-[100px] truncate text-sm font-semibold text-navy-deep sm:max-w-none">{session.name}</span>
          <span className="rounded bg-steel/10 px-2 py-0.5 font-mono text-xs text-steel">
            Student
          </span>
          <Link
            href="/school/login"
            className="hidden text-xs text-muted transition-colors hover:text-navy sm:block"
          >
            Switch account
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-2xl font-semibold text-navy-deep">
            {cls?.name ?? "My Class"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {cls?.level} · {cls?.academicYear}
          </p>
        </div>

        <section>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-brass">
            Lessons
          </h2>

          {releasedLessons.length === 0 ? (
            <div className="rounded-[3px] border border-line bg-surface px-5 py-10 text-center">
              <p className="text-sm text-muted">
                No lessons released yet.
              </p>
              <p className="mt-1 text-xs text-muted">
                Check back after your teacher unlocks them.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {releasedLessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/school/dashboard/student/lesson/${lesson.id}`}
                  className="group flex items-center justify-between rounded-[3px] border border-line bg-surface px-5 py-4 transition-colors hover:border-navy"
                >
                  <div>
                    <div className="text-sm font-semibold text-navy-deep group-hover:text-navy">
                      Lesson {lesson.order}: {lesson.title}
                    </div>
                    {lesson.description && (
                      <div className="mt-0.5 text-xs text-muted">
                        {lesson.description}
                      </div>
                    )}
                  </div>
                  <span className="text-muted transition-colors group-hover:text-navy">
                    →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
