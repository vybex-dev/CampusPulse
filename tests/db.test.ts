import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  SCHEMA_VERSION,
  TABLE_NAMES,
  createDatabase,
  tx,
  type Db,
} from "@/lib/db";

let db: Db;
beforeEach(() => {
  db = createDatabase(":memory:");
});
afterEach(() => {
  if (db.open) db.close();
});

function addAnomaly(id: number) {
  db.prepare(
    `INSERT OR IGNORE INTO location (id, kind, code, name) VALUES (1, 'campus', 'CAMPUS', 'Campus')`,
  ).run();
  db.prepare(
    `INSERT INTO anomaly (id, type, resource, location_id, start_ts, end_ts, priority, confidence, excess_value, unit, explanation)
     VALUES (?, 'elec_unscheduled_load', 'electricity', 1, '2026-10-05T19:00', '2026-10-05T23:00', 'medium', 'high', 13.4, 'kWh', 'test')`,
  ).run(id);
}

function addTicket(anomalyId: number, status = "open") {
  return db
    .prepare(
      `INSERT INTO ticket (anomaly_id, title, status, priority, team, created_at)
       VALUES (?, 'Test', ?, 'medium', 'electrical', '2026-10-12T00:00')`,
    )
    .run(anomalyId, status);
}

describe("schema", () => {
  it("creates exactly the 13 tables", () => {
    const rows = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
      )
      .all() as { name: string }[];
    expect(rows.map((r) => r.name)).toEqual([...TABLE_NAMES].sort());
    expect(rows).toHaveLength(13);
  });

  it("stamps the schema version and enables foreign keys", () => {
    expect(db.pragma("user_version", { simple: true })).toBe(SCHEMA_VERSION);
    expect(db.pragma("foreign_keys", { simple: true })).toBe(1);
  });

  it("is idempotent and uses WAL on a real file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cp-db-"));
    const file = path.join(dir, "test.db");
    try {
      const first = createDatabase(file);
      expect(first.pragma("journal_mode", { simple: true })).toBe("wal");
      first.prepare(`INSERT INTO setting (key, value) VALUES ('a', '1')`).run();
      first.close();

      const second = createDatabase(file);
      expect(
        second.prepare("SELECT value FROM setting WHERE key = ?").get("a"),
      ).toEqual({ value: "1" });
      second.close();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("constraints", () => {
  it("rejects a duplicate reading for the same meter and hour", () => {
    db.prepare(
      `INSERT INTO location (id, kind, code, name) VALUES (1, 'room', 'A-204', 'Hall A-204')`,
    ).run();
    db.prepare(
      `INSERT INTO meter (id, location_id, resource, unit) VALUES ('E-A-204', 1, 'electricity', 'kW')`,
    ).run();
    const insert = db.prepare(
      `INSERT INTO reading (meter_id, ts, value) VALUES ('E-A-204', '2026-10-05T19:00', 3.41)`,
    );
    insert.run();
    expect(() => insert.run()).toThrow(/UNIQUE/);
  });

  it("allows only one non-closed ticket per anomaly", () => {
    addAnomaly(1);
    addAnomaly(2);
    addTicket(1);
    expect(() => addTicket(1, "in_progress")).toThrow(/UNIQUE/);
    expect(() => addTicket(1, "reopened")).toThrow(/UNIQUE/);
    expect(() => addTicket(2)).not.toThrow(); // different anomaly is fine

    db.prepare(`UPDATE ticket SET status = 'verified' WHERE id = 1`).run();
    expect(() => addTicket(1)).not.toThrow(); // the earlier ticket is closed
  });

  it("rejects an invalid ticket status", () => {
    addAnomaly(1);
    expect(() => addTicket(1, "closed")).toThrow(/CHECK/);
  });

  it("enforces foreign keys", () => {
    expect(() => addTicket(99)).toThrow(/FOREIGN KEY/);
  });

  it("rejects a duplicate ai_cache image hash", () => {
    const insert = db.prepare(
      `INSERT INTO ai_cache (image_hash, result_json, provider, created_at) VALUES ('abc', '{}', 'groq', '2026-10-12T00:00')`,
    );
    insert.run();
    expect(() => insert.run()).toThrow(/UNIQUE/);
  });

  it("rejects an unknown block code in waste_log", () => {
    expect(() =>
      db
        .prepare(
          `INSERT INTO waste_log (ts, block_id, mode, category, item_name, confidence, source, provider)
           VALUES ('2026-10-12T00:00', 'ABA', 'identify', 'plastic', 'bottle', 0.9, 'ai', 'groq')`,
        )
        .run(),
    ).toThrow(/CHECK/);
  });
});

describe("tx", () => {
  it("commits on success and returns the value", () => {
    const result = tx((d) => {
      d.prepare(`INSERT INTO setting (key, value) VALUES ('a', '1')`).run();
      return 42;
    }, db);
    expect(result).toBe(42);
    expect(db.prepare("SELECT COUNT(*) AS n FROM setting").get()).toEqual({
      n: 1,
    });
  });

  it("rolls back when the callback throws", () => {
    expect(() =>
      tx((d) => {
        d.prepare(`INSERT INTO setting (key, value) VALUES ('a', '1')`).run();
        throw new Error("boom");
      }, db),
    ).toThrow("boom");
    expect(db.prepare("SELECT COUNT(*) AS n FROM setting").get()).toEqual({
      n: 0,
    });
  });

  it("rolls back only the inner work of a nested call that throws", () => {
    tx((d) => {
      d.prepare(`INSERT INTO setting (key, value) VALUES ('outer', '1')`).run();
      try {
        tx((inner) => {
          inner
            .prepare(`INSERT INTO setting (key, value) VALUES ('inner', '1')`)
            .run();
          throw new Error("inner failed");
        }, d);
      } catch {
        /* swallowed on purpose */
      }
    }, db);
    const keys = (
      db.prepare("SELECT key FROM setting").all() as { key: string }[]
    ).map((r) => r.key);
    expect(keys).toEqual(["outer"]);
  });
});
