import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  uuid,
  unique,
  jsonb,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const roleEnum = pgEnum("role", [
  "cohort_member",
  "individual_learner",
  "school_admin",
  "teacher",
  "student",
]);

export const cohortStatusEnum = pgEnum("cohort_status", [
  "draft",
  "open",
  "in_progress",
  "completed",
]);

export const applicationStatusEnum = pgEnum("application_status", [
  "pending",
  "accepted",
  "rejected",
  "withdrawn",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "refunded",
  "failed",
]);

// ---------------------------------------------------------------------------
// Profiles — one row per Supabase Auth user
// Roles are many-to-many via user_roles; a single account can hold multiple.
// ---------------------------------------------------------------------------

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // mirrors auth.users.id
  email: text("email").notNull().unique(),
  // username is optional — accounts created with only a username use a synthetic
  // internal email (username@compile.internal) with Supabase Auth. Login accepts
  // either field; the API resolves username → email before calling Supabase.
  username: text("username").unique(),
  fullName: text("full_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Many-to-many: a profile can hold multiple roles over time
export const userRoles = pgTable(
  "user_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.profileId, t.role)]
);

// ---------------------------------------------------------------------------
// Cohorts — each numbered batch
// ---------------------------------------------------------------------------

export const cohorts = pgTable("cohorts", {
  id: uuid("id").primaryKey().defaultRandom(),
  number: integer("number").notNull().unique(), // 1, 2, 3 …
  title: text("title").notNull(),              // "Web & Platforms"
  status: cohortStatusEnum("status").notNull().default("draft"),
  seatCap: integer("seat_cap").notNull().default(10),
  earlyBirdPriceKobo: integer("early_bird_price_kobo").notNull(), // ₦50,000 = 5_000_000
  regularPriceKobo: integer("regular_price_kobo").notNull(),      // ₦70,000 = 7_000_000
  earlyBirdDeadline: timestamp("early_bird_deadline", { withTimezone: true }),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Applications — submitted before payment
// ---------------------------------------------------------------------------

export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  cohortId: uuid("cohort_id")
    .notNull()
    .references(() => cohorts.id),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  status: applicationStatusEnum("status").notNull().default("pending"),
  // Flexible answers stored as JSON text to avoid schema churn per cohort
  answersJson: text("answers_json"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Enrollments — created after payment succeeds
// ---------------------------------------------------------------------------

export const enrollments = pgTable("enrollments", {
  id: uuid("id").primaryKey().defaultRandom(),
  cohortId: uuid("cohort_id")
    .notNull()
    .references(() => cohorts.id),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  applicationId: uuid("application_id").references(() => applications.id),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true }).defaultNow().notNull(),
  active: boolean("active").notNull().default(true),
});

// ---------------------------------------------------------------------------
// Payments — Paystack reference tracking
// ---------------------------------------------------------------------------

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  enrollmentId: uuid("enrollment_id").references(() => enrollments.id),
  paystackReference: text("paystack_reference").notNull().unique(),
  amountKobo: integer("amount_kobo").notNull(),
  status: paymentStatusEnum("status").notNull().default("pending"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Cohort Registrations — payment record, no Supabase auth dependency
// ---------------------------------------------------------------------------

export const cohortRegistrations = pgTable("cohort_registrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  cohortId: uuid("cohort_id").notNull().references(() => cohorts.id),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  whatsapp: text("whatsapp"),
  paystackReference: text("paystack_reference").notNull().unique(),
  amountKobo: integer("amount_kobo").notNull(),
  status: paymentStatusEnum("status").notNull().default("pending"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Waitlist — email + WhatsApp captures for Individual Course and School Edition
// ---------------------------------------------------------------------------

export const waitlistSourceEnum = pgEnum("waitlist_source", [
  "individual_course",
  "school_edition",
]);

export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  whatsapp: text("whatsapp"), // international format e.g. +2348012345678
  source: waitlistSourceEnum("source").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
},
(t) => [unique().on(t.email, t.source)] // one entry per email per source
);

// ===========================================================================
// SCHOOL EDITION
// ===========================================================================

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "expired",
  "suspended",
  "trial",
]);

export const classLevelEnum = pgEnum("class_level", [
  "JSS1", "JSS2", "JSS3",
  "SSS1", "SSS2", "SSS3",
]);

export const lessonTypeEnum = pgEnum("lesson_type", ["video", "text", "mixed"]);

export const questionTypeEnum = pgEnum("question_type", ["mcq", "short_answer", "practical"]);

// ---------------------------------------------------------------------------
// Schools — one row per subscribing school
// ---------------------------------------------------------------------------

export const schools = pgTable("schools", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  address: text("address"),
  state: text("state"), // Nigerian state
  adminId: uuid("admin_id").references(() => profiles.id), // the school_admin profile
  subscriptionStatus: subscriptionStatusEnum("subscription_status").notNull().default("trial"),
  subscriptionExpiresAt: timestamp("subscription_expires_at", { withTimezone: true }),
  licenseKey: text("license_key").unique(), // for offline license validation
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// School subscriptions — payment history per school
// ---------------------------------------------------------------------------

export const schoolSubscriptions = pgTable("school_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  paystackReference: text("paystack_reference").notNull().unique(),
  amountKobo: integer("amount_kobo").notNull(), // ₦150,000 = 15_000_000
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  status: paymentStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Classes — e.g. "JSS1 A", "SS3 Science"
// ---------------------------------------------------------------------------

export const classes = pgTable("classes", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // "JSS1 A"
  level: classLevelEnum("level").notNull(),
  academicYear: text("academic_year").notNull(), // "2025/2026"
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Student ↔ class membership
// ---------------------------------------------------------------------------

export const studentClasses = pgTable("student_classes", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true }).defaultNow().notNull(),
  active: boolean("active").notNull().default(true),
},
(t) => [unique().on(t.profileId, t.classId)]
);

// ---------------------------------------------------------------------------
// Teacher ↔ class assignments
// ---------------------------------------------------------------------------

export const teacherAssignments = pgTable("teacher_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  subject: text("subject"), // null = class teacher (all subjects)
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
},
(t) => [unique().on(t.profileId, t.classId, t.subject)]
);

