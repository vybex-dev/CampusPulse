/**
 * SQLite handle for CampusPulse (better-sqlite3), kept on globalThis so hot reloads
 * in `next dev` never create a second connection.
 *
 * Schema changes: the database is generated, never versioned in code. Bump SCHEMA_VERSION and
 * run `npm run seed` (or POST /api/demo/reset) to rebuild it.
 *
 * ── Vercel / serverless ──
 * The deployed bundle (/var/task) is read-only; only /tmp is writable (and it is ephemeral and
 * per-instance). So on Vercel the runtime DB lives at /tmp/campuspulse.db and is copied once,
 * on cold start, from the seeded DB bundled with the deployment (data/campuspulse.db).
 * Locally nothing changes: the DB is ./data/campuspulse.db.
 *
 * ── node:sqlite fallback (if better-sqlite3 will not install on a laptop) ──
 * Everything outside this file uses only: db.exec(), db.prepare(sql).run/get/all(),
 * db.pragma(), and tx(). To switch drivers, change ONLY this file:
 *
 *   import { DatabaseSync } from 'node:sqlite';             // Node 22.5+, needs no native build
 *   export type Db = DatabaseSync;
 *   // createDatabase(): `new DatabaseSync(file)`, then run the PRAGMAs with db.exec('PRAGMA ...')
 *   //   and read user_version with db.prepare('PRAGMA user_version').get().
 *   // tx(): no db.transaction() exists, so use
 *   //   db.exec('BEGIN IMMEDIATE'); try { const r = fn(db); db.exec('COMMIT'); return r; }
 *   //   catch (e) { db.exec('ROLLBACK'); throw e; }
 *   // Replace db.pragma(name, { simple: true }) calls in scripts and tests with the same
 *   //   db.prepare('PRAGMA name').get() form.
 * Statement APIs (run, get, all) and `?` placeholders behave the same in both drivers.
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type Db = Database.Database;

const IS_VERCEL = Boolean(process.env.VERCEL);

/** Seeded DB produced by `npm run seed`; bundled read-only with the deployment on Vercel. */
export const SEED_DB_PATH = path.join(process.cwd(), "data", "campuspulse.db");

/** Runtime DB: /tmp on Vercel (the only writable directory), ./data locally. */
export const DB_PATH = IS_VERCEL ? "/tmp/campuspulse.db" : SEED_DB_PATH;

export const SCHEMA_VERSION = 1;

/** The 13 tables, in dependency order. */
export const TABLE_NAMES = [
  "location",
  "meter",
  "reading",
  "timetable_slot",
  "baseline",
  "fault",
  "anomaly",
  "ticket",
  "ticket_event",
  "savings",
  "waste_log",
  "ai_cache",
  "setting",
] as const;

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS location (
  id         INTEGER PRIMARY KEY,
  parent_id  INTEGER REFERENCES location(id),
  kind       TEXT NOT NULL CHECK (kind IN ('campus','block','floor','room')),
  code       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  room_type  TEXT CHECK (room_type IS NULL OR room_type IN
               ('classroom','lab','office','library_room','hostel_floor','mess')),
  population INTEGER
);
CREATE INDEX IF NOT EXISTS idx_location_parent ON location(parent_id);

CREATE TABLE IF NOT EXISTS meter (
  id          TEXT PRIMARY KEY,
  location_id INTEGER NOT NULL REFERENCES location(id),
  resource    TEXT NOT NULL CHECK (resource IN ('electricity','water','tank_level')),
  unit        TEXT NOT NULL CHECK (unit IN ('kW','L/h','percent'))
);
CREATE INDEX IF NOT EXISTS idx_meter_location ON meter(location_id);

