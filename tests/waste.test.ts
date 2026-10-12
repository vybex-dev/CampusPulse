import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { getDb, resetDb, closeDb } from "@/lib/db";
import { resetCampus } from "@/lib/sim/reset";
import { getSettings } from "@/lib/settings";
import {
  computeBlockAccuracy,
  computePooledCampusAccuracy,
  computePeerAccuracy,
  findCommonestMistake,
  computeMisroutedMass,
  canVerifyWasteTicket,
  computeScanPoints,
  computeLeaderboard,
  detectWasteAnomalies,
  type WasteCheckRecord,
} from "@/lib/analytics/waste";
import {
  classifyWasteImage,
  CATEGORY_TABLE,
} from "@/lib/ai/classify";
import {
  hashImage,
  getCachedClassification,
  setCachedClassification,
  clearAiCache,
} from "@/lib/ai/cache";
import {
  parkProvider,
  isProviderCoolingDown,
  getProviderCooldownRemaining,
  resetProviderCooldown,
  consumeTokens,
  getAvailableTokens,
  resetTokenBucket,
  checkRouteRateLimit,
  resetRouteRateLimit,
} from "@/lib/ai/limiter";
import { SAMPLE_ITEMS, classifyWithSample } from "@/lib/ai/samples";
import { classifyWithGroq } from "@/lib/ai/groq";
import { classifyWithGemini } from "@/lib/ai/gemini";
import type { DetectorLocation } from "@/lib/analytics/anomalies";

