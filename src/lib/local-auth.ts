import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { randomBytes } from "crypto";
import { getLocalDb } from "@/db/local";
import type { SchoolSession } from "./school-session";

const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours
const ALG = "HS256";

export const LOCAL_SESSION_COOKIE = "compile_local_session";

// ---------------------------------------------------------------------------
// Signing key — generated once, persisted in local_auth_config
// ---------------------------------------------------------------------------

async function getSigningKey(): Promise<CryptoKey | null> {
  const db = getLocalDb();
  if (!db) return null;

  const row = db
    .prepare("SELECT value FROM local_auth_config WHERE key = 'signing_secret'")
    .get() as { value: string } | undefined;

  let secretHex: string;
  if (row) {
    secretHex = row.value;
  } else {
    secretHex = randomBytes(32).toString("hex");
    db.prepare("INSERT INTO local_auth_config (key, value) VALUES ('signing_secret', ?)").run(secretHex);
  }

  return crypto.subtle.importKey(
    "raw",
    Buffer.from(secretHex, "hex"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

// ---------------------------------------------------------------------------
// Cache a credential after a successful online login
// ---------------------------------------------------------------------------

export async function cacheLocalCredential(
  userId: string,
  email: string,
  password: string,
  session: Pick<SchoolSession, "role" | "schoolId" | "classId" | "name">
): Promise<void> {
  const db = getLocalDb();
  if (!db) return; // Cloud build — no-op

  const pwHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  db.prepare(`
    INSERT INTO local_credentials (user_id, email, pw_hash, role, school_id, class_id, name, cached_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      email     = excluded.email,
      pw_hash   = excluded.pw_hash,
      role      = excluded.role,
      school_id = excluded.school_id,
      class_id  = excluded.class_id,
      name      = excluded.name,
      cached_at = excluded.cached_at
  `).run(
    userId,
    email.toLowerCase(),
    pwHash,
    session.role,
    session.schoolId,
    session.classId ?? null,
    session.name,
    Date.now()
  );
}

// ---------------------------------------------------------------------------
// Verify a login attempt against the local cache
// ---------------------------------------------------------------------------

export async function verifyLocalCredential(
  email: string,
  password: string
): Promise<SchoolSession | null> {
  const db = getLocalDb();
  if (!db) return null;

  const row = db
    .prepare("SELECT * FROM local_credentials WHERE email = ?")
    .get(email.toLowerCase()) as {
      user_id: string;
      email: string;
      pw_hash: string;
      role: string;
      school_id: string;
      class_id: string | null;
      name: string;
    } | undefined;

  if (!row) return null;

  const match = await bcrypt.compare(password, row.pw_hash);
  if (!match) return null;

  return {
    profileId: row.user_id,
    role: row.role as SchoolSession["role"],
    schoolId: row.school_id,
    classId: row.class_id ?? undefined,
    name: row.name,
    isLocal: true,
  };
}

// ---------------------------------------------------------------------------
// Issue a signed local session token (24-hour JWT)
// ---------------------------------------------------------------------------

export async function issueLocalSessionToken(session: SchoolSession): Promise<string | null> {
  const key = await getSigningKey();
  if (!key) return null;

  return new SignJWT({
    profileId: session.profileId,
    role: session.role,
    schoolId: session.schoolId,
    classId: session.classId ?? null,
    name: session.name,
    isLocal: true,
  })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_EXPIRY_SECONDS}s`)
    .sign(key);
}

// ---------------------------------------------------------------------------
// Verify a local session token (used by getSchoolSession + middleware)
// ---------------------------------------------------------------------------

export async function verifyLocalSessionToken(token: string): Promise<SchoolSession | null> {
  const key = await getSigningKey();
  if (!key) return null;

  try {
    const { payload } = await jwtVerify(token, key, { algorithms: [ALG] });

    if (
      typeof payload.profileId !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.schoolId !== "string" ||
      typeof payload.name !== "string"
    ) {
      return null;
    }

    return {
      profileId: payload.profileId,
      role: payload.role as SchoolSession["role"],
      schoolId: payload.schoolId,
      classId: typeof payload.classId === "string" ? payload.classId : undefined,
      name: payload.name,
      isLocal: true,
    };
  } catch {
    return null;
  }
}
