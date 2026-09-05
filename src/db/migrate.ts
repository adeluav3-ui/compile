/**
 * One-shot migration script for School Edition delivery tables.
 * Run with: DATABASE_URL=... npx tsx src/db/migrate.ts
 * Uses raw SQL to sidestep drizzle-kit's schema-introspection bug with Supabase.
 */
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

const statements = [
  // Extend lessons with notes + rubric
  `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS notes_url text`,
  `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS grading_rubric text`,

  // Enums
  `DO $$ BEGIN
    CREATE TYPE question_status AS ENUM ('queued','ai_answered','teacher_replied');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `DO $$ BEGIN
    CREATE TYPE ai_queue_type AS ENUM ('qa','grade');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `DO $$ BEGIN
    CREATE TYPE ai_queue_status AS ENUM ('pending','processing','done','failed');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `DO $$ BEGIN
    CREATE TYPE submission_type AS ENUM ('class_activity','practical','exam');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `DO $$ BEGIN
    CREATE TYPE submission_status AS ENUM ('submitted','ai_graded','teacher_confirmed');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // lesson_releases
  `CREATE TABLE IF NOT EXISTS lesson_releases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    class_id  uuid NOT NULL REFERENCES classes(id)  ON DELETE CASCADE,
    released_by uuid NOT NULL REFERENCES profiles(id),
    released_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(lesson_id, class_id)
  )`,

  // lesson_questions
  `CREATE TABLE IF NOT EXISTS lesson_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id  uuid NOT NULL REFERENCES lessons(id)  ON DELETE CASCADE,
    class_id   uuid NOT NULL REFERENCES classes(id)  ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES profiles(id),
    question_text   text NOT NULL,
    ai_answer       text,
    ai_answered_at  timestamptz,
    teacher_response text,
    teacher_id      uuid REFERENCES profiles(id),
    teacher_replied_at timestamptz,
    status question_status NOT NULL DEFAULT 'queued',
    created_at timestamptz NOT NULL DEFAULT now()
  )`,

  // ai_queue
  `CREATE TABLE IF NOT EXISTS ai_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type ai_queue_type NOT NULL,
    payload jsonb NOT NULL,
    status ai_queue_status NOT NULL DEFAULT 'pending',
    result jsonb,
    created_at   timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz
  )`,

  // submissions
  `CREATE TABLE IF NOT EXISTS submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    class_id   uuid NOT NULL REFERENCES classes(id),
    lesson_id  uuid REFERENCES lessons(id),
    type submission_type NOT NULL DEFAULT 'class_activity',
    content text NOT NULL,
    submitted_at timestamptz NOT NULL DEFAULT now(),
    ai_score    integer,
    ai_feedback text,
    ai_graded_at timestamptz,
    teacher_score integer,
    teacher_id    uuid REFERENCES profiles(id),
    teacher_reviewed_at timestamptz,
    status submission_status NOT NULL DEFAULT 'submitted'
  )`,

  // workspace_saves
  `CREATE TABLE IF NOT EXISTS workspace_saves (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    lesson_id  uuid NOT NULL REFERENCES lessons(id)  ON DELETE CASCADE,
    code text NOT NULL,
    saved_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(student_id, lesson_id)
  )`,
  // username support on profiles
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text UNIQUE`,

  // class_lesson_progress — teacher's "Play for Class" playback position
  `CREATE TABLE IF NOT EXISTS class_lesson_progress (
    lesson_id              uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    class_id               uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    last_position_seconds  integer NOT NULL DEFAULT 0,
    updated_at             timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (lesson_id, class_id)
  )`,
];

async function main() {
  for (const stmt of statements) {
    await sql.unsafe(stmt);
    const preview = stmt.slice(0, 60).replace(/\s+/g, " ");
    console.log("✓", preview);
  }
  console.log("\nAll statements applied.");
  await sql.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
