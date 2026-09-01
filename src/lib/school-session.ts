/**
 * Minimal school session — reads/writes a plain JSON cookie.
 * Replace with full Supabase Auth sessions once auth is wired.
 */
import { cookies } from "next/headers";

export interface SchoolSession {
  profileId: string;
  role: "teacher" | "student" | "school_admin";
  schoolId: string;
  classId?: string;   // set for students
  name: string;
}

const COOKIE = "school_session";

export async function getSchoolSession(): Promise<SchoolSession | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf-8")) as SchoolSession;
  } catch {
    return null;
  }
}

export function encodeSession(session: SchoolSession): string {
  return Buffer.from(JSON.stringify(session)).toString("base64");
}
