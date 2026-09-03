/**
 * Parses a consolidated markdown notes file and writes each lesson's notes
 * to the database.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx src/db/ingest-notes.ts <path-to-notes-file>
 *
 * The file must use ---LESSON BREAK--- as the separator between lessons.
 * Each block must start with "# Lesson N Study Notes: Title".
 * Matches lessons by order (lesson number) within the seeded subject.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { readFileSync } from "fs";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { parseNotesFile } from "../lib/notes-parser";

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npx tsx src/db/ingest-notes.ts <path-to-notes-file>");
    process.exit(1);
  }

  const content = readFileSync(filePath, "utf-8");
  const parsed = parseNotesFile(content);
  console.log(`Parsed ${parsed.length} lesson blocks`);

  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(client, { schema });

  let updated = 0;
  let skipped = 0;

  for (const { lessonNumber, notes } of parsed) {
    const rows = await db
      .select({ id: schema.lessons.id, title: schema.lessons.title })
      .from(schema.lessons)
      .where(eq(schema.lessons.order, lessonNumber));

    if (rows.length === 0) {
      console.warn(`  ⚠ No lesson found with order=${lessonNumber}, skipping`);
      skipped++;
      continue;
    }

    for (const row of rows) {
      await db
        .update(schema.lessons)
        .set({ notes })
        .where(eq(schema.lessons.id, row.id));
      console.log(`  ✓ Lesson ${lessonNumber}: "${row.title}" (${row.id})`);
      updated++;
    }
  }

  console.log(`\nDone — ${updated} updated, ${skipped} skipped`);
  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
