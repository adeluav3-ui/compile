-- ============================================================================
-- Compile — Schema sync migration
-- Run this in the Supabase SQL editor whenever the Drizzle schema changes and
-- drizzle-kit push is unavailable. All statements use IF NOT EXISTS / IF EXISTS
-- so running this multiple times is safe.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums — create if missing
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE role AS ENUM ('cohort_member','individual_learner','school_admin','teacher','student');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cohort_status AS ENUM ('draft','open','in_progress','completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('pending','accepted','rejected','withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending','paid','refunded','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active','expired','suspended','trial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE class_level AS ENUM ('JSS1','JSS2','JSS3','SSS1','SSS2','SSS3');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lesson_type AS ENUM ('video','text','mixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE question_type AS ENUM ('mcq','short_answer','practical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE question_status AS ENUM ('queued','ai_answered','teacher_replied');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ai_queue_type AS ENUM ('qa','grade');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ai_queue_status AS ENUM ('pending','processing','done','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE submission_type AS ENUM ('class_activity','practical','exam');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE submission_status AS ENUM ('submitted','ai_graded','teacher_confirmed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE assessment_type AS ENUM ('midterm','exam');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE assessment_status AS ENUM ('draft','questions_generated','reviewed','finalized');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE assessment_delivery AS ENUM ('in_platform','export_pdf','export_csv');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE obj_source AS ENUM ('in_platform','manual_entry');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE waitlist_source AS ENUM ('individual_course','school_edition');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- profiles — add missing columns
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stored_password TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;

-- ---------------------------------------------------------------------------
-- schools — add missing columns
-- ---------------------------------------------------------------------------
ALTER TABLE schools ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES profiles(id);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS license_key TEXT UNIQUE;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;

-- ---------------------------------------------------------------------------
-- classes — add missing columns
-- ---------------------------------------------------------------------------
ALTER TABLE classes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;

-- ---------------------------------------------------------------------------
-- subjects — create if missing
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  levels TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ---------------------------------------------------------------------------
-- lessons — add missing columns
-- ---------------------------------------------------------------------------
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id);
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_url TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS video_id TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS video_provider TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS notes_url TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS grading_rubric TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;

-- ---------------------------------------------------------------------------
-- lesson_releases — add missing columns (releasedBy is already nullable)
-- ---------------------------------------------------------------------------
ALTER TABLE lesson_releases ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;

-- ---------------------------------------------------------------------------
-- lesson_questions — create if missing
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lesson_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id),
  question_text TEXT NOT NULL,
  ai_answer TEXT,
  ai_answered_at TIMESTAMPTZ,
  teacher_response TEXT,
  teacher_id UUID REFERENCES profiles(id),
  teacher_replied_at TIMESTAMPTZ,
  status question_status NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ---------------------------------------------------------------------------
-- teacher_questions — create if missing
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teacher_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id),
  school_id UUID NOT NULL REFERENCES schools(id),
  question_text TEXT NOT NULL,
  ai_answer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ---------------------------------------------------------------------------
-- ai_queue — create if missing
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type ai_queue_type NOT NULL,
  payload JSONB NOT NULL,
  status ai_queue_status NOT NULL DEFAULT 'pending',
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  processed_at TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- submissions — create if missing, or add missing columns
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id),
  lesson_id UUID REFERENCES lessons(id),
  assessment_id UUID,
  type submission_type NOT NULL DEFAULT 'class_activity',
  content TEXT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ai_score INTEGER,
  ai_feedback TEXT,
  ai_graded_at TIMESTAMPTZ,
  teacher_score INTEGER,
  teacher_id UUID REFERENCES profiles(id),
  teacher_reviewed_at TIMESTAMPTZ,
  status submission_status NOT NULL DEFAULT 'submitted'
);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS assessment_id UUID;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES lessons(id);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_score INTEGER;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_feedback TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_graded_at TIMESTAMPTZ;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS teacher_score INTEGER;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES profiles(id);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS teacher_reviewed_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- workspace_saves — create if missing
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workspace_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  files JSONB NOT NULL DEFAULT '[]',
  saved_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(student_id, lesson_id)
);

-- Migrate existing installs: replace code TEXT column with files JSONB
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspace_saves' AND column_name = 'code'
  ) THEN
    ALTER TABLE workspace_saves DROP COLUMN code;
    ALTER TABLE workspace_saves ADD COLUMN IF NOT EXISTS files JSONB NOT NULL DEFAULT '[]';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- assessments — create if missing
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assessments (
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
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ---------------------------------------------------------------------------
-- assessment_questions — create if missing
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_option_index INTEGER NOT NULL,
  source_lesson_id UUID REFERENCES lessons(id),
  order_index INTEGER NOT NULL,
  ai_generated BOOLEAN NOT NULL DEFAULT TRUE,
  edited_by_teacher BOOLEAN NOT NULL DEFAULT FALSE
);

-- ---------------------------------------------------------------------------
-- assessment_results — create if missing
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assessment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  obj_score INTEGER,
  obj_source obj_source,
  practical_submission_id UUID,
  practical_score INTEGER,
  total_score INTEGER,
  finalized_at TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- class_lesson_progress — create if missing
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS class_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  last_position_seconds INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(lesson_id, class_id)
);

-- ---------------------------------------------------------------------------
-- school_subscriptions — create if missing
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS school_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  paystack_reference TEXT NOT NULL UNIQUE,
  amount_kobo INTEGER NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ---------------------------------------------------------------------------
-- lesson_progress — create if missing
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id),
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  progress_seconds INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(profile_id, lesson_id)
);
