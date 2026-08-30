import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  uuid,
  unique,
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
// Email captures — for Individual Course "notify me" list
// ---------------------------------------------------------------------------

export const emailCaptures = pgTable("email_captures", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  source: text("source").notNull().default("individual_course"), // extensible
  capturedAt: timestamp("captured_at", { withTimezone: true }).defaultNow().notNull(),
});
