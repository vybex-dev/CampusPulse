/**
 * Gemini Vision API Adapter for CampusPulse (Fallback provider in default ladder).
 *
 * NOTE: As per architectural rules, all Gemini-specific code stays strictly in gemini.ts.
 * Uses plain fetch + AbortController (no heavy SDK).
 */
import {
  type Classification,
  ClassificationSchema,
  WASTE_CATEGORIES,
} from "../contract";

export class GeminiRateLimitError extends Error {
  constructor(public retryAfterSeconds: number, message: string) {
    super(message);
    this.name = "GeminiRateLimitError";
  }
}

export class GeminiMalformedJsonError extends Error {
  constructor(public rawResponse: string, message: string) {
    super(message);
    this.name = "GeminiMalformedJsonError";
  }
}

export class GeminiApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "GeminiApiError";
  }
}

const PROMPT_TEXT = `Classify the single most prominent item in this image for a campus waste segregation audit.
Rules:
- classify the single most prominent item
- is_waste_item false if unclear or no waste is visible
- ignore people and faces completely
- tip under 20 words
- JSON only.

Allowed categories: ${WASTE_CATEGORIES.map((c) => `"${c}"`).join(", ")}.

Output strictly valid JSON with this shape:
{
  "is_waste_item": true,
  "item_name": "string",
  "category": "one_of_the_allowed_categories",
  "confidence": 0.95,
  "disposal_tip": "tip under 20 words",
  "reason": "brief explanation"
}`;

/**
 * Classifies an image using Gemini generateContent REST endpoint.
 */
export async function classifyWithGemini(
  buffer: Buffer,
  mimeType = "image/jpeg",
  options?: { timeoutMs?: number; apiKey?: string; model?: string },
): Promise<Classification> {
  const apiKey = options?.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiApiError(401, "GEMINI_API_KEY is not configured");
  }

  const model = options?.model ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const timeoutMs = options?.timeoutMs ?? Number(process.env.AI_TIMEOUT_MS_GEMINI ?? 4000);

  const baseEndpoint =
    process.env.GEMINI_ENDPOINT ??
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const url = `${baseEndpoint}?key=${apiKey}`;

  const base64Data = buffer.toString("base64");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: PROMPT_TEXT },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.1,
        },
      }),
    });

    if (res.status === 429) {
      const headerVal = res.headers.get("retry-after");
      const retryAfterSeconds = headerVal ? parseInt(headerVal, 10) || 60 : 60;
      throw new GeminiRateLimitError(
        retryAfterSeconds,
        `Gemini rate limited (429). Retry after ${retryAfterSeconds}s`,
      );
    }

    if (res.status >= 500) {
      throw new GeminiApiError(res.status, `Gemini server error: HTTP ${res.status}`);
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new GeminiApiError(res.status, `Gemini API returned HTTP ${res.status}: ${errorText}`);
    }

    const json = (await res.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const rawContent = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawContent) {
      throw new GeminiMalformedJsonError("", "Gemini returned empty candidate content");
    }

    // Clean markdown fences
    let cleanJson = rawContent.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.slice(7);
    } else if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.slice(3);
    }
    if (cleanJson.endsWith("```")) {
      cleanJson = cleanJson.slice(0, -3);
    }
    cleanJson = cleanJson.trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      throw new GeminiMalformedJsonError(rawContent, "Failed to parse JSON from Gemini response");
    }

    const result = ClassificationSchema.safeParse(parsed);
    if (!result.success) {
      throw new GeminiMalformedJsonError(
        rawContent,
        `Gemini response schema mismatch: ${result.error.message}`,
      );
    }

    return result.data;
  } catch (err: unknown) {
    if (err instanceof GeminiRateLimitError || err instanceof GeminiMalformedJsonError || err instanceof GeminiApiError) {
      throw err;
    }
    if ((err as Error)?.name === "AbortError") {
      throw new GeminiApiError(408, `Gemini request timed out after ${timeoutMs}ms`);
    }
    throw new GeminiApiError(0, `Gemini network error: ${(err as Error)?.message ?? String(err)}`);
  } finally {
    clearTimeout(timer);
  }
}
