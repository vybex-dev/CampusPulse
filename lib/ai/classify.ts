/**
 * Master Waste Vision Classification Orchestrator for CampusPulse.
 *
 * Implements the provider ladder:
 * 1. Checks SQLite ai_cache by SHA-256 hash.
 * 2. Follows ladder from AI_PROVIDER_ORDER (default: groq,gemini,sample).
 * 3. AI_MODE=sample forces samples.
 * 4. Token bucket: ~2.5K tokens per scan, 8K/min.
 * 5. Instant failover on 429, 5xx, network error, or timeout (4s AbortController).
 * 6. One retry on malformed JSON, then moves down.
 * 7. Zod-validates output schema; unknown category counts as malformed.
 * 8. Parks Groq/Gemini on 429 for retry-after seconds (default 60s).
 */
import {
  type Bin,
  type Classification,
  type Provider,
  type WasteCategory,
} from "../contract";
import { type Db, getDb } from "../db";
import {
  hashImage,
  getCachedClassification,
  setCachedClassification,
} from "./cache";
import {
  parkProvider,
  isProviderCoolingDown,
  consumeTokens,
  TOKENS_PER_SCAN,
} from "./limiter";
import { classifyWithGroq, GroqRateLimitError, GroqMalformedJsonError } from "./groq";
import { classifyWithGemini, GeminiRateLimitError, GeminiMalformedJsonError } from "./gemini";
import { classifyWithSample, type PreparedSampleItem } from "./samples";

export { CATEGORY_TABLE, type WasteCategoryMetadata } from "../categories";

export interface ClassifyResult {
  classification: Classification;
  provider: Provider;
  cached: boolean;
  sample?: PreparedSampleItem;
}

export interface ClassifyOptions {
  db?: Db;
  skipCache?: boolean;
  providerOrder?: Provider[];
  sampleId?: string;
  timeoutMs?: number;
}

/**
 * Parses configured provider order from env AI_PROVIDER_ORDER.
 */
export function getProviderOrder(): Provider[] {
  const envVal = process.env.AI_PROVIDER_ORDER ?? "groq,gemini,sample";
  const parts = envVal
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is Provider => s === "groq" || s === "gemini" || s === "sample");

  if (parts.length === 0) return ["groq", "gemini", "sample"];
  if (!parts.includes("sample")) parts.push("sample");
  return parts;
}

/**
 * Creates a thumbnail <= 160px data URL without saving full images to disk.
 */
export async function makeThumbnail(buffer: Buffer, mimeType = "image/jpeg"): Promise<string> {
  try {
    const sharpModule = await import("sharp");
    const sharp = sharpModule.default;
    const resized = await sharp(buffer)
      .resize(160, 160, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer();
    return `data:image/jpeg;base64,${resized.toString("base64")}`;
  } catch {
    // Lightweight fallback for test or non-image buffers
    const base64Prefix = buffer.toString("base64").slice(0, 300);
    return `data:${mimeType};base64,${base64Prefix}`;
  }
}

/**
 * Main entry point: classifies a waste image following the provider ladder.
 */
export async function classifyWasteImage(
  buffer: Buffer,
  mimeType = "image/jpeg",
  options?: ClassifyOptions,
): Promise<ClassifyResult> {
  const db = options?.db ?? getDb();

  // 1. Force sample mode if AI_MODE=sample
  if (process.env.AI_MODE === "sample") {
    const sampleRes = classifyWithSample(buffer, mimeType, options?.sampleId);
    return {
      classification: sampleRes.classification,
      provider: "sample",
      cached: false,
      sample: sampleRes.sample,
    };
  }

  // 2. Check SHA-256 hash cache
  const imageHash = hashImage(buffer);
  if (!options?.skipCache) {
    const cached = getCachedClassification(imageHash, db);
    if (cached) {
      return {
        classification: cached.classification,
        provider: cached.provider,
        cached: true,
      };
    }
  }

  // 3. Follow provider ladder
  const ladder = options?.providerOrder ?? getProviderOrder();

  for (const provider of ladder) {
    if (provider === "groq") {
      // Check cooldown
      if (isProviderCoolingDown("groq")) {
        continue;
      }
      // Check token bucket
      if (!consumeTokens("groq", TOKENS_PER_SCAN)) {
        continue;
      }

      // Try Groq call (with 1 retry on malformed JSON)
      let attempt = 0;
      let groqSuccess: Classification | null = null;

      while (attempt < 2) {
        attempt++;
        try {
          groqSuccess = await classifyWithGroq(buffer, mimeType, {
            timeoutMs: options?.timeoutMs,
          });
          break; // Succeeded
        } catch (err: unknown) {
          if (err instanceof GroqRateLimitError) {
            parkProvider("groq", err.retryAfterSeconds);
            break; // Fail over immediately on 429
          }
          if (err instanceof GroqMalformedJsonError) {
            if (attempt === 1) {
              // One retry on malformed JSON
              continue;
            }
            break; // Move down ladder after 1 retry
          }
          // 5xx, timeout, network error: fail over instantly
          break;
        }
      }

      if (groqSuccess) {
        setCachedClassification(imageHash, groqSuccess, "groq", db);
        return {
          classification: groqSuccess,
          provider: "groq",
          cached: false,
        };
      }
      // Groq failed; move down ladder
    } else if (provider === "gemini") {
      // Check cooldown
      if (isProviderCoolingDown("gemini")) {
        continue;
      }
      // Check token bucket
      if (!consumeTokens("gemini", TOKENS_PER_SCAN)) {
        continue;
      }

      // Try Gemini call (with 1 retry on malformed JSON)
      let attempt = 0;
      let geminiSuccess: Classification | null = null;

      while (attempt < 2) {
        attempt++;
        try {
          geminiSuccess = await classifyWithGemini(buffer, mimeType, {
            timeoutMs: options?.timeoutMs,
          });
          break; // Succeeded
        } catch (err: unknown) {
          if (err instanceof GeminiRateLimitError) {
            parkProvider("gemini", err.retryAfterSeconds);
            break; // Fail over immediately on 429
          }
          if (err instanceof GeminiMalformedJsonError) {
            if (attempt === 1) {
              // One retry on malformed JSON
              continue;
            }
            break; // Move down ladder after 1 retry
          }
          // 5xx, timeout, network error: fail over instantly
          break;
        }
      }

      if (geminiSuccess) {
        setCachedClassification(imageHash, geminiSuccess, "gemini", db);
        return {
          classification: geminiSuccess,
          provider: "gemini",
          cached: false,
        };
      }
      // Gemini failed; move down ladder
    } else if (provider === "sample") {
      const sampleRes = classifyWithSample(buffer, mimeType, options?.sampleId);
      setCachedClassification(imageHash, sampleRes.classification, "sample", db);
      return {
        classification: sampleRes.classification,
        provider: "sample",
        cached: false,
        sample: sampleRes.sample,
      };
    }
  }

  // Last resort guaranteed fallback
  const lastResort = classifyWithSample(buffer, mimeType, options?.sampleId);
  return {
    classification: lastResort.classification,
    provider: "sample",
    cached: false,
    sample: lastResort.sample,
  };
}