CREATE TABLE IF NOT EXISTS reading (
  meter_id TEXT NOT NULL REFERENCES meter(id),
  ts       TEXT NOT NULL,
  value    REAL NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_reading_meter_ts ON reading(meter_id, ts);

CREATE TABLE IF NOT EXISTS timetable_slot (
  location_id INTEGER NOT NULL REFERENCES location(id),
  weekday     INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  hour        INTEGER NOT NULL CHECK (hour BETWEEN 0 AND 23),
  scheduled   INTEGER NOT NULL CHECK (scheduled IN (0,1)),
  label       TEXT,
  PRIMARY KEY (location_id, weekday, hour)
);

CREATE TABLE IF NOT EXISTS baseline (
  meter_id     TEXT NOT NULL REFERENCES meter(id),
  hour_of_week INTEGER NOT NULL CHECK (hour_of_week BETWEEN 0 AND 167),
  expected     REAL NOT NULL,
  tolerance    REAL NOT NULL,
  computed_at  TEXT NOT NULL,
  PRIMARY KEY (meter_id, hour_of_week)
);

CREATE TABLE IF NOT EXISTS fault (
  id          INTEGER PRIMARY KEY,
  story_code  TEXT,
  meter_id    TEXT REFERENCES meter(id),
  kind        TEXT NOT NULL CHECK (kind IN
                ('elec_hold','elec_afterhours_excess','water_const_leak',
                 'water_tank_overflow','waste_bad_segregation','diffuse_elec','diffuse_leak')),
  params_json TEXT NOT NULL,
  start_ts    TEXT NOT NULL,
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  fixed_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_fault_story ON fault(story_code);

CREATE TABLE IF NOT EXISTS anomaly (
  id             INTEGER PRIMARY KEY,
  type           TEXT NOT NULL CHECK (type IN
                   ('elec_unscheduled_load','elec_band_excess','water_night_leak',
                    'water_overflow','waste_bad_segregation')),
  resource       TEXT NOT NULL CHECK (resource IN ('electricity','water','waste')),
  location_id    INTEGER NOT NULL REFERENCES location(id),
  meter_id       TEXT REFERENCES meter(id),
  start_ts       TEXT NOT NULL,
  end_ts         TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','cleared')),
  priority       TEXT NOT NULL CHECK (priority IN ('high','medium','low')),
  confidence     TEXT NOT NULL CHECK (confidence IN ('high','medium','low')),
  occurrences    INTEGER NOT NULL DEFAULT 1,
  excess_value   REAL NOT NULL,
  unit           TEXT NOT NULL CHECK (unit IN ('kWh','kL','kg')),
  cost_inr       REAL,
  daily_cost_inr REAL,
  co2e_kg        REAL NOT NULL DEFAULT 0,
  explanation    TEXT NOT NULL,
  evidence_json  TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_anomaly_status_resource ON anomaly(status, resource);
CREATE INDEX IF NOT EXISTS idx_anomaly_location ON anomaly(location_id);

CREATE TABLE IF NOT EXISTS ticket (
  id           INTEGER PRIMARY KEY,
  anomaly_id   INTEGER NOT NULL REFERENCES anomaly(id),
  title        TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN
                 ('open','in_progress','resolved','verifying','verified','reopened')),
  priority     TEXT NOT NULL CHECK (priority IN ('high','medium','low')),
  team         TEXT NOT NULL CHECK (team IN ('electrical','plumbing','housekeeping')),
  created_at   TEXT NOT NULL,
  resolved_at  TEXT,
  verified_at  TEXT,
  resolve_note TEXT
);
-- At most one non-closed ticket per anomaly. 'verified' is the only closed status.
CREATE UNIQUE INDEX IF NOT EXISTS ux_ticket_one_open_per_anomaly
  ON ticket(anomaly_id) WHERE status <> 'verified';
CREATE INDEX IF NOT EXISTS idx_ticket_status ON ticket(status);

CREATE TABLE IF NOT EXISTS ticket_event (
  id         INTEGER PRIMARY KEY,
  ticket_id  INTEGER NOT NULL REFERENCES ticket(id),
  ts         TEXT NOT NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('admin','staff','student','system')),
  event      TEXT NOT NULL CHECK (event IN
               ('created','assigned','status_changed','resolved','verified','reopened','note')),
  note       TEXT
);
CREATE INDEX IF NOT EXISTS idx_ticket_event_ticket ON ticket_event(ticket_id);

CREATE TABLE IF NOT EXISTS savings (
  ticket_id     INTEGER PRIMARY KEY REFERENCES ticket(id),
  window_start  TEXT NOT NULL,
  window_end    TEXT NOT NULL,
  expected_units REAL NOT NULL,
  actual_units   REAL NOT NULL,
  saved_units    REAL NOT NULL,
  saved_inr      REAL NOT NULL,
  saved_co2e_kg  REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS waste_log (
  id              INTEGER PRIMARY KEY,
  ts              TEXT NOT NULL,
  block_id        TEXT NOT NULL CHECK (block_id IN ('AB-A','AB-B','LIB','HST-1','HST-2','MESS')),
  mode            TEXT NOT NULL CHECK (mode IN ('identify','bin_check')),
  category        TEXT NOT NULL CHECK (category IN
                    ('wet_biodegradable','paper_cardboard','plastic','metal_glass',
                     'e_waste','hazardous','other_residual')),
  item_name       TEXT NOT NULL,
  confidence      REAL NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  source          TEXT NOT NULL CHECK (source IN ('ai','user_corrected','sample')),
  provider        TEXT NOT NULL CHECK (provider IN ('groq','gemini','sample')),
  chosen_bin      TEXT CHECK (chosen_bin IS NULL OR chosen_bin IN ('green','blue','red','black')),
  correct_bin     TEXT CHECK (correct_bin IS NULL OR correct_bin IN ('green','blue','red','black')),
  is_correct      INTEGER CHECK (is_correct IS NULL OR is_correct IN (0,1)),
  est_weight_kg   REAL NOT NULL DEFAULT 0,
  co2e_avoided_kg REAL NOT NULL DEFAULT 0,
  points          INTEGER NOT NULL DEFAULT 0,
  thumb           TEXT
);
CREATE INDEX IF NOT EXISTS idx_waste_log_block_ts ON waste_log(block_id, ts);

CREATE TABLE IF NOT EXISTS ai_cache (
  image_hash  TEXT NOT NULL,
  result_json TEXT NOT NULL,
  provider    TEXT NOT NULL CHECK (provider IN ('groq','gemini','sample')),
  created_at  TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ai_cache_hash ON ai_cache(image_hash);

CREATE TABLE IF NOT EXISTS setting (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

/**
 * On Vercel, copy the bundled seed DB into /tmp the first time this instance opens it.
 * No-op locally, for ':memory:', and when the runtime DB already exists.
 */
function bootstrapFromSeed(file: string): void {
  if (!IS_VERCEL || file !== DB_PATH || fs.existsSync(file)) return;
  if (fs.existsSync(SEED_DB_PATH)) {
    fs.copyFileSync(SEED_DB_PATH, file);
  } else {
    console.warn(
      `db: seed database not found at ${SEED_DB_PATH}; starting with an empty schema. ` +
        `Commit data/campuspulse.db and include it via outputFileTracingIncludes.`,
    );
  }
}

/** Open (or create) a database file, apply pragmas and the schema. Use ':memory:' in tests. */
export function createDatabase(file: string): Db {
  if (file !== ":memory:") {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    bootstrapFromSeed(file);
  }

  const db = new Database(file);
  // WAL needs extra -wal/-shm files; DELETE mode is the safer choice on ephemeral serverless disk.
  db.pragma(IS_VERCEL ? "journal_mode = DELETE" : "journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  const existing = db.pragma("user_version", { simple: true }) as number;
  if (existing !== 0 && existing !== SCHEMA_VERSION) {
    db.close();
    throw new Error(
      `Database schema version ${existing} does not match ${SCHEMA_VERSION}. Run "npm run seed" to rebuild it.`,
    );
  }

  db.exec(SCHEMA_SQL);
  db.pragma(`user_version = ${SCHEMA_VERSION}`);
  return db;
}

const g = globalThis as unknown as { __cpDb?: Db };

/** The shared handle for the app (data/campuspulse.db locally, /tmp/campuspulse.db on Vercel). */
export function getDb(): Db {
  if (!g.__cpDb || !g.__cpDb.open) g.__cpDb = createDatabase(DB_PATH);
  return g.__cpDb;
}

export function closeDb(): void {
  if (g.__cpDb?.open) g.__cpDb.close();
  g.__cpDb = undefined;
}

/**
 * Delete the runtime database file and start again.
 * Locally this wipes data/campuspulse.db (destructive by design; re-seed afterwards).
 * On Vercel it only removes the /tmp copy, so the next open re-copies the bundled seed.
 */
export function resetDb(): Db {
  closeDb();
  for (const suffix of ["", "-wal", "-shm"])
    fs.rmSync(DB_PATH + suffix, { force: true });
  return getDb();
}

/**
 * Run fn in one transaction: commits on return, rolls back on throw.
 * Nested calls become savepoints, so a service can call another service's tx() safely.
 */
export function tx<T>(fn: (db: Db) => T, db: Db = getDb()): T {
  return db.transaction(() => fn(db))();
}
