import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { classifyWasteImage } from "@/lib/ai/classify";
import {
  parkProvider,
  isProviderCoolingDown,
  getProviderCooldownRemaining,
  resetProviderCooldown,
  resetTokenBucket,
  resetRouteRateLimit,
} from "@/lib/ai/limiter";
import { clearAiCache } from "@/lib/ai/cache";

describe("AI Failover & Provider Ladder Suite (Groq -> Gemini -> Samples)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    resetProviderCooldown();
    resetTokenBucket();
    resetRouteRateLimit();
    clearAiCache();
    process.env.GROQ_API_KEY = "mock_groq_key";
    process.env.GEMINI_API_KEY = "mock_gemini_key";
    process.env.AI_MODE = "live";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("1. Groq primary succeeds when healthy (200 OK)", async () => {
    const mockGroqPayload = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              is_waste_item: true,
              item_name: "Plastic water bottle",
              category: "plastic",
              confidence: 0.94,
              disposal_tip: "Empty liquid and place in blue bin.",
              reason: "Clear PET bottle, recyclable polymer.",
            }),
          },
        },
      ],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockGroqPayload), { status: 200 }),
    );

    const buffer = Buffer.from("TEST_PRIMARY_GROQ_IMAGE");
    const res = await classifyWasteImage(buffer, "image/jpeg", {
      providerOrder: ["groq", "gemini", "sample"],
      skipCache: true,
    });

    expect(res.provider).toBe("groq");
    expect(res.classification.category).toBe("plastic");
    expect(res.classification.item_name).toBe("Plastic water bottle");
    expect(res.classification.confidence).toBe(0.94);
  });

  it("2. Fails over immediately to Gemini when Groq returns 429 Too Many Requests and parks Groq", async () => {
    const mockGeminiPayload = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  is_waste_item: true,
                  item_name: "Soda beverage can",
                  category: "metal_glass",
                  confidence: 0.91,
                  disposal_tip: "Rinse and dispose in blue dry recyclables bin.",
                  reason: "Aluminium beverage container.",
                }),
              },
            ],
          },
        },
      ],
    };

    // First call (Groq) -> 429 Rate limit with retry-after header
    // Second call (Gemini) -> 200 OK
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response("Rate limit reached", {
          status: 429,
          headers: { "retry-after": "60" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockGeminiPayload), { status: 200 }),
      );

    const buffer = Buffer.from("TEST_429_FAILOVER_IMAGE");
    const res = await classifyWasteImage(buffer, "image/jpeg", {
      providerOrder: ["groq", "gemini", "sample"],
      skipCache: true,
    });

    expect(res.provider).toBe("gemini");
    expect(res.classification.category).toBe("metal_glass");

    // Verify Groq is parked in cooldown
    expect(isProviderCoolingDown("groq")).toBe(true);
    expect(getProviderCooldownRemaining("groq")).toBeGreaterThan(45);
  });

  it("3. Fails over immediately to Gemini when Groq returns 500 Server Error", async () => {
    const mockGeminiPayload = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  is_waste_item: true,
                  item_name: "Cardboard mailer",
                  category: "paper_cardboard",
                  confidence: 0.89,
                  disposal_tip: "Flatten and place in blue bin.",
                  reason: "Corrugated cardboard shipping material.",
                }),
              },
            ],
          },
        },
      ],
    };

    // Groq -> 500, Gemini -> 200
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response("Groq Server Error", { status: 500 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockGeminiPayload), { status: 200 }),
      );

    const buffer = Buffer.from("TEST_500_FAILOVER_IMAGE");
    const res = await classifyWasteImage(buffer, "image/jpeg", {
      providerOrder: ["groq", "gemini", "sample"],
      skipCache: true,
    });

    expect(res.provider).toBe("gemini");
    expect(res.classification.category).toBe("paper_cardboard");
  });

  it("4. Fails over to Prepared Samples when BOTH Groq and Gemini fail", async () => {
    // Both providers return 503 or fail
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("Groq Unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response("Gemini Unavailable", { status: 503 }));

    const buffer = Buffer.from("TEST_ALL_DOWN_IMAGE");
    const res = await classifyWasteImage(buffer, "image/jpeg", {
      providerOrder: ["groq", "gemini", "sample"],
      sampleId: "sample-apple-core",
      skipCache: true,
    });

    expect(res.provider).toBe("sample");
    expect(res.classification.category).toBe("wet_biodegradable");
    expect(res.classification.item_name).toBe("Apple core");
    expect(res.classification.is_waste_item).toBe(true);
  });

  it("5. Bypasses unconfigured providers when API keys are absent", async () => {
    delete process.env.GROQ_API_KEY;
    delete process.env.GEMINI_API_KEY;

    // With no keys configured, classifyWasteImage falls straight to prepared samples
    const buffer = Buffer.from("TEST_NO_KEYS_IMAGE");
    const res = await classifyWasteImage(buffer, "image/jpeg", {
      providerOrder: ["groq", "gemini", "sample"],
      sampleId: "sample-cardboard-box",
      skipCache: true,
    });

    expect(res.provider).toBe("sample");
    expect(res.classification.category).toBe("paper_cardboard");
  });

  it("6. Correctly identifies non-waste items and advises user", async () => {
    const mockGroqNonWaste = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              is_waste_item: false,
              item_name: "Smart wrist watch",
              category: "e_waste",
              confidence: 0.98,
              disposal_tip: "This appears to be an active personal device, not waste.",
              reason: "Functional wearable timepiece, do not discard.",
            }),
          },
        },
      ],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockGroqNonWaste), { status: 200 }),
    );

    const buffer = Buffer.from("TEST_NON_WASTE_IMAGE");
    const res = await classifyWasteImage(buffer, "image/jpeg", {
      providerOrder: ["groq", "gemini", "sample"],
      skipCache: true,
    });

    expect(res.classification.is_waste_item).toBe(false);
    expect(res.classification.item_name).toBe("Smart wrist watch");
    expect(res.classification.disposal_tip).toContain("not waste");
  });
});