// ---------------------------------------------------------------------------
// Subjects — curriculum subjects per level
// ---------------------------------------------------------------------------

export const subjects = pgTable("subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(), // "Mathematics", "English Language"
  code: text("code").notNull().unique(), // "MATH", "ENG"
  levels: text("levels").array().notNull(), // ["JSS1","JSS2","JSS3"] — which levels use this
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Lessons — one per topic within a subject + level
// ---------------------------------------------------------------------------

export const lessons = pgTable("lessons", {
  id: uuid("id").primaryKey().defaultRandom(),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id),
  level: classLevelEnum("level").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: lessonTypeEnum("type").notNull().default("video"),
  contentUrl: text("content_url"),       // local file path for School Edition LAN delivery
  videoId: text("video_id"),             // YouTube or VdoCipher video ID
  videoProvider: text("video_provider"), // "youtube" | "vdocipher"
  notesUrl: text("notes_url"),           // PDF/PPT download path
  gradingRubric: text("grading_rubric"), // plain-text rubric fed to AI for grading
  notes: text("notes"),                  // full markdown lesson notes
  durationMinutes: integer("duration_minutes"),
  order: integer("order").notNull().default(0),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Lesson progress — per student
// ---------------------------------------------------------------------------

export const lessonProgress = pgTable("lesson_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id").notNull().references(() => lessons.id),
  completed: boolean("completed").notNull().default(false),
  progressSeconds: integer("progress_seconds").notNull().default(0),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
},
(t) => [unique().on(t.profileId, t.lessonId)]
);

// ---------------------------------------------------------------------------
// Practice questions — MCQ per subject + level
// ---------------------------------------------------------------------------