describe("Waste Analytics (lib/analytics/waste.ts)", () => {
  it("computes block accuracy and handles insufficient data (< 10 checks)", () => {
    // 5 checks (< 10) -> insufficient data
    const fewChecks: WasteCheckRecord[] = Array.from({ length: 5 }, (_, i) => ({
      ts: "2026-10-10T10:00",
      block_id: "AB-A",
      mode: "bin_check",
      category: "plastic",
      is_correct: i < 3 ? 1 : 0,
      chosen_bin: "blue",
    }));

    const resFew = computeBlockAccuracy(fewChecks);
    expect(resFew.insufficient_data).toBe(true);
    expect(resFew.accuracy).toBeNull();
    expect(resFew.total).toBe(5);
    expect(resFew.correct).toBe(3);

    // 10 checks -> sufficient data
    const sufficientChecks: WasteCheckRecord[] = Array.from({ length: 10 }, (_, i) => ({
      ts: "2026-10-10T10:00",
      block_id: "AB-A",
      mode: "bin_check",
      category: "plastic",
      is_correct: i < 8 ? 1 : 0,
      chosen_bin: "blue",
    }));

    const resSufficient = computeBlockAccuracy(sufficientChecks);
    expect(resSufficient.insufficient_data).toBe(false);
    expect(resSufficient.accuracy).toBe(0.8);
    expect(resSufficient.total).toBe(10);
    expect(resSufficient.correct).toBe(8);
  });

  it("computes pooled campus accuracy", () => {
    const checks: WasteCheckRecord[] = [
      { ts: "2026-10-10T10:00", block_id: "AB-A", mode: "bin_check", category: "plastic", is_correct: 1, chosen_bin: "blue" },
      { ts: "2026-10-10T10:00", block_id: "AB-B", mode: "bin_check", category: "wet_biodegradable", is_correct: 1, chosen_bin: "green" },
      { ts: "2026-10-10T10:00", block_id: "LIB", mode: "bin_check", category: "paper_cardboard", is_correct: 0, chosen_bin: "red" },
      { ts: "2026-10-10T10:00", block_id: "HST-1", mode: "bin_check", category: "plastic", is_correct: 1, chosen_bin: "blue" },
    ];
    const pooled = computePooledCampusAccuracy(checks);
    expect(pooled.total).toBe(4);
    expect(pooled.correct).toBe(3);
    expect(pooled.accuracy).toBe(0.75);
  });

  it("computes peer accuracy as the median of the other 5 blocks", () => {
    const accuracies: Record<string, number | null> = {
      "AB-A": 0.80,
      "AB-B": 0.76,
      LIB: 0.82,
      "HST-1": 0.74,
      "HST-2": 0.78,
      MESS: 0.46,
    };

    // For MESS, peers are [0.80, 0.76, 0.82, 0.74, 0.78] -> sorted: [0.74, 0.76, 0.78, 0.80, 0.82] -> median 0.78
    const peerMess = computePeerAccuracy("MESS", accuracies);
    expect(peerMess).toBe(0.78);

    // For LIB, peers are [0.80, 0.76, 0.74, 0.78, 0.46] -> sorted: [0.46, 0.74, 0.76, 0.78, 0.80] -> median 0.76
    const peerLib = computePeerAccuracy("LIB", accuracies);
    expect(peerLib).toBe(0.76);
  });

  it("identifies commonest mistake among wrong bin checks", () => {
    const wrongChecks: WasteCheckRecord[] = [
      { ts: "2026-10-10T10:00", block_id: "MESS", mode: "bin_check", category: "wet_biodegradable", is_correct: 0, chosen_bin: "blue" },
      { ts: "2026-10-10T10:00", block_id: "MESS", mode: "bin_check", category: "wet_biodegradable", is_correct: 0, chosen_bin: "blue" },
      { ts: "2026-10-10T10:00", block_id: "MESS", mode: "bin_check", category: "plastic", is_correct: 0, chosen_bin: "green" },
    ];

    const mistake = findCommonestMistake(wrongChecks);
    expect(mistake).toEqual({
      category: "wet_biodegradable",
      chosen_bin: "blue",
      count: 2,
    });
  });

  it("computes misrouted mass as (peer - block accuracy) * weekly bin mass", () => {
    // MESS: peer 78% (0.78), block 46% (0.46), weekly mass 190 kg
    // Delta = 0.32 -> 0.32 * 190 = 60.8 kg (~60 kg)
    const mass = computeMisroutedMass(0.46, 0.78, 190);
    expect(mass).toBeCloseTo(60.8, 1);
  });

  it("verifies ticket only after >= 20 post-fix checks at >= 60% accuracy", () => {
    // 19 checks at 100% -> not verifiable (< 20 checks)
    const checks19: WasteCheckRecord[] = Array.from({ length: 19 }, () => ({
      ts: "2026-10-10T10:00",
      block_id: "MESS",
      mode: "bin_check",
      category: "wet_biodegradable",
      is_correct: 1,
      chosen_bin: "green",
    }));
    expect(canVerifyWasteTicket(checks19)).toBe(false);

    // 20 checks at 55% -> not verifiable (< 60%)
    const checks20Low: WasteCheckRecord[] = Array.from({ length: 20 }, (_, i) => ({
      ts: "2026-10-10T10:00",
      block_id: "MESS",
      mode: "bin_check",
      category: "wet_biodegradable",
      is_correct: i < 11 ? 1 : 0, // 55%
      chosen_bin: "green",
    }));
    expect(canVerifyWasteTicket(checks20Low)).toBe(false);

    // 20 checks at 65% -> verified!
    const checks20Good: WasteCheckRecord[] = Array.from({ length: 20 }, (_, i) => ({
      ts: "2026-10-10T10:00",
      block_id: "MESS",
      mode: "bin_check",
      category: "wet_biodegradable",
      is_correct: i < 13 ? 1 : 0, // 65%
      chosen_bin: "green",
    }));
    expect(canVerifyWasteTicket(checks20Good)).toBe(true);
  });

  it("calculates points: identify scan = 5, correct bin check = category points, wrong = 0", () => {
    // Identify scan
    expect(computeScanPoints("identify", null, "plastic")).toBe(5);
    expect(computeScanPoints("identify", true, "e_waste")).toBe(5);

    // Bin check
    expect(computeScanPoints("bin_check", true, "wet_biodegradable")).toBe(10);
    expect(computeScanPoints("bin_check", true, "plastic")).toBe(10);
    expect(computeScanPoints("bin_check", true, "e_waste")).toBe(20);
    expect(computeScanPoints("bin_check", true, "hazardous")).toBe(20);
    expect(computeScanPoints("bin_check", true, "other_residual")).toBe(5);
    expect(computeScanPoints("bin_check", false, "e_waste")).toBe(0);
  });

  it("builds leaderboard ranked by accuracy descending, then points descending", () => {
    const logs: WasteCheckRecord[] = [
      // Block A: 10 checks, 8 correct (80%), 80 points
      ...Array.from({ length: 10 }, (_, i) => ({
        ts: "2026-10-10T10:00",
        block_id: "AB-A" as const,
        mode: "bin_check" as const,
        category: "plastic" as const,
        is_correct: i < 8 ? 1 : 0,
        chosen_bin: "blue" as const,
        points: i < 8 ? 10 : 0,
      })),
      // Block B: 10 checks, 8 correct (80%), 120 points (tie on accuracy, more points)
      ...Array.from({ length: 10 }, (_, i) => ({
        ts: "2026-10-10T10:00",
        block_id: "AB-B" as const,
        mode: "bin_check" as const,
        category: "e_waste" as const,
        is_correct: i < 8 ? 1 : 0,
        chosen_bin: "red" as const,
        points: i < 8 ? 20 : 0,
      })),
    ];

    const leaderboard = computeLeaderboard(logs);
    // AB-B should be rank 1 (same 80% accuracy, but 160 vs 80 points)
    expect(leaderboard[0].block_code).toBe("AB-B");
    expect(leaderboard[1].block_code).toBe("AB-A");
  });

  it("detects ST-5 MESS anomaly on seeded database", () => {
    resetCampus();
    const db = getDb();
    const settings = getSettings(db);

    const logs = db.prepare(`
      SELECT id, ts, block_id, mode, category, item_name, is_correct, chosen_bin, correct_bin, points
      FROM waste_log
    `).all() as WasteCheckRecord[];

    const locations = db.prepare(`
      SELECT id, parent_id, kind, code, name, room_type, population
      FROM location
    `).all() as DetectorLocation[];

    const drafts = detectWasteAnomalies({
      wasteLogs: logs,
      locations,
      clock: "2026-10-12T00:00",
      settings,
    });

    const messAnomaly = drafts.find((d) => d.type === "waste_bad_segregation");
    expect(messAnomaly).toBeDefined();
    expect(messAnomaly!.priority).toBe("high"); // MESS accuracy ~46% < 50%
    expect(messAnomaly!.unit).toBe("kg");
    expect(messAnomaly!.cost_inr).toBeNull(); // Waste has no direct rupee value
    expect(messAnomaly!.daily_cost_inr).toBeNull();
    // Misrouted mass on seeded PRNG draw (peer ~82%, MESS ~35% -> ~88.8 kg)
    expect(messAnomaly!.excess_value).toBeGreaterThan(50);
    expect(messAnomaly!.excess_value).toBeLessThan(100);

    const evidence = JSON.parse(messAnomaly!.evidence_json);
    expect(evidence.block).toBe("MESS");
    expect(evidence.accuracy_pct).toBe(35);
    expect(evidence.commonest_mistake?.category).toBe("wet_biodegradable");
    expect(evidence.commonest_mistake?.chosen_bin).toBe("blue");
  });
});

