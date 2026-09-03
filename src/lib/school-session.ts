import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/db";
import {
  profiles,
  userRoles,
  schools,
  teacherAssignments,
  studentClasses,
  classes,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export interface SchoolSession {
  profileId: string;
  role: "teacher" | "student" | "school_admin";
  schoolId: string;
  classId?: string;
  name: string;
  /** true when session comes from Supabase Auth (not demo cookie) */
  isReal?: boolean;
}

const DEMO_COOKIE = "school_session";

export async function getSchoolSession(): Promise<SchoolSession | null> {
  // 1. Check Supabase Auth session
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const session = await buildSessionFromUser(user.id);
      if (session) return { ...session, isReal: true };
    }
  } catch {
    // Supabase unavailable — fall through to demo cookie
  }

  // 2. Fall back to demo cookie
  const store = await cookies();
  const raw = store.get(DEMO_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(
      Buffer.from(raw, "base64").toString("utf-8")
    ) as SchoolSession;
  } catch {
    return null;
  }
}

async function buildSessionFromUser(userId: string): Promise<SchoolSession | null> {
  const [row] = await db
    .select({ name: profiles.fullName, role: userRoles.role })
    .from(profiles)
    .innerJoin(userRoles, eq(userRoles.profileId, profiles.id))
    .where(
      and(
        eq(profiles.id, userId),
        inArray(userRoles.role, ["school_admin", "teacher", "student"])
      )
    )
    .limit(1);

  if (!row) return null;

  if (row.role === "school_admin") {
    const [school] = await db
      .select({ id: schools.id })
      .from(schools)
      .where(eq(schools.adminId, userId))
      .limit(1);
    if (!school) return null;
    return {
      profileId: userId,
      role: "school_admin",
      schoolId: school.id,
      name: row.name ?? "Admin",
    };
  }

  if (row.role === "teacher") {
    const [assign] = await db
      .select({ classId: teacherAssignments.classId, schoolId: teacherAssignments.schoolId })
      .from(teacherAssignments)
      .where(eq(teacherAssignments.profileId, userId))
      .limit(1);
    if (!assign) return null;
    return {
      profileId: userId,
      role: "teacher",
      schoolId: assign.schoolId,
      classId: assign.classId,
      name: row.name ?? "Teacher",
    };
  }

  if (row.role === "student") {
    const [sc] = await db
      .select({ classId: studentClasses.classId, schoolId: classes.schoolId })
      .from(studentClasses)
      .innerJoin(classes, eq(studentClasses.classId, classes.id))
      .where(eq(studentClasses.profileId, userId))
      .limit(1);
    if (!sc) return null;
    return {
      profileId: userId,
      role: "student",
      schoolId: sc.schoolId,
      classId: sc.classId,
      name: row.name ?? "Student",
    };
  }

  return null;
}

export function encodeSession(session: SchoolSession): string {
  return Buffer.from(JSON.stringify(session)).toString("base64");
}
