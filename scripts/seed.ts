// Phase 1: creates a fresh database with the 13-table schema and prints row counts.
// Later phases extend this to load the campus and generate the 30-day history.
import { DB_PATH, TABLE_NAMES, closeDb, getDb, resetDb } from "../lib/db";
import { deriveMeters, loadCampusConfig, loadFaultScript } from "../lib/config";

resetDb();
const db = getDb();

console.log(`Database      ${DB_PATH}`);
console.log(`journal_mode  ${db.pragma("journal_mode", { simple: true })}`);
console.log(`foreign_keys  ${db.pragma("foreign_keys", { simple: true })}`);
console.log(`user_version  ${db.pragma("user_version", { simple: true })}`);

console.log("\nRow counts after schema creation");
for (const table of TABLE_NAMES) {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as {
    n: number;
  };
  console.log(`  ${table.padEnd(16)} ${row.n}`);
}

const cfg = loadCampusConfig();
const script = loadFaultScript();
const meters = deriveMeters(cfg);
const count = (resource: string) =>
  meters.filter((m) => m.resource === resource).length;

console.log("\nCampus config (validated, not yet loaded into the database)");
console.log(`  blocks            ${cfg.blocks.map((b) => b.code).join(", ")}`);
console.log(
  `  rooms             ${cfg.blocks.reduce((n, b) => n + b.rooms.length, 0)}`,
);
console.log(`  electricity meters ${count("electricity")}`);
console.log(`  water meters      ${count("water")}`);
console.log(`  tank sensors      ${count("tank_level")}`);
console.log(
  `  stories           ${script.faults.map((f) => f.story_code).join(", ")}`,
);
console.log(`  diffuse entries   ${script.diffuse.length}`);

closeDb();