describe("AI Cache & Limiter (lib/ai/cache.ts & limiter.ts)", () => {
  beforeEach(() => {
    resetProviderCooldown();
    resetTokenBucket();
    resetRouteRateLimit();
  });

  it("stores and retrieves classification in SQLite ai_cache by SHA-256 hash", () => {
    const dummyBuffer = Buffer.from("UNIQUE_IMAGE_CONTENT_FOR_CACHE_TEST_123");
    const hash = hashImage(dummyBuffer);

    const sample = SAMPLE_ITEMS[0].classification;
    setCachedClassification(hash, sample, "groq");

    const cached = getCachedClassification(hash);
    expect(cached).not.toBeNull();
    expect(cached!.image_hash).toBe(hash);
    expect(cached!.classification.item_name).toBe(sample.item_name);
    expect(cached!.provider).toBe("groq");
  });

  it("parks provider on cooldown and tracks remaining seconds", () => {
    expect(isProviderCoolingDown("groq")).toBe(false);
    expect(getProviderCooldownRemaining("groq")).toBe(0);

    parkProvider("groq", 60);
    expect(isProviderCoolingDown("groq")).toBe(true);
    expect(getProviderCooldownRemaining("groq")).toBeGreaterThan(50);

    resetProviderCooldown("groq");
    expect(isProviderCoolingDown("groq")).toBe(false);
  });

  it("tracks token bucket and prevents scans when capacity is exhausted", () => {
    // Default capacity 8000, scan cost 2500
    expect(consumeTokens("groq", 2500)).toBe(true); // 5500 remaining
    expect(consumeTokens("groq", 2500)).toBe(true); // 3000 remaining
    expect(consumeTokens("groq", 2500)).toBe(true); // 500 remaining
    // Next 2500 scan should be rejected
    expect(consumeTokens("groq", 2500)).toBe(false);
  });

  it("enforces sliding window route rate limiter (20 req/min)", () => {
    for (let i = 0; i < 20; i++) {
      const res = checkRouteRateLimit("test-ip", 20, 60000);
      expect(res.allowed).toBe(true);
    }
    const rejected = checkRouteRateLimit("test-ip", 20, 60000);
    expect(rejected.allowed).toBe(false);
    expect(rejected.remaining).toBe(0);
  });
});

