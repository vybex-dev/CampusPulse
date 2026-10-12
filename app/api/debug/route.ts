/**
 * TEMPORARY diagnostic route. Place at: app/api/debug/route.ts
 *
 *   /api/debug?step=basic|sqlite|db|config           environment checks
 *   /api/debug?step=route&name=summary               calls the real handler and reports
 *   names: summary | anomalies | whatif | report | percapita
 *
 * DELETE this file once everything works.
 */
import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Handler = (req: Request) => Promise<Response>;

function fileInfo(p: string) {
  try {
    const s = fs.statSync(p);
    return { exists: true, bytes: s.size };
  } catch {
    return { exists: false };
  }
}

function errText(e: unknown) {
  const err = e as Error;
  return `${err?.name}: ${err?.message}\n${(err?.stack ?? "").split("\n").slice(0, 12).join("\n")}`;
}

async function loadHandler(name: string): Promise<{ handler: Handler; url: string }> {
  switch (name) {
    case "summary": {
      const m = (await import("@/app/api/summary/route")) as unknown as { GET: Handler };
      return { handler: m.GET, url: "/api/summary?range=7&resource=all" };
    }
    case "anomalies": {
      const m = (await import("@/app/api/anomalies/route")) as unknown as { GET: Handler };
      return { handler: m.GET, url: "/api/anomalies" };
    }
    case "whatif": {
      const m = (await import("@/app/api/whatif/snapshot/route")) as unknown as { GET: Handler };
      return { handler: m.GET, url: "/api/whatif/snapshot" };
    }
    case "report": {
      const m = (await import("@/app/api/report/route")) as unknown as { GET: Handler };
      return { handler: m.GET, url: "/api/report?period=7" };
    }
    case "percapita": {
      const m = (await import("@/app/api/water/percapita/route")) as unknown as { GET: Handler };
      return { handler: m.GET, url: "/api/water/percapita" };
    }
    default:
      throw new Error(`unknown route name "${name}"`);
  }
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const step = params.get("step") ?? "basic";
  const cwd = process.cwd();
  const out: Record<string, unknown> = { step };

  if (step === "basic") {
    Object.assign(out, {
      vercel: process.env.VERCEL ?? null,
      node: process.version,
      cwd,
      seedDb: fileInfo(path.join(cwd, "data", "campuspulse.db")),
      tmpDb: fileInfo("/tmp/campuspulse.db"),
      memoryMB: Math.round(process.memoryUsage().rss / 1048576),
    });
  }

  if (step === "sqlite") {
    try {
      const Database = (await import("better-sqlite3")).default;
      const mem = new Database(":memory:");
      out.sqliteInMemory = mem.prepare("select sqlite_version() as v").get();
      mem.close();
    } catch (e) {
      out.sqliteLoadError = errText(e);
    }
  }

  if (step === "db") {
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
  }

  if (step === "config") {
    try {
      const { loadCampusConfig } = await import("@/lib/config");
      out.configOk = loadCampusConfig().campus.name;
    } catch (e) {
      out.configError = errText(e);
    }
  }

  if (step === "route") {
    const name = params.get("name") ?? "";
    const started = Date.now();
    // Handlers swallow errors and return a generic message; capture what they log.
    const logs: string[] = [];
    const origError = console.error;
    const origWarn = console.warn;
    const capture =
      (orig: typeof console.error) =>
      (...args: unknown[]) => {
        logs.push(
          args
            .map((a) => (a instanceof Error ? errText(a) : String(a)))
            .join(" ")
            .slice(0, 2500),
        );
        orig(...args);
      };
    console.error = capture(origError);
    console.warn = capture(origWarn);
    try {
      const { handler, url } = await loadHandler(name);
      out.loadedMs = Date.now() - started;
      const origin = new URL(req.url).origin;
      const res = await handler(
        new Request(origin + url, { headers: { "X-Role": "admin" } }),
      );
      out.status = res.status;
      out.body = (await res.text()).slice(0, 1500);
    } catch (e) {
      out.thrown = errText(e);
    } finally {
      console.error = origError;
      console.warn = origWarn;
    }
    out.consoleLogs = logs.slice(0, 10);
    out.totalMs = Date.now() - started;
    out.memoryMB = Math.round(process.memoryUsage().rss / 1048576);
  }

  return NextResponse.json(out, { status: 200 });
}
