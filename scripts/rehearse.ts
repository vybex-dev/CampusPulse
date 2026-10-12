/**
 * Demo rehearsal script for CampusPulse (Kaushal 8.0, PS-04 Sustainable Tech).
 * Runs the full 5-minute competition demo loop through the API:
 * 1. Reset campus (must be < 5 s)
 * 2. Verify starting score in calibrated range 55-62
 * 3. ST-1 Loop: See (detect A-204) -> Understand -> Act (create, in_progress, resolve)
 * 4. Fast-forward 7 days (must be < 3 s)
 * 5. Prove: ST-1 ticket automatically verified (~Rs 535 savings proven)
 * 6. Water Leak (ST-3): detect Boys Hostel 1 leak and per-capita target exceedance
 * 7. Waste Lab: test classification, log bin check, detect Mess segregation failure
 * 8. What-If Simulator: load snapshot for interactive policy projections
 * 9. Impact Report: generate board-ready report (must be < 3 s) with tagged figures
 */
import { NextRequest } from "next/server";

// Direct route handlers for zero-dependency / standalone execution
import { POST as postDemoReset } from "../app/api/demo/reset/route";
import { POST as postFastForward } from "../app/api/demo/fastforward/route";
import { GET as getCampusRoute } from "../app/api/campus/route";
import { GET as getSummaryRoute } from "../app/api/summary/route";
import { GET as getAnomaliesRoute } from "../app/api/anomalies/route";
import { GET as getTicketsRoute, POST as postTicketsRoute } from "../app/api/tickets/route";
import { GET as getTicketByIdRoute, PATCH as patchTicketByIdRoute } from "../app/api/tickets/[id]/route";
import { GET as getWaterPercapitaRoute } from "../app/api/water/percapita/route";
import { GET as getWaterSeriesRoute } from "../app/api/water/series/route";
import { GET as getWasteSamplesRoute } from "../app/api/waste/samples/route";
import { POST as postClassifySampleRoute } from "../app/api/waste/classifysample/route";
import { POST as postWasteLogRoute } from "../app/api/waste/log/route";
import { GET as getWasteSummaryRoute } from "../app/api/waste/summary/route";
import { GET as getWhatIfSnapshotRoute } from "../app/api/whatif/snapshot/route";
import { GET as getReportRoute } from "../app/api/report/route";

interface RehearsalResult {
  step: string;
  name: string;
  durationMs: number;
  threshold?: string;
  details: string;
  passed: boolean;
}

const results: RehearsalResult[] = [];

function makeReq(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), init as any);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

async function runStep(
  step: string,
  name: string,
  thresholdStr: string,
  fn: () => Promise<{ passed: boolean; details: string; customDurationMs?: number }>,
) {
  const t0 = Date.now();
  try {
    const outcome = await fn();
    const durationMs = outcome.customDurationMs ?? (Date.now() - t0);
    results.push({
      step,
      name,
      durationMs,
      threshold: thresholdStr,
      details: outcome.details,
      passed: outcome.passed,
    });
  } catch (err) {
    const durationMs = Date.now() - t0;
    results.push({
      step,
      name,
      durationMs,
      threshold: thresholdStr,
      details: `ERROR: ${err instanceof Error ? err.message : String(err)}`,
      passed: false,
    });
  }
}

