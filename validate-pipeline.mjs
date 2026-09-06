/**
 * Dry-run validation: confirms every prerequisite for the offline pipeline
 * without triggering a real download. Run this BEFORE starting the dev server.
 */

import { readFileSync, existsSync, statSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(resolve(__dirname, ".env.local"), "utf8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const val = trimmed.slice(eq + 1).trim();
  if (!process.env[key]) process.env[key] = val;
}

let passed = 0;
let failed = 0;

function ok(label) { console.log("  ✓  " + label); passed++; }
function fail(label, detail) { console.log("  ✗  " + label + (detail ? "  →  " + detail : "")); failed++; }

console.log("\n=== OFFLINE PIPELINE PREREQUISITE CHECK ===\n");

// 1. LOCAL_DB_PATH
const dbPath = process.env.LOCAL_DB_PATH;
if (dbPath) {
  ok("LOCAL_DB_PATH set: " + dbPath);
  if (existsSync(dbPath)) ok("SQLite file exists (" + statSync(dbPath).size + " bytes)");
  else fail("SQLite file NOT found", "run: node setup-offline-test.mjs");
} else {
  fail("LOCAL_DB_PATH not set");
}

// 2. MEDIA_DIR
const mediaDir = process.env.MEDIA_DIR;
if (mediaDir) {
  ok("MEDIA_DIR set: " + mediaDir);
  if (existsSync(mediaDir)) ok("MEDIA_DIR exists");
  else fail("MEDIA_DIR directory does not exist");
} else {
  fail("MEDIA_DIR not set");
}

// 3. SCHOOL_VIDEO_KEY
const videoKey = process.env.SCHOOL_VIDEO_KEY;
if (videoKey && /^[0-9a-f]{64}$/.test(videoKey)) {
  ok("SCHOOL_VIDEO_KEY is valid 64-char hex");
} else if (videoKey) {
  fail("SCHOOL_VIDEO_KEY is set but is NOT valid 64-char hex", `got ${videoKey.length} chars`);
} else {
  fail("SCHOOL_VIDEO_KEY not set");
}

// 4. video_key in SQLite
if (dbPath && existsSync(dbPath)) {
  try {
    const Database = (await import("better-sqlite3")).default;
    const db = new Database(dbPath, { readonly: true });
    const row = db.prepare("SELECT value FROM local_auth_config WHERE key = 'video_key'").get();
    db.close();
    if (row?.value === videoKey) {
      ok("video_key in SQLite matches SCHOOL_VIDEO_KEY");
    } else if (row) {
      fail("video_key in SQLite does NOT match SCHOOL_VIDEO_KEY — re-run setup-offline-test.mjs");
    } else {
      fail("video_key not in local_auth_config — run: node setup-offline-test.mjs");
    }
  } catch (e) {
    fail("Could not read SQLite: " + e.message);
  }
}

// 5. Encrypt/decrypt round-trip with the actual key
if (videoKey && /^[0-9a-f]{64}$/.test(videoKey)) {
  try {
    const key = Buffer.from(videoKey, "hex");
    const iv = randomBytes(16);
    const plaintext = Buffer.from("COMPILE_TEST_FRAME_DATA_1234567890abcdef");
    const cipher = createCipheriv("aes-256-cbc", key, iv);
    const encrypted = Buffer.concat([iv, cipher.update(plaintext), cipher.final()]);
    const dec_iv = encrypted.subarray(0, 16);
    const dec_data = encrypted.subarray(16);
    const decipher = createDecipheriv("aes-256-cbc", key, dec_iv);
    const decrypted = Buffer.concat([decipher.update(dec_data), decipher.final()]);
    if (decrypted.equals(plaintext)) {
      ok("AES-256-CBC encrypt/decrypt round-trip: OK");
    } else {
      fail("AES-256-CBC round-trip FAILED — key may be wrong");
    }
  } catch (e) {
    fail("AES-256-CBC test threw: " + e.message);
  }
}

// 6. yt-dlp on PATH and spawnable
await new Promise((resolve) => {
  const proc = spawn("yt-dlp", ["--version"]);
  let out = "";
  proc.stdout?.on("data", (d) => { out += d.toString(); });
  proc.on("error", (err) => {
    if (err.code === "ENOENT") fail("yt-dlp not on PATH — install: pip install yt-dlp");
    else fail("yt-dlp spawn error: " + err.message);
    resolve();
  });
  proc.on("close", (code) => {
    if (code === 0) ok("yt-dlp spawnable, version: " + out.trim());
    else fail("yt-dlp exited with code " + code);
    resolve();
  });
});

// 7. Internet connectivity (reachability of Supabase)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl) {
  try {
    const res = await Promise.race([
      fetch(supabaseUrl, { method: "HEAD" }),
      new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 4000)),
    ]);
    if (res.ok || res.status < 500) ok("Internet reachable (Supabase HEAD responded " + res.status + ")");
    else fail("Supabase unreachable (status " + res.status + ")");
  } catch (e) {
    fail("Internet check failed: " + e.message);
  }
} else {
  fail("NEXT_PUBLIC_SUPABASE_URL not set — cannot check connectivity");
}

console.log("");
console.log(`=== ${passed} passed, ${failed} failed ===`);
if (failed === 0) {
  console.log("\nAll checks passed. Restart the dev server, then release lessons 1-3.");
  console.log("Monitor with:  node inspect-offline.mjs --watch");
} else {
  console.log("\nFix the failed checks before proceeding.");
}
console.log("");