describe("AI Vision Ladder & Failovers (lib/ai/classify.ts)", () => {
  beforeEach(() => {
    resetProviderCooldown();
    resetTokenBucket();
    clearAiCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.AI_MODE;
  });

  it("returns cached classification immediately without calling providers", async () => {
    const buffer = Buffer.from("CACHED_TEST_IMAGE_BYTES_XYZ");
    const hash = hashImage(buffer);
    const mockClassification = SAMPLE_ITEMS[2].classification; // Plastic bottle

    setCachedClassification(hash, mockClassification, "groq");

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const res = await classifyWasteImage(buffer, "image/jpeg");
    expect(res.cached).toBe(true);
    expect(res.provider).toBe("groq");
    expect(res.classification.item_name).toBe(mockClassification.item_name);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls primary provider (Groq) and saves to cache on success", async () => {
    process.env.GROQ_API_KEY = "mock_groq_key";
    const buffer = Buffer.from("FRESH_IMAGE_GROQ_SUCCESS");

    const mockGroqResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              is_waste_item: true,
              item_name: "Plastic bottle",
              category: "plastic",
              confidence: 0.98,
              disposal_tip: "Place in blue dry bin.",
              reason: "PET recyclable material.",
            }),
          },
        },
      ],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockGroqResponse), { status: 200 }),
    );

    const res = await classifyWasteImage(buffer, "image/jpeg", { providerOrder: ["groq", "gemini", "sample"] });
    expect(res.cached).toBe(false);
    expect(res.provider).toBe("groq");
    expect(res.classification.category).toBe("plastic");

    // Check cached
    const hash = hashImage(buffer);
    const cached = getCachedClassification(hash);
    expect(cached).not.toBeNull();
    expect(cached!.provider).toBe("groq");
  });

  it("fails over instantly to Gemini on Groq 429 and parks Groq for retry-after seconds", async () => {
    process.env.GROQ_API_KEY = "mock_groq_key";
    process.env.GEMINI_API_KEY = "mock_gemini_key";
    const buffer = Buffer.from("FAILOVER_429_TEST_IMAGE");

    const mockGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  is_waste_item: true,
                  item_name: "Aluminium beverage can",
                  category: "metal_glass",
                  confidence: 0.96,
                  disposal_tip: "Recycle in blue dry bin.",
                  reason: "Metal drink container.",
                }),
              },
            ],
          },
        },
      ],
    };

    // First call: Groq returns 429 with Retry-After: 45
    // Second call: Gemini returns 200
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response("Too Many Requests", {
          status: 429,
          headers: { "retry-after": "45" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockGeminiResponse), { status: 200 }),
      );

    const res = await classifyWasteImage(buffer, "image/jpeg", { providerOrder: ["groq", "gemini", "sample"] });
    expect(res.provider).toBe("gemini");
    expect(res.classification.category).toBe("metal_glass");

    // Verify Groq was parked for 45 seconds
    expect(isProviderCoolingDown("groq")).toBe(true);
    expect(getProviderCooldownRemaining("groq")).toBeGreaterThan(35);
  });

  it("fails over instantly to Gemini on Groq 500 error", async () => {
    process.env.GROQ_API_KEY = "mock_groq_key";
    process.env.GEMINI_API_KEY = "mock_gemini_key";
    const buffer = Buffer.from("FAILOVER_500_TEST_IMAGE");

    const mockGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  is_waste_item: true,
                  item_name: "Apple core",
                  category: "wet_biodegradable",
                  confidence: 0.92,
                  disposal_tip: "Compost in green bin.",
                  reason: "Organic fruit leftovers.",
                }),
              },
            ],
          },
        },
      ],
    };

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("Internal Server Error", { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockGeminiResponse), { status: 200 }));

    const res = await classifyWasteImage(buffer, "image/jpeg", { providerOrder: ["groq", "gemini", "sample"] });
    expect(res.provider).toBe("gemini");
    expect(res.classification.category).toBe("wet_biodegradable");
  });

  it("retries once on malformed JSON, then moves down ladder to Gemini", async () => {
    process.env.GROQ_API_KEY = "mock_groq_key";
    process.env.GEMINI_API_KEY = "mock_gemini_key";
    const buffer = Buffer.from("MALFORMED_JSON_TEST_IMAGE");

    const badGroqResponse = {
      choices: [{ message: { content: "This is not JSON at all!" } }],
    };

    const mockGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  is_waste_item: true,
                  item_name: "Cardboard box",
                  category: "paper_cardboard",
                  confidence: 0.95,
                  disposal_tip: "Flatten and place in blue bin.",
                  reason: "Clean cardboard packaging.",
                }),
              },
            ],
          },
        },
      ],
    };

    // Groq attempt 1 (malformed), Groq attempt 2 (retry, also malformed), then Gemini attempt 1 (ok)
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(badGroqResponse), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(badGroqResponse), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockGeminiResponse), { status: 200 }));

    const res = await classifyWasteImage(buffer, "image/jpeg", { providerOrder: ["groq", "gemini", "sample"] });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(res.provider).toBe("gemini");
    expect(res.classification.category).toBe("paper_cardboard");
  });

  it("treats unknown category as malformed JSON and retries/fails over", async () => {
    process.env.GROQ_API_KEY = "mock_groq_key";
    process.env.GEMINI_API_KEY = "mock_gemini_key";
    const buffer = Buffer.from("UNKNOWN_CATEGORY_TEST_IMAGE");

    const unknownCatResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              is_waste_item: true,
              item_name: "Item",
              category: "space_junk_unknown", // Invalid category
              confidence: 0.9,
              disposal_tip: "Throw away",
              reason: "Invalid",
            }),
          },
        },
      ],
    };

    const validGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  is_waste_item: true,
                  item_name: "Battery",
                  category: "e_waste",
                  confidence: 0.91,
                  disposal_tip: "Deposit in red bin.",
                  reason: "Alkaline cell.",
                }),
              },
            ],
          },
        },
      ],
    };

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(unknownCatResponse), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(unknownCatResponse), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(validGeminiResponse), { status: 200 }));

    const res = await classifyWasteImage(buffer, "image/jpeg", { providerOrder: ["groq", "gemini", "sample"] });
    expect(res.provider).toBe("gemini");
    expect(res.classification.category).toBe("e_waste");
  });

  it("fails over to sample when both Groq and Gemini fail", async () => {
    process.env.GROQ_API_KEY = "mock_groq_key";
    process.env.GEMINI_API_KEY = "mock_gemini_key";
    const buffer = Buffer.from("FAIL_ALL_FALLBACK_SAMPLE");

    vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("Groq network failed"))
      .mockRejectedValueOnce(new Error("Gemini network failed"));

    const res = await classifyWasteImage(buffer, "image/jpeg", { providerOrder: ["groq", "gemini", "sample"] });
    expect(res.provider).toBe("sample");
    expect(res.classification.is_waste_item).toBe(true);
    expect(res.classification.disposal_tip.length).toBeGreaterThan(0);
  });

  it("forces sample immediately when AI_MODE=sample", async () => {
    process.env.AI_MODE = "sample";
    const buffer = Buffer.from("SAMPLE_MODE_FORCED");

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const res = await classifyWasteImage(buffer, "image/jpeg");
    expect(res.provider).toBe("sample");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
