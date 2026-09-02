/**
 * Demo data for School Edition dashboard testing.
 * Run: DATABASE_URL=... npx tsx src/db/seed-school.ts
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { eq } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema });

async function main() {
  // 1. Profiles
  const adminProfile = await upsertProfile("a0000000-0000-0000-0000-000000000002", "Mrs. Fatima Bello", "admin@demo.compile.ng");
  const teacherProfile = await upsertProfile("a0000000-0000-0000-0000-000000000001", "Adebayo Okafor", "teacher@demo.compile.ng");
  const student1 = await upsertProfile("b0000000-0000-0000-0000-000000000001", "Chioma Eze", "chioma@student.demo");
  const student2 = await upsertProfile("b0000000-0000-0000-0000-000000000002", "Emeka Nwosu", "emeka@student.demo");

  console.log("✓ Profiles");

  // 2. School
  const [school] = await db
    .insert(schema.schools)
    .values({
      id: "c0000000-0000-0000-0000-000000000001",
      name: "Greenfield Secondary School",
      state: "Lagos",
      adminId: adminProfile.id,
      subscriptionStatus: "active",
      subscriptionExpiresAt: new Date("2027-12-31"),
      licenseKey: "DEMO-LICENSE-KEY-001",
    })
    .onConflictDoNothing()
    .returning();

  const schoolId = school?.id ?? "c0000000-0000-0000-0000-000000000001";
  console.log("✓ School:", schoolId);

  // 3. Class
  const [cls] = await db
    .insert(schema.classes)
    .values({
      id: "d0000000-0000-0000-0000-000000000001",
      schoolId,
      name: "JSS1 A",
      level: "JSS1",
      academicYear: "2026/2027",
    })
    .onConflictDoNothing()
    .returning();

  const classId = cls?.id ?? "d0000000-0000-0000-0000-000000000001";
  console.log("✓ Class:", classId);

  // 4. Teacher assignment
  await db
    .insert(schema.teacherAssignments)
    .values({ profileId: teacherProfile.id, classId, schoolId })
    .onConflictDoNothing();

  // 5. Student class memberships
  await db
    .insert(schema.studentClasses)
    .values([
      { profileId: student1.id, classId },
      { profileId: student2.id, classId },
    ])
    .onConflictDoNothing();

  console.log("✓ Assignments");

  // 6. Subject
  const [subject] = await db
    .insert(schema.subjects)
    .values({
      id: "e0000000-0000-0000-0000-000000000001",
      name: "Web Development",
      code: "WEBDEV",
      levels: ["JSS1", "JSS2", "JSS3"],
    })
    .onConflictDoNothing()
    .returning();

  const subjectId = subject?.id ?? "e0000000-0000-0000-0000-000000000001";
  console.log("✓ Subject:", subjectId);

  // 7. Lessons
  const lessonDefs = [
    {
      id: "f0000000-0000-0000-0000-000000000001",
      title: "Introduction to HTML",
      description: "What HTML is and how browsers read it. Structure, tags, and your first webpage.",
      order: 1,
      gradingRubric: "Award marks for: correct DOCTYPE declaration (10pts), proper html/head/body structure (20pts), at least one heading and paragraph (20pts), correct use of at least 3 different tags (30pts), valid overall structure with no syntax errors (20pts).",
      notesUrl: "/demo-assets/lesson-01-intro-to-html.pdf",
    },
    {
      id: "f0000000-0000-0000-0000-000000000002",
      title: "HTML Structure & Semantics",
      description: "Semantic elements: header, nav, main, section, article, footer. Why they matter.",
      order: 2,
      gradingRubric: "Award marks for: using at least 4 semantic elements correctly (40pts), logical content hierarchy (30pts), code readability and indentation (20pts), valid HTML5 (10pts).",
      notesUrl: "/demo-assets/lesson-02-semantics.pdf",
    },
    {
      id: "f0000000-0000-0000-0000-000000000003",
      title: "Styling with CSS",
      description: "Selectors, properties, values. The box model. Colour and typography.",
      order: 3,
      gradingRubric: "Award marks for: correct selector syntax (20pts), box model use (border/padding/margin) (20pts), colour and font styling applied (20pts), linked or embedded stylesheet (20pts), visual output matches stated goal (20pts).",
      notesUrl: null,
    },
  ];

  for (const l of lessonDefs) {
    await db
      .insert(schema.lessons)
      .values({ ...l, subjectId, level: "JSS1", type: "video" })
      .onConflictDoNothing();
  }

  console.log("✓ Lessons");

  // 8. Roles
  await db
    .insert(schema.userRoles)
    .values([
      { profileId: adminProfile.id, role: "school_admin" },
      { profileId: teacherProfile.id, role: "teacher" },
      { profileId: student1.id, role: "student" },
      { profileId: student2.id, role: "student" },
    ])
    .onConflictDoNothing();

  console.log("✓ Roles");

  // Print login tokens for use at /school/login
  console.log("\n── Demo accounts ──────────────────────────────────────");
  console.log("Admin   :", adminProfile.id, "| schoolId:", schoolId);
  console.log("Teacher :", teacherProfile.id, "| classId:", classId, "| schoolId:", schoolId);
  console.log("Student1:", student1.id, "| classId:", classId);
  console.log("Student2:", student2.id, "| classId:", classId);
  console.log("LessonIds:", lessonDefs.map(l => l.id.slice(0, 20) + "…").join(", "));

  await client.end();
}

async function upsertProfile(id: string, name: string, email: string) {
  const existing = await db.select().from(schema.profiles).where(eq(schema.profiles.id, id));
  if (existing.length) return existing[0];
  const [p] = await db.insert(schema.profiles).values({ id, fullName: name, email }).returning();
  return p;
}

main().catch((err) => { console.error(err); process.exit(1); });
