import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { prepare: false });

// Enums (IF NOT EXISTS not directly supported for CREATE TYPE — use DO block)
await sql`DO $$ BEGIN
  CREATE TYPE assessment_type AS ENUM ('midterm','exam');
EXCEPTION WHEN duplicate_object THEN NULL; END $$`;

await sql`DO $$ BEGIN
  CREATE TYPE assessment_status AS ENUM ('draft','questions_generated','reviewed','finalized');
EXCEPTION WHEN duplicate_object THEN NULL; END $$`;

await sql`DO $$ BEGIN
  CREATE TYPE assessment_delivery AS ENUM ('in_platform','export_pdf','export_csv');
EXCEPTION WHEN duplicate_object THEN NULL; END $$`;

await sql`DO $$ BEGIN
  CREATE TYPE obj_source AS ENUM ('in_platform','manual_entry');
EXCEPTION WHEN duplicate_object THEN NULL; END $$`;

await sql`CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id),
  type assessment_type NOT NULL,
  obj_question_count INTEGER NOT NULL,
  lesson_range_start_id UUID NOT NULL REFERENCES lessons(id),
  lesson_range_end_id UUID NOT NULL REFERENCES lessons(id),
  status assessment_status NOT NULL DEFAULT 'draft',
  delivery_method assessment_delivery,
  practical_prompt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;

await sql`CREATE TABLE IF NOT EXISTS assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_option_index INTEGER NOT NULL,
  source_lesson_id UUID REFERENCES lessons(id),
  order_index INTEGER NOT NULL,
  ai_generated BOOLEAN NOT NULL DEFAULT TRUE,
  edited_by_teacher BOOLEAN NOT NULL DEFAULT FALSE
)`;

await sql`CREATE TABLE IF NOT EXISTS assessment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  obj_score INTEGER,
  obj_source obj_source,
  practical_submission_id UUID REFERENCES submissions(id),
  practical_score INTEGER,
  total_score INTEGER,
  finalized_at TIMESTAMPTZ
)`;

await sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS assessment_id UUID REFERENCES assessments(id)`;

console.log("✓ Assessment tables created");
await sql.end();
