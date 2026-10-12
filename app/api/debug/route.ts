/**
 * TEMPORARY diagnostic route. Place at: app/api/debug/route.ts
 * Visit /api/debug on the deployed site to see why the DB-backed routes fail.
 * DELETE this file once everything works.
 */
import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fileInfo(p: string) {
  try {
    const s = fs.statSync(p);
    return { exists: true, bytes: s.size };
  } catch {
    return { exists: false };
  }
}

function listDir(p: string) {
  try {
    return fs.readdirSync(p).slice(0, 30);
  } catch (e) {
    return `ERR: ${(e as Error).message}`;
  }
}

function errText(e: unknown) {
  const err = e as Error;
  return `${err?.name}: ${err?.message}\n${(err?.stack ?? "").split("\n").slice(0, 8).join("\n")}`;
}

export async function GET() {
  const cwd = process.cwd();
  const out: Record<string, unknown> = {
    vercel: process.env.VERCEL ?? null,
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cwd,
    seedDb: fileInfo(path.join(cwd, "data", "campuspulse.db")),
    tmpDb: fileInfo("/tmp/campuspulse.db"),
    dataDir: listDir(path.join(cwd, "data")),
    configDir: listDir(path.join(cwd, "config")),
    sqliteBinding: fileInfo(
      path.join(
        cwd,
        "node_modules",
        "better-sqlite3",
        "build",
        "Release",
        "better_sqlite3.node",
      ),
    ),
  };

  try {
    fs.writeFileSync("/tmp/_probe.txt", "ok");
    out.tmpWritable = true;
  } catch (e) {
    out.tmpWritable = errText(e);
  }

  // Step 1: can the native module load at all?
  try {
    const Database = (await import("better-sqlite3")).default;
    const mem = new Database(":memory:");
    out.sqliteInMemory = mem.prepare("select sqlite_version() as v").get();
    mem.close();
  } catch (e) {
    out.sqliteLoadError = errText(e);
  }

  // Step 2: can the app's own DB layer open and query the database?
  try {
    const { getDb } = await import("@/lib/db");
    const db = getDb();
    out.rowCounts = {
      meter: (db.prepare("select count(*) c from meter").get() as { c: number }).c,
      reading: (db.prepare("select count(*) c from reading").get() as { c: number }).c,
    };
  } catch (e) {
    out.appDbError = errText(e);
  }

  // Step 3: can the config JSON be read?
  try {
    const { loadCampusConfig } = await import("@/lib/config");
    out.configOk = loadCampusConfig().campus.name;
  } catch (e) {
    out.configError = errText(e);
  }

  return NextResponse.json(out, { status: 200 });
}
