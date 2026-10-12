/**
 * Database seeding script for CampusPulse.
 * Resets SQLite, regenerates 30 days of history, creates ST-6 verified ticket, and prints row stats.
 */
import { resetCampus } from "../lib/sim/reset";
import { DB_PATH, TABLE_NAMES, closeDb, getDb } from "../lib/db";

console.log("=== CampusPulse Database Seed ===");
const res = resetCampus();

const db = getDb();
console.log(`Database:     ${DB_PATH}`);
console.log(`Clock start:  ${res.clock}`);
console.log(`Seed:         ${res.seed}`);
console.log(`Duration:     ${res.durationMs} ms`);

console.log("\nTable row counts:");
for (const table of TABLE_NAMES) {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as {
    n: number;
  };
  console.log(`  ${table.padEnd(18)} ${row.n}`);
}

closeDb();
console.log("\nSeed completed successfully.");