async function main() {
  console.log("\n===============================================================================");
  console.log("       CAMPUSPULSE DEMO REHEARSAL SUITE (Kaushal 8.0, PS-04)                   ");
  console.log("===============================================================================\n");

  let createdTicketId: number | null = null;
  let st1AnomalyId: number | null = null;

  // ── Step 1: Database Reset ────────────────────────────────────────────────
  await runStep("1.0", "Reset Campus Database", "< 5,000 ms", async () => {
    const t0 = Date.now();
    const res = await postDemoReset();
    const duration = Date.now() - t0;
    const body = await res.json();

    const ok = res.status === 200 && duration < 5000 && body.clock === "2026-10-12T00:00";
    return {
      passed: ok,
      customDurationMs: duration,
      details: `Clock: ${body.clock}, Seed: ${body.seed}, Time: ${duration}ms`,
    };
  });

  // ── Step 2: Baseline Campus Score Check ────────────────────────────────────
  await runStep("2.0", "Check Starting Campus Score", "55.0 to 62.0", async () => {
    const res = await getCampusRoute();
    const body = await res.json();
    const score = body.score?.total ?? 0;
    const ok = res.status === 200 && score >= 55.0 && score <= 62.0;

    return {
      passed: ok,
      details: `Total: ${score.toFixed(1)}/100 (Elec: ${body.score?.electricity?.toFixed(1)}, Water: ${body.score?.water?.toFixed(1)}, Waste: ${body.score?.waste?.toFixed(1)})`,
    };
  });

  // ── Step 3: ST-1 Loop (See, Understand, Act) ──────────────────────────────
  await runStep("3.1", "See: Detect Hall A-204 Spike", "E-A-204 detected", async () => {
    const res = await getAnomaliesRoute();
    const anomalies = await res.json();
    const st1 = anomalies.find((a: any) => a.meter_id === "E-A-204");

    if (!st1) return { passed: false, details: "Anomaly for meter E-A-204 not found" };
    st1AnomalyId = st1.id;

    const ok =
      st1.type === "elec_unscheduled_load" &&
      st1.priority === "medium" &&
      st1.excess.value >= 65 &&
      st1.cost_inr >= 500;

    return {
      passed: ok,
      details: `${st1.explanation.slice(0, 48)}... [Excess: ${st1.excess.value} kWh, Cost: Rs ${st1.cost_inr}]`,
    };
  });

  await runStep("3.2", "Act: Create Ticket for A-204", "status = open", async () => {
    if (!st1AnomalyId) return { passed: false, details: "No anomaly ID" };

    const req = makeReq("/api/tickets", {
      method: "POST",
      body: JSON.stringify({ anomaly_id: st1AnomalyId }),
      headers: { "content-type": "application/json", "x-role": "staff" },
    });
    const res = await postTicketsRoute(req);
    const ticket = await res.json();
    createdTicketId = ticket.id;

    const ok = [200, 201].includes(res.status) && ticket.status === "open";
    return {
      passed: ok,
      details: `Created Ticket #${ticket.id}: "${ticket.title}" (${ticket.team})`,
    };
  });

  await runStep("3.3", "Act: Dispatch & Resolve Ticket", "status = resolved", async () => {
    if (!createdTicketId) return { passed: false, details: "No ticket ID" };

    // Move to in_progress
    const inProgReq = makeReq(`/api/tickets/${createdTicketId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "in_progress", note: "HVAC team assigned" }),
      headers: { "content-type": "application/json", "x-role": "staff" },
    });
    await patchTicketByIdRoute(inProgReq, {
      params: Promise.resolve({ id: String(createdTicketId) }),
    });

    // Resolve with mandatory note
    const resolveReq = makeReq(`/api/tickets/${createdTicketId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "resolved",
        note: "Restored automated classroom occupancy schedule",
      }),
      headers: { "content-type": "application/json", "x-role": "staff" },
    });
    const res = await patchTicketByIdRoute(resolveReq, {
      params: Promise.resolve({ id: String(createdTicketId) }),
    });
    const ticket = await res.json();

    const ok = res.status === 200 && ticket.status === "resolved";
    return {
      passed: ok,
      details: `Ticket #${ticket.id} marked resolved. Note: "${ticket.resolve_note}"`,
    };
  });

  // ── Step 4: 7-Day Fast-Forward ────────────────────────────────────────────
  await runStep("4.0", "Fast-Forward Clock 7 Days", "< 3,000 ms", async () => {
    const t0 = Date.now();
    const req = makeReq("/api/demo/fastforward", {
      method: "POST",
      body: JSON.stringify({ days: 7 }),
      headers: { "content-type": "application/json" },
    });
    const res = await postFastForward(req);
    const duration = Date.now() - t0;
    const body = await res.json();

    const ok = res.status === 200 && duration < 3000 && body.clock === "2026-10-19T00:00";
    return {
      passed: ok,
      customDurationMs: duration,
      details: `Clock advanced to: ${body.clock} in ${duration}ms`,
    };
  });

  // ── Step 5: Prove Counterfactual Savings ──────────────────────────────────
  await runStep("5.0", "Prove: Verify ST-1 Savings", "~Rs 535 Verified", async () => {
    if (!createdTicketId) return { passed: false, details: "No ticket ID" };

    const res = await getTicketByIdRoute(makeReq(`/api/tickets/${createdTicketId}`), {
      params: Promise.resolve({ id: String(createdTicketId) }),
    });
    const detail = await res.json();

    const ok =
      detail.status === "verified" &&
      detail.savings &&
      detail.savings.saved_inr === 535 &&
      detail.savings.saved_units === 67.0;

    return {
      passed: ok,
      details: `Status: ${detail.status}, Saved: Rs ${detail.savings?.saved_inr} (Tag: Verified, ${detail.savings?.saved_units} kWh, ${detail.savings?.saved_co2e_kg} kg CO2e)`,
    };
  });

  // ── Step 6: Water Leak Detection (ST-3) ───────────────────────────────────
  await runStep("6.0", "Water Leak: Detect ST-3 (HST-1)", "Night leak flagged", async () => {
    const resPercapita = await getWaterPercapitaRoute();
    const percapita = await resPercapita.json();
    const hst1 = percapita.find((b: any) => b.block_code === "HST-1");

    const resSeries = await getWaterSeriesRoute(
      makeReq("/api/water/series?meter_id=W-HST-1&range=7"),
    );
    const series = await resSeries.json();

    const ok =
      hst1 &&
      hst1.is_flagged === true &&
      hst1.actual_l >= 140 &&
      series.series &&
      series.series.length > 0;

    return {
      passed: ok,
      details: `Boys Hostel 1: ${hst1?.actual_l} L/resident (Target: ${hst1?.target_l} L, Ratio: ${hst1?.ratio_pct}%, Flagged: ${hst1?.is_flagged})`,
    };
  });

  // ── Step 7: Waste Lab Classification & Logging ────────────────────────────
  await runStep("7.0", "Waste Lab: Classify & Log Sample", "sample classified", async () => {
    const resSample = await postClassifySampleRoute(
      makeReq("/api/waste/classifysample", {
        method: "POST",
        body: JSON.stringify({ sample_id: "sample-apple-core" }),
        headers: { "content-type": "application/json" },
      }),
    );
    const sampleClass = await resSample.json();

    const resLog = await postWasteLogRoute(
      makeReq("/api/waste/log", {
        method: "POST",
        body: JSON.stringify({
          block_id: "MESS",
          mode: "bin_check",
          category: sampleClass.classification.category,
          item_name: sampleClass.classification.item_name,
          chosen_bin: "green",
        }),
        headers: { "content-type": "application/json" },
      }),
    );
    const log = await resLog.json();

    const resWasteSummary = await getWasteSummaryRoute();
    const wasteSummary = await resWasteSummary.json();

    const ok =
      sampleClass.classification.category === "wet_biodegradable" &&
      log.is_correct === true &&
      wasteSummary.campus_accuracy > 0;

    return {
      passed: ok,
      details: `Classified: "${sampleClass.classification.item_name}" -> ${sampleClass.classification.category} [Campus Acc: ${wasteSummary.campus_accuracy_pct}%]`,
    };
  });

  // ── Step 8: What-If Policy Snapshot ───────────────────────────────────────
  await runStep("8.0", "What-If Simulator Snapshot", "math snapshot valid", async () => {
    const res = await getWhatIfSnapshotRoute();
    const snap = await res.json();

    const ok =
      snap.U_E > 0 &&
      snap.U_W > 0 &&
      snap.tariff_inr_per_kwh === 8 &&
      snap.water_inr_per_kl === 20;

    return {
      passed: ok,
      details: `Baseline Monthly: ${Math.round(snap.U_E)} kWh, ${Math.round(snap.U_W)} kL, Avoidable Elec: ${(snap.a_E * 100).toFixed(1)}%, Water: ${(snap.a_W * 100).toFixed(1)}%`,
    };
  });

  // ── Step 9: Impact Report Generation ──────────────────────────────────────
  await runStep("9.0", "Generate 7-Day Impact Report", "< 3,000 ms", async () => {
    const t0 = Date.now();
    const res = await getReportRoute(makeReq("/api/report?period=7"));
    const duration = Date.now() - t0;
    const report = await res.json();

    const ok =
      res.status === 200 &&
      duration < 3000 &&
      report.verified_savings_inr.tag === "verified" &&
      report.method.disclosures.length > 0;

    return {
      passed: ok,
      customDurationMs: duration,
      details: `Verified Savings: Rs ${report.verified_savings_inr.value} (Tag: ${report.verified_savings_inr.tag}), Avoided Carbon: ${report.carbon.avoided.value} kg, Time: ${duration}ms`,
    };
  });

  // ── Output Summary Table ──────────────────────────────────────────────────
  console.log("+------+-------------------------------------+------------+-----------+--------+-------------------------------------------------------+");
  console.log("| Step | Scenario / Endpoint Action          | Target     | Timing    | Result | Details                                               |");
  console.log("+------+-------------------------------------+------------+-----------+--------+-------------------------------------------------------+");

  let allPassed = true;
  for (const r of results) {
    if (!r.passed) allPassed = false;
    const statusText = r.passed ? " PASS " : " FAIL ";
    const timingText = formatDuration(r.durationMs).padEnd(9);
    const targetText = (r.threshold ?? "-").padEnd(10);
    const nameText = r.name.padEnd(35);
    const stepText = r.step.padEnd(4);
    const detailsText = r.details.slice(0, 53).padEnd(53);

    console.log(`| ${stepText} | ${nameText} | ${targetText} | ${timingText} | ${statusText} | ${detailsText} |`);
  }
  console.log("+------+-------------------------------------+------------+-----------+--------+-------------------------------------------------------+");

  if (allPassed) {
    console.log("\n🎉 ALL REHEARSAL CHECKS PASSED: Full demo loop is verified, deterministic, and fast!\n");
    process.exit(0);
  } else {
    console.error("\n❌ SOME REHEARSAL CHECKS FAILED. See table above.\n");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Rehearsal fatal crash:", err);
  process.exit(1);
});
