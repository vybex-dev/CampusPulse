import { describe, expect, it, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { resetCampus } from "@/lib/sim/reset";
import {
  DemoStateSchema,
  SettingsSchema,
  HealthSchema,
  AnomalySchema,
  TicketSchema,
  TicketDetailSchema,
  SummarySchema,
  WhatIfSnapshotSchema,
  ReportSchema,
  WasteLogSchema,
  ScoreSchema,
  SeveritySchema,
  TopWasterSchema,
  TsSchema,
  BlockCodeSchema,
  WasteCategorySchema,
  ClassificationSchema,
  blockRecord,
} from "@/lib/contract";
import { z } from "zod";

// Import Route Handlers
import { GET as getDemoState } from "@/app/api/demo/state/route";
import { POST as postDemoReset } from "@/app/api/demo/reset/route";
import { POST as postFastForward } from "@/app/api/demo/fastforward/route";
import { GET as getSettingsRoute, PUT as putSettingsRoute } from "@/app/api/settings/route";
import { GET as getHealthRoute } from "@/app/api/health/route";
import { GET as getCampusRoute } from "@/app/api/campus/route";
import { GET as getAnomaliesRoute } from "@/app/api/anomalies/route";
import { GET as getAnomalyByIdRoute } from "@/app/api/anomalies/[id]/route";
import { GET as getTicketsRoute, POST as postTicketsRoute } from "@/app/api/tickets/route";
import { GET as getTicketByIdRoute, PATCH as patchTicketByIdRoute } from "@/app/api/tickets/[id]/route";
import { GET as getSummaryRoute } from "@/app/api/summary/route";
import { GET as getElecBlocksRoute } from "@/app/api/electricity/blocks/route";
import { GET as getElecSeriesRoute } from "@/app/api/electricity/series/route";
import { POST as postElecImportRoute } from "@/app/api/electricity/import/route";
import { GET as getWaterSeriesRoute } from "@/app/api/water/series/route";
import { GET as getWaterPercapitaRoute } from "@/app/api/water/percapita/route";
import { GET as getWasteSummaryRoute } from "@/app/api/waste/summary/route";
import { GET as getWasteHistoryRoute } from "@/app/api/waste/history/route";
import { GET as getWasteSamplesRoute } from "@/app/api/waste/samples/route";
import { POST as postClassifySampleRoute } from "@/app/api/waste/classifysample/route";
import { POST as postWasteLogRoute } from "@/app/api/waste/log/route";
import { GET as getWhatIfSnapshotRoute } from "@/app/api/whatif/snapshot/route";
import { GET as getReportRoute } from "@/app/api/report/route";

function makeReq(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

describe("API Endpoint Zod Contract Suite", () => {
  beforeEach(() => {
    resetCampus();
  });

  // 1. /api/demo/state
  it("GET /api/demo/state satisfies DemoStateSchema", async () => {
    const res = await getDemoState();
    expect(res.status).toBe(200);
    const body = await res.json();
    const parsed = DemoStateSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  // 2. /api/demo/reset
  it("POST /api/demo/reset satisfies DemoStateSchema", async () => {
    const res = await postDemoReset();
    expect(res.status).toBe(200);
    const body = await res.json();
    const parsed = DemoStateSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  // 3. /api/demo/fastforward
  it("POST /api/demo/fastforward satisfies DemoStateSchema", async () => {
    const req = makeReq("/api/demo/fastforward", {
      method: "POST",
      body: JSON.stringify({ days: 1 }),
      headers: { "content-type": "application/json" },
    });
    const res = await postFastForward(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    const parsed = DemoStateSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  // 4. /api/settings
  it("GET /api/settings satisfies SettingsSchema", async () => {
    const res = await getSettingsRoute();
    expect(res.status).toBe(200);
    const body = await res.json();
    const parsed = SettingsSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  it("PUT /api/settings satisfies SettingsSchema", async () => {
    const req = makeReq("/api/settings", {
      method: "PUT",
      body: JSON.stringify({ tariff_inr_per_kwh: 9.0 }),
      headers: { "content-type": "application/json" },
    });
    const res = await putSettingsRoute(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    const parsed = SettingsSchema.safeParse(body);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.tariff_inr_per_kwh).toBe(9.0);
  });

  // 5. /api/health
  it("GET /api/health satisfies HealthSchema", async () => {
    const res = await getHealthRoute();
    expect(res.status).toBe(200);
    const body = await res.json();
    const parsed = HealthSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  // 6. /api/campus
  it("GET /api/campus satisfies campus contract", async () => {
    const res = await getCampusRoute();
    expect(res.status).toBe(200);
    const body = await res.json();

    const CampusContractSchema = z.object({
      clock: TsSchema,
      score: ScoreSchema,
      block_severity: blockRecord(SeveritySchema),
      top_wasters: z.array(TopWasterSchema),
      active_anomaly_count: z.number().int().nonnegative(),
      simulated: z.literal(true),
    });

    const parsed = CampusContractSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  // 7. /api/anomalies
  it("GET /api/anomalies satisfies z.array(AnomalySchema)", async () => {
    const res = await getAnomaliesRoute();
    expect(res.status).toBe(200);
    const body = await res.json();
    const parsed = z.array(AnomalySchema).safeParse(body);
    expect(parsed.success).toBe(true);
    expect(parsed.data!.length).toBeGreaterThan(0);
  });

  it("GET /api/anomalies/[id] satisfies AnomalySchema", async () => {
    const allRes = await getAnomaliesRoute();
    const allAnomalies = await allRes.json();
    const firstId = allAnomalies[0].id;

    const res = await getAnomalyByIdRoute(makeReq(`/api/anomalies/${firstId}`), {
      params: Promise.resolve({ id: String(firstId) }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    const parsed = AnomalySchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  // 8. /api/tickets
  it("GET /api/tickets satisfies z.array(TicketSchema)", async () => {
    const req = makeReq("/api/tickets");
    const res = await getTicketsRoute(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    const parsed = z.array(TicketSchema).safeParse(body);
    expect(parsed.success).toBe(true);
  });

  it("POST /api/tickets satisfies TicketSchema", async () => {
    const allRes = await getAnomaliesRoute();
    const allAnomalies = await allRes.json();
    const anomalyId = allAnomalies[0].id;

    const req = makeReq("/api/tickets", {
      method: "POST",
      body: JSON.stringify({ anomaly_id: anomalyId }),
      headers: { "content-type": "application/json", "x-role": "staff" },
    });
    const res = await postTicketsRoute(req);
    expect([200, 201]).toContain(res.status);
    const body = await res.json();
    const parsed = TicketSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  it("GET and PATCH /api/tickets/[id] satisfy TicketDetailSchema", async () => {
    // Seeded ticket #1 is pre-seeded
    const getRes = await getTicketByIdRoute(makeReq("/api/tickets/1"), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    const parsedDetail = TicketDetailSchema.safeParse(getBody);
    expect(parsedDetail.success).toBe(true);

    // Create a new ticket to test PATCH
    const allRes = await getAnomaliesRoute();
    const allAnomalies = await allRes.json();
    const unlinked = allAnomalies.find((a: any) => a.ticket_id === null) ?? allAnomalies[0];

    const createReq = makeReq("/api/tickets", {
      method: "POST",
      body: JSON.stringify({ anomaly_id: unlinked.id }),
      headers: { "content-type": "application/json", "x-role": "staff" },
    });
    const createRes = await postTicketsRoute(createReq);
    const newTicket = await createRes.json();

    const patchReq = makeReq(`/api/tickets/${newTicket.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "in_progress", note: "Assigning field engineer" }),
      headers: { "content-type": "application/json", "x-role": "staff" },
    });
    const patchRes = await patchTicketByIdRoute(patchReq, {
      params: Promise.resolve({ id: String(newTicket.id) }),
    });
    expect(patchRes.status).toBe(200);
    const patchBody = await patchRes.json();
    const parsedPatch = TicketDetailSchema.safeParse(patchBody);
    expect(parsedPatch.success).toBe(true);
  });

  // 9. /api/summary
  it("GET /api/summary satisfies SummarySchema", async () => {
    const req = makeReq("/api/summary?range=7&resource=all");
    const res = await getSummaryRoute(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    const parsed = SummarySchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  // 10. /api/electricity/blocks
  it("GET /api/electricity/blocks satisfies block after-hours breakdown", async () => {
    const res = await getElecBlocksRoute();
    expect(res.status).toBe(200);
    const body = await res.json();

    const ElecBlocksSchema = blockRecord(
      z.object({
        totalKwh: z.number().nonnegative(),
        afterHoursKwh: z.number().nonnegative(),
        afterHoursPct: z.number().min(0).max(100),
      }),
    );
    const parsed = ElecBlocksSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  // 11. /api/electricity/series
  it("GET /api/electricity/series satisfies series schema", async () => {
    const req = makeReq("/api/electricity/series?meter_id=E-A-204&range=7");
    const res = await getElecSeriesRoute(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    const SeriesSchema = z.object({
      meter_id: z.string(),
      unit: z.literal("kW"),
      from: TsSchema,
      to: TsSchema,
      series: z.array(z.object({ ts: TsSchema, value: z.number() })),
    });
    const parsed = SeriesSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  // 12. /api/electricity/import
  it("POST /api/electricity/import satisfies import response contract", async () => {
    const csvContent = "meter_id,ts,value\nE-A-204,2026-10-12T10:00,2.5\nE-A-204,2026-10-12T11:00,2.7";
    const req = makeReq("/api/electricity/import", {
      method: "POST",
      body: JSON.stringify({ csv: csvContent }),
      headers: { "content-type": "application/json" },
    });
    const res = await postElecImportRoute(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    const ImportResponseSchema = z.object({
      success: z.literal(true),
      imported_rows: z.number().int().positive(),
      meters: z.array(z.string()),
      min_ts: TsSchema,
      max_ts: TsSchema,
      message: z.string(),
    });
    const parsed = ImportResponseSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  // 13. /api/water/series
  it("GET /api/water/series satisfies water series contract", async () => {
    const req = makeReq("/api/water/series?meter_id=W-HST-1&range=7");
    const res = await getWaterSeriesRoute(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    const WaterSeriesSchema = z.object({
      meter_id: z.string(),
      resource: z.string(),
      unit: z.string(),
      from: TsSchema,
      to: TsSchema,
      series: z.array(z.object({ ts: TsSchema, value: z.number() })),
    });
    const parsed = WaterSeriesSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  // 14. /api/water/percapita
  it("GET /api/water/percapita satisfies per-capita array schema", async () => {
    const res = await getWaterPercapitaRoute();
    expect(res.status).toBe(200);
    const body = await res.json();

    const PerCapitaSchema = z.array(
      z.object({
        block_code: z.string(),
        population: z.number().int().positive(),
        target_l: z.number().positive(),
        actual_l: z.number().nonnegative(),
        ratio_pct: z.number().nonnegative(),
        is_flagged: z.boolean(),
      }),
    );
    const parsed = PerCapitaSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  // 15. /api/waste/summary
  it("GET /api/waste/summary satisfies waste summary contract", async () => {
    const res = await getWasteSummaryRoute();
    expect(res.status).toBe(200);
    const body = await res.json();

    const WasteSummarySchema = z.object({
      clock: TsSchema,
      data_period: z.object({ from: TsSchema, to: TsSchema }),
      campus_accuracy: z.number().min(0).max(1),
      campus_accuracy_pct: z.number().min(0).max(100),
      total_scans: z.number().int().nonnegative(),
      bin_checks: z.number().int().nonnegative(),
      identify_scans: z.number().int().nonnegative(),
      blocks: z.record(z.string(), z.unknown()),
      leaderboard: z.array(z.unknown()),
    });
    const parsed = WasteSummarySchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  // 16. /api/waste/history
  it("GET /api/waste/history satisfies waste history schema", async () => {
    const req = makeReq("/api/waste/history?limit=10");
    const res = await getWasteHistoryRoute(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    const WasteHistorySchema = z.object({
      logs: z.array(WasteLogSchema),
      total: z.number().int().nonnegative(),
      limit: z.number().int().positive(),
      offset: z.number().int().nonnegative(),
    });
    const parsed = WasteHistorySchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  // 17. /api/waste/samples
  it("GET /api/waste/samples satisfies samples array contract", async () => {
    const res = await getWasteSamplesRoute();
    expect(res.status).toBe(200);
    const body = await res.json();

    const SamplesSchema = z.object({
      samples: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          category: WasteCategorySchema,
          bin: z.string(),
          bin_name: z.string(),
          thumb: z.string(),
          classification: ClassificationSchema,
        }),
      ),
    });
    const parsed = SamplesSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  // 18. /api/waste/classifysample
  it("POST /api/waste/classifysample satisfies classification response contract", async () => {
    const req = makeReq("/api/waste/classifysample", {
      method: "POST",
      body: JSON.stringify({ sample_id: "sample-apple-core" }),
      headers: { "content-type": "application/json" },
    });
    const res = await postClassifySampleRoute(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    const ClassifySampleResponseSchema = z.object({
      classification: ClassificationSchema,
      provider: z.literal("sample"),
      cached: z.boolean(),
      thumb: z.string(),
      sample_id: z.string(),
    });
    const parsed = ClassifySampleResponseSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  // 19. /api/waste/log
  it("POST /api/waste/log satisfies WasteLogSchema", async () => {
    const req = makeReq("/api/waste/log", {
      method: "POST",
      body: JSON.stringify({
        block_id: "AB-A",
        mode: "bin_check",
        category: "plastic",
        item_name: "Plastic bottle",
        chosen_bin: "blue",
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await postWasteLogRoute(req);
    expect([200, 201]).toContain(res.status);
    const body = await res.json();
    const parsed = WasteLogSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  // 20. /api/whatif/snapshot
  it("GET /api/whatif/snapshot satisfies WhatIfSnapshotSchema", async () => {
    const res = await getWhatIfSnapshotRoute();
    expect(res.status).toBe(200);
    const body = await res.json();
    const parsed = WhatIfSnapshotSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  // 21. /api/report
  it("GET /api/report satisfies ReportSchema", async () => {
    const req = makeReq("/api/report?period=7");
    const res = await getReportRoute(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    const parsed = ReportSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });
});