export const practiceQuestions = pgTable("practice_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id),
  lessonId: uuid("lesson_id").references(() => lessons.id), // optional: tied to a lesson
  level: classLevelEnum("level").notNull(),
  type: questionTypeEnum("type").notNull().default("mcq"),
  question: text("question").notNull(),
  options: jsonb("options"), // [{label:"A",text:"..."}, ...] for MCQ
  correctAnswer: text("correct_answer").notNull(), // "A" for MCQ, text for short_answer
  explanation: text("explanation"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Question attempts — per student
// ---------------------------------------------------------------------------

export const questionAttempts = pgTable("question_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  questionId: uuid("question_id").notNull().references(() => practiceQuestions.id),
  answer: text("answer").notNull(),
  correct: boolean("correct").notNull(),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Practical exams — student submissions for teacher review
// ---------------------------------------------------------------------------

export const practicalExams = pgTable("practical_exams", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  classId: uuid("class_id").notNull().references(() => classes.id),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id),
  title: text("title").notNull(),
  submissionText: text("submission_text"),
  submissionUrl: text("submission_url"),
  status: text("status").notNull().default("submitted"),
  teacherFeedback: text("teacher_feedback"),
  score: integer("score"),
  reviewedBy: uuid("reviewed_by").references(() => profiles.id),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

// ===========================================================================
// SCHOOL EDITION — CLASSROOM DELIVERY FEATURES
// ===========================================================================

// ---------------------------------------------------------------------------
// Lesson releases — teacher permission flag per (lesson, class)
// A row existing = that lesson is visible to that class. No row = locked.
// ---------------------------------------------------------------------------

export const lessonReleases = pgTable(
  "lesson_releases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    releasedBy: uuid("released_by").references(() => profiles.id),
    releasedAt: timestamp("released_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.lessonId, t.classId)]
);

// ---------------------------------------------------------------------------
// Lesson Q&A — one shared thread per (lesson, class)
// ---------------------------------------------------------------------------

export const questionStatusEnum = pgEnum("question_status", [
  "queued",
  "ai_answered",
  "teacher_replied",
]);

export const lessonQuestions = pgTable("lesson_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => profiles.id),
  questionText: text("question_text").notNull(),
  aiAnswer: text("ai_answer"),
  aiAnsweredAt: timestamp("ai_answered_at", { withTimezone: true }),
  teacherResponse: text("teacher_response"),
  teacherId: uuid("teacher_id").references(() => profiles.id),
  teacherRepliedAt: timestamp("teacher_replied_at", { withTimezone: true }),
  status: questionStatusEnum("status").notNull().default("queued"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Teacher private questions — not visible to students
// ---------------------------------------------------------------------------

export const teacherQuestions = pgTable("teacher_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  teacherId: uuid("teacher_id").notNull().references(() => profiles.id),
  schoolId: uuid("school_id").notNull().references(() => schools.id),
  questionText: text("question_text").notNull(),
  aiAnswer: text("ai_answer"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// AI queue — offline-safe queue for Q&A answers and submission grading
// When offline, rows are inserted here; a flush job processes them on reconnect.
// ---------------------------------------------------------------------------

export const aiQueueTypeEnum = pgEnum("ai_queue_type", ["qa", "grade"]);
export const aiQueueStatusEnum = pgEnum("ai_queue_status", [
  "pending",
  "processing",
  "done",
  "failed",
]);

export const aiQueue = pgTable("ai_queue", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: aiQueueTypeEnum("type").notNull(),
  payload: jsonb("payload").notNull(), // { questionId } | { submissionId }
  status: aiQueueStatusEnum("status").notNull().default("pending"),
  result: jsonb("result"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Unified submissions — class activities, practicals, and exams in one table
// type field distinguishes them; teacher Review Queue filters by type.
// ---------------------------------------------------------------------------

export const submissionTypeEnum = pgEnum("submission_type", [
  "class_activity",
  "practical",
  "exam",
]);

export const submissionStatusEnum = pgEnum("submission_status", [
  "submitted",
  "ai_graded",
  "teacher_confirmed",
]);

export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  classId: uuid("class_id").notNull().references(() => classes.id),
  lessonId: uuid("lesson_id").references(() => lessons.id),
  assessmentId: uuid("assessment_id"), // FK to assessments added via migration (avoids circular ref)
  type: submissionTypeEnum("type").notNull().default("class_activity"),
  content: text("content").notNull(),             // raw code or external URL
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  aiScore: integer("ai_score"),                   // 0-100, AI first-pass only
  aiFeedback: text("ai_feedback"),
  aiGradedAt: timestamp("ai_graded_at", { withTimezone: true }),
  teacherScore: integer("teacher_score"),          // score of record after confirmation
  teacherId: uuid("teacher_id").references(() => profiles.id),
  teacherReviewedAt: timestamp("teacher_reviewed_at", { withTimezone: true }),
  status: submissionStatusEnum("status").notNull().default("submitted"),
});

// ---------------------------------------------------------------------------
// Workspace saves — auto-saved draft code, one row per (student, lesson)
// Upserted periodically so closing the browser doesn't lose work.
// ---------------------------------------------------------------------------

export const workspaceSaves = pgTable(
  "workspace_saves",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    files: jsonb("files").notNull().$type<{ name: string; content: string }[]>(),
    savedAt: timestamp("saved_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.studentId, t.lessonId)]
);

// ---------------------------------------------------------------------------
// Assessments — midterm and exam generation, review, and delivery
// ---------------------------------------------------------------------------

export const assessmentTypeEnum = pgEnum("assessment_type", ["midterm", "exam"]);
export const assessmentStatusEnum = pgEnum("assessment_status", [
  "draft",
  "questions_generated",
  "reviewed",
  "finalized",
]);
export const assessmentDeliveryEnum = pgEnum("assessment_delivery", [
  "in_platform",
  "export_pdf",
  "export_csv",
]);
export const objSourceEnum = pgEnum("obj_source", ["in_platform", "manual_entry"]);

export const assessments = pgTable("assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  teacherId: uuid("teacher_id").notNull().references(() => profiles.id),
  type: assessmentTypeEnum("type").notNull(),
  objQuestionCount: integer("obj_question_count").notNull(), // 20=midterm, 30=exam
  lessonRangeStartId: uuid("lesson_range_start_id").notNull().references(() => lessons.id),
  lessonRangeEndId: uuid("lesson_range_end_id").notNull().references(() => lessons.id),
  status: assessmentStatusEnum("status").notNull().default("draft"),
  deliveryMethod: assessmentDeliveryEnum("delivery_method"),
  practicalPrompt: text("practical_prompt"), // AI-generated exercise description
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const assessmentQuestions = pgTable("assessment_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  assessmentId: uuid("assessment_id")
    .notNull()
    .references(() => assessments.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  options: jsonb("options").notNull().$type<string[]>(), // 4 plain-text option strings
  correctOptionIndex: integer("correct_option_index").notNull(), // 0–3
  sourceLessonId: uuid("source_lesson_id").references(() => lessons.id),
  orderIndex: integer("order_index").notNull(),
  aiGenerated: boolean("ai_generated").notNull().default(true),
  editedByTeacher: boolean("edited_by_teacher").notNull().default(false),
});

export const assessmentResults = pgTable("assessment_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  assessmentId: uuid("assessment_id")
    .notNull()
    .references(() => assessments.id, { onDelete: "cascade" }),
  studentId: uuid("student_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  objScore: integer("obj_score"),
  objSource: objSourceEnum("obj_source"),
  practicalSubmissionId: uuid("practical_submission_id"), // FK enforced via migration
  practicalScore: integer("practical_score"),
  totalScore: integer("total_score"),
  finalizedAt: timestamp("finalized_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Class lesson progress — playback position per (lesson, class)
// Written by the teacher while playing a lesson for a class; read on next
// open so the teacher resumes from exactly where that class left off.
// ---------------------------------------------------------------------------

export const classLessonProgress = pgTable(
  "class_lesson_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    lastPositionSeconds: integer("last_position_seconds").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.lessonId, t.classId)]
);
