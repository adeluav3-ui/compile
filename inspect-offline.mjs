/**
 * Read and display the current state of the offline video pipeline.
 * Run after releasing lessons to watch the pipeline progress.
 *
 * Usage:
 *   node inspect-offline.mjs
 *   node inspect-offline.mjs --watch   (re-run every 3s)
 */

import { readFileSync, statSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

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

const dbPath = process.env.LOCAL_DB_PATH;
const mediaDir = process.env.MEDIA_DIR;

if (!dbPath) { console.error("LOCAL_DB_PATH not set"); process.exit(1); }

const Database = (await import("better-sqlite3")).default;

function inspect() {
  let db;
  try {
    db = new Database(dbPath, { readonly: true });
  } catch (e) {
    console.error("Cannot open DB:", e.message);
    return;
  }

  console.clear();
  console.log("=== OFFLINE PIPELINE STATE ===");
  console.log(new Date().toISOString());
  console.log("");

  // local_auth_config
  const configs = db.prepare("SELECT key, value FROM local_auth_config").all();
  console.log("── local_auth_config ──");
  for (const r of configs) {
    if (r.key === "video_key") {
      console.log(`  video_key: ${r.value.slice(0, 8)}...${r.value.slice(-8)} (${r.value.length} chars)`);
    } else if (r.key === "last_check_at") {
      console.log(`  last_check_at: ${new Date(Number(r.value)).toISOString()}`);
    } else {
      console.log(`  ${r.key}: ${r.value}`);
    }
  }
  if (configs.length === 0) console.log("  (empty)");
  console.log("");

  // video_sync
  const rows = db.prepare("SELECT * FROM video_sync ORDER BY updated_at DESC").all();
  console.log("── video_sync ──");
  if (rows.length === 0) {
    console.log("  (no rows — have you released a lesson yet?)");
  }
  for (const r of rows) {
    console.log(`  lesson: ${r.lesson_id}`);
    console.log(`    status:        ${r.status}`);
    console.log(`    video_source:  ${r.video_source ?? "(null)"}`);
    console.log(`    source_url:    ${r.source_url ?? "(null)"}`);
    console.log(`    local_path:    ${r.local_path ?? "(null)"}`);
    console.log(`    attempt_count: ${r.attempt_count}`);
    console.log(`    progress_pct:  ${r.progress_pct}%`);
    console.log(`    error_text:    ${r.error_text ?? "none"}`);
    console.log(`    updated_at:    ${new Date(r.updated_at).toISOString()}`);

    // Check file on disk
    if (r.local_path) {
      try {
        const stat = statSync(r.local_path);
        const kb = Math.round(stat.size / 1024);
        console.log(`    file_size:     ${kb} KB  ← file EXISTS`);
      } catch {
        console.log(`    file_size:     FILE MISSING (local_path set but file not found)`);
      }
    }
    console.log("");
  }

  // class_lesson_progress
  const progress = db.prepare("SELECT * FROM class_lesson_progress ORDER BY updated_at DESC").all();
  console.log("── class_lesson_progress ──");
  if (progress.length === 0) {
    console.log("  (no rows — play a video first)");
  }
  for (const r of progress) {
    console.log(`  lesson ${r.lesson_id} / class ${r.class_id}: ${r.last_position_seconds}s (saved ${new Date(r.updated_at).toISOString()})`);
  }

  db.close();
}

const watch = process.argv.includes("--watch");
inspect();
if (watch) {
  setInterval(inspect, 3000);
  console.log("\n[watching — Ctrl+C to stop]");
}
