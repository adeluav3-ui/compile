import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

async function main() {
  await db
    .insert(schema.cohorts)
    .values({
      number: 1,
      title: "Web & Platforms",
      status: "open",
      seatCap: 10,
      earlyBirdPriceKobo: 5_000_000,
      regularPriceKobo: 7_000_000,
      // Sep 10, 2026 23:59:59 WAT (UTC+1) = 22:59:59 UTC
      earlyBirdDeadline: new Date("2026-09-10T22:59:59.000Z"),
      // Oct 3, 2026 (cohort start)
      startsAt: new Date("2026-10-03T11:00:00.000Z"),
    })
    .onConflictDoNothing();

  const [cohort] = await db
    .select()
    .from(schema.cohorts)
    .where(
      (await import("drizzle-orm")).eq(schema.cohorts.number, 1)
    );

  console.log("Cohort 01 seeded:", cohort);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
