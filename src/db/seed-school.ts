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
  const lessonDefs: {
    id: string;
    title: string;
    description: string;
    order: number;
    gradingRubric: string;
    notesUrl: string | null;
    videoId: string | null;
    videoProvider: string | null;
  }[] = [
    {
      id: "f0000000-0000-0000-0000-000000000001",
      title: "Welcome to the Course",
      description: "An introduction to the course, what you will build, and how the lessons work.",
      order: 1,
      gradingRubric: "No practical submission for this lesson. Mark complete on attendance.",
      notesUrl: null,
      videoId: "iqeOqKOo-P4",
      videoProvider: "youtube",
    },
    {
      id: "f0000000-0000-0000-0000-000000000002",
      title: "What Is A Computer, Really?",
      description: "Inside a computer — CPU, memory, storage, and input/output. How the parts work together.",
      order: 2,
      gradingRubric: "Award marks for: correctly naming and describing CPU (20pts), memory vs storage distinction (20pts), at least two input devices and two output devices (20pts), a clear explanation of how the parts work together (40pts).",
      notesUrl: null,
      videoId: "UTdwFOiVYyA",
      videoProvider: "youtube",
    },
    {
      id: "f0000000-0000-0000-0000-000000000003",
      title: "What Is The Internet?",
      description: "How data travels across networks. IP addresses, DNS, servers, and clients — explained plainly.",
      order: 3,
      gradingRubric: "Award marks for: explaining what an IP address is (20pts), explaining DNS in simple terms (20pts), distinguishing a server from a client (20pts), describing how a web page gets to your screen step by step (40pts).",
      notesUrl: null,
      videoId: "YuirgJTKsBE",
      videoProvider: "youtube",
    },
    {
      id: "f0000000-0000-0000-0000-000000000004",
      title: "Digital Literacy Essentials",
      description: "File management, safe browsing, passwords, and the basics of staying secure online.",
      order: 4,
      gradingRubric: "Award marks for: describing good password practice (20pts), identifying at least two online safety risks (20pts), explaining what a file path is (20pts), demonstrating correct folder/file organisation (40pts).",
      notesUrl: null,
      videoId: null,
      videoProvider: null,
    },
    {
      id: "f0000000-0000-0000-0000-000000000005",
      title: "What Is Code?",
      description: "What source code is, how computers execute instructions, and why programming languages exist.",
      order: 5,
      gradingRubric: "Award marks for: defining source code accurately (20pts), explaining why programming languages exist (20pts), describing what a compiler or interpreter does (20pts), giving a real-world analogy for how instructions work (40pts).",
      notesUrl: null,
      videoId: null,
      videoProvider: null,
    },
    {
      id: "f0000000-0000-0000-0000-000000000006",
      title: "Problem-Solving Thinking",
      description: "Breaking problems into steps. How programmers think before they write a single line of code.",
      order: 6,
      gradingRubric: "Award marks for: correctly decomposing a given problem into smaller steps (40pts), identifying inputs and expected outputs (30pts), describing the process in plain language before writing any code (30pts).",
      notesUrl: null,
      videoId: null,
      videoProvider: null,
    },
    {
      id: "f0000000-0000-0000-0000-000000000007",
      title: "Patterns & Flowcharts",
      description: "Reading and drawing flowcharts. Recognising patterns in instructions and everyday processes.",
      order: 7,
      gradingRubric: "Award marks for: using correct flowchart symbols (start/end, process, decision) (30pts), drawing a complete flowchart for a given scenario (40pts), identifying the pattern or repeating logic (30pts).",
      notesUrl: null,
      videoId: null,
      videoProvider: null,
    },
    {
      id: "f0000000-0000-0000-0000-000000000008",
      title: "What Is HTML?",
      description: "HTML as the structure of every webpage. Tags, elements, attributes, and your first document.",
      order: 8,
      gradingRubric: "Award marks for: correct DOCTYPE and html/head/body structure (30pts), at least three different tags used correctly (30pts), at least one attribute used correctly (20pts), valid document that opens in a browser (20pts).",
      notesUrl: null,
      videoId: null,
      videoProvider: null,
    },
    {
      id: "f0000000-0000-0000-0000-000000000009",
      title: "Headings, Paragraphs & Lists",
      description: "Using h1–h6, p, ul, ol, and li to organise content. Hierarchy and readability in practice.",
      order: 9,
      gradingRubric: "Award marks for: correct use of at least three heading levels (20pts), paragraphs with meaningful content (20pts), one unordered list and one ordered list (30pts), logical content hierarchy throughout (30pts).",
      notesUrl: null,
      videoId: null,
      videoProvider: null,
    },
    {
      id: "f0000000-0000-0000-0000-000000000010",
      title: "Links & Images",
      description: "Anchor tags, href, and making pages interconnected. Embedding images with alt text.",
      order: 10,
      gradingRubric: "Award marks for: working hyperlink to an external page (25pts), working internal link between two pages (25pts), image with correct src and meaningful alt attribute (30pts), page opens correctly in browser (20pts).",
      notesUrl: null,
      videoId: null,
      videoProvider: null,
    },
    {
      id: "f0000000-0000-0000-0000-000000000011",
      title: "What Is CSS?",
      description: "How CSS controls colour, font, and layout. Selectors, properties, and linking a stylesheet.",
      order: 11,
      gradingRubric: "Award marks for: correctly linked external stylesheet (20pts), at least three different properties applied (30pts), correct selector syntax throughout (20pts), visible styled output in browser (30pts).",
      notesUrl: null,
      videoId: null,
      videoProvider: null,
    },
    {
      id: "f0000000-0000-0000-0000-000000000012",
      title: "The Box Model & Layout",
      description: "Every element is a box. Margin, border, padding, and width. Building a simple page layout.",
      order: 12,
      gradingRubric: "Award marks for: correct use of margin and padding (20pts), visible border on at least one element (15pts), width or max-width applied to a container (15pts), a two-section layout (side by side or stacked) using the box model (50pts).",
      notesUrl: null,
      videoId: null,
      videoProvider: null,
    },
  ];

  for (const l of lessonDefs) {
    await db
      .insert(schema.lessons)
      .values({ ...l, subjectId, level: "JSS1", type: "video" })
      .onConflictDoUpdate({
        target: schema.lessons.id,
        set: {
          title: l.title,
          description: l.description,
          order: l.order,
          gradingRubric: l.gradingRubric,
          notesUrl: l.notesUrl,
          videoId: l.videoId,
          videoProvider: l.videoProvider,
        },
      });
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
