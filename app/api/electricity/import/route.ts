import { NextRequest, NextResponse } from "next/server";
import { getDb, tx } from "@/lib/db";
import { invalidateCache } from "@/lib/cache";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ParsedReading {
  meter_id: string;
  ts: string;
  value: number;
}

export async function POST(req: NextRequest) {
  try {
    let csvText = "";
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return jsonError(400, "BAD_REQUEST", "No file uploaded in form data field 'file'");
      }
      csvText = await file.text();
    } else if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => null);
      if (!body || typeof body.csv !== "string") {
        return jsonError(400, "BAD_REQUEST", "JSON body must include a 'csv' string property");
      }
      csvText = body.csv;
    } else {
      csvText = await req.text();
    }

    if (!csvText || !csvText.trim()) {
      return jsonError(400, "EMPTY_FILE", "CSV file is empty");
    }

    // Split rows handling \r\n and \n
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      return jsonError(
        400,
        "INVALID_CSV",
        "CSV must contain a header line and at least one data row",
      );
    }

    // Parse header
    const headerLine = lines[0];
    const headerCols = headerLine.split(",").map((c) => c.trim().toLowerCase().replace(/^["']|["']$/g, ""));

    const meterIdx = headerCols.indexOf("meter_id");
    const tsIdx = headerCols.indexOf("ts");
    const valIdx = headerCols.indexOf("value");

    const missingCols: string[] = [];
    if (meterIdx === -1) missingCols.push("meter_id");
    if (tsIdx === -1) missingCols.push("ts");
    if (valIdx === -1) missingCols.push("value");

    if (missingCols.length > 0) {
      return jsonError(
        400,
        "MISSING_COLUMNS",
        `Missing required column(s): ${missingCols.join(", ")}. Header must include: meter_id, ts, value`,
      );
    }

    const db = getDb();
    const validMetersRows = db
      .prepare("SELECT id FROM meter WHERE resource = 'electricity'")
      .all() as { id: string }[];
    const validMeters = new Set(validMetersRows.map((m) => m.id));

    const records: ParsedReading[] = [];
    const isoRegex = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?/;

    for (let i = 1; i < lines.length; i++) {
      const lineNum = i + 1; // 1-indexed for human readability
      const rawCols = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));

      if (rawCols.length <= Math.max(meterIdx, tsIdx, valIdx)) {
        return jsonError(
          400,
          "MALFORMED_ROW",
          `Line ${lineNum} is missing columns. Expected at least 3 columns (meter_id, ts, value).`,
        );
      }

      const meterId = rawCols[meterIdx];
      const rawTs = rawCols[tsIdx];
      const rawVal = rawCols[valIdx];

      // 1. Validate meter_id
      if (!meterId) {
        return jsonError(400, "INVALID_METER", `Line ${lineNum}: meter_id cannot be empty.`);
      }
      if (!validMeters.has(meterId)) {
        const sampleMeters = Array.from(validMeters).slice(0, 3).join(", ");
        return jsonError(
          400,
          "UNKNOWN_METER",
          `Line ${lineNum}: Unknown electricity meter "${meterId}". Valid electricity meters include: ${sampleMeters}...`,
        );
      }

      // 2. Validate timestamp
      if (!rawTs || !isoRegex.test(rawTs) || isNaN(new Date(rawTs.replace(" ", "T")).getTime())) {
        return jsonError(
          400,
          "INVALID_TIMESTAMP",
          `Line ${lineNum}: Invalid timestamp "${rawTs}". Expected format: YYYY-MM-DDTHH:MM (e.g., 2026-10-12T14:00).`,
        );
      }
      // Normalize space to T in timestamp
      const normTs = rawTs.replace(" ", "T").slice(0, 16);

      // 3. Validate numeric value
      const val = parseFloat(rawVal);
      if (isNaN(val) || !isFinite(val) || val < 0) {
        return jsonError(
          400,
          "INVALID_VALUE",
          `Line ${lineNum}: Invalid reading value "${rawVal}". Value must be a non-negative number in kW.`,
        );
      }

      records.push({
        meter_id: meterId,
        ts: normTs,
        value: Number(val.toFixed(3)),
      });
    }

    if (records.length === 0) {
      return jsonError(400, "NO_DATA", "No valid data rows found in CSV");
    }

    // Insert transactionally
    tx((dbInstance) => {
      const stmt = dbInstance.prepare(`
        INSERT INTO reading (meter_id, ts, value)
        VALUES (?, ?, ?)
        ON CONFLICT(meter_id, ts) DO UPDATE SET value = excluded.value
      `);
      for (const rec of records) {
        stmt.run(rec.meter_id, rec.ts, rec.value);
      }
    }, db);

    // Invalidate analytics caches
    invalidateCache();

    const uniqueMeters = Array.from(new Set(records.map((r) => r.meter_id)));
    const sortedTs = records.map((r) => r.ts).sort();

    return NextResponse.json({
      success: true,
      imported_rows: records.length,
      meters: uniqueMeters,
      min_ts: sortedTs[0],
      max_ts: sortedTs[sortedTs.length - 1],
      message: `Successfully imported ${records.length} readings across ${uniqueMeters.length} electricity meter(s).`,
    });
  } catch (err) {
    console.error("[POST /api/electricity/import]", err);
    return jsonError(500, "INTERNAL_ERROR", "Failed to process CSV file");
  }
}
