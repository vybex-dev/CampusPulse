/**
 * Groq Vision API Adapter for CampusPulse (Primary provider in default ladder).
 *
 * Uses plain fetch + AbortController (no heavy SDK).
 * Fails over on 429, 5xx, network error, or invalid JSON.
 */
import {
  type Classification,
  ClassificationSchema,
  WASTE_CATEGORIES,
} from "../contract";

export class GroqRateLimitError extends Error {
  constructor(public retryAfterSeconds: number, message: string) {
    super(message);
    this.name = "GroqRateLimitError";
  }
}

export class GroqMalformedJsonError extends Error {
  constructor(public rawResponse: string, message: string) {
    super(message);
    this.name = "GroqMalformedJsonError";
  }
}

export class GroqApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "GroqApiError";
  }
}

const GROQ_ENDPOINT =
  process.env.GROQ_ENDPOINT ?? "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `You are a strict waste classification vision assistant for a campus.
Analyze the single most prominent item in the image.
Rules:
- classify the single most prominent item
- is_waste_item false if unclear or no discardable waste item is found
- ignore people and faces completely
- tip under 20 words
- JSON only, conforming to the exact schema.

Allowed category values (exact match required):
${WASTE_CATEGORIES.map((c) => `"${c}"`).join(", ")}

Return only a valid JSON object with these keys:
{
  "is_waste_item": true or false,
  "item_name": "short descriptive name",
  "category": "one of the allowed category strings",
  "confidence": 0.0 to 1.0,
  "disposal_tip": "concise tip under 20 words",
  "reason": "brief reason for classification"
}`;

/**
 * Classifies an image using Groq's multimodal chat completions endpoint.
 */
export async function classifyWithGroq(
  buffer: Buffer,
  mimeType = "image/jpeg",
  options?: { timeoutMs?: number; apiKey?: string; model?: string },
): Promise<Classification> {
  const apiKey = options?.apiKey ?? process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new GroqApiError(401, "GROQ_API_KEY is not configured");
  }

  const model = options?.model ?? process.env.GROQ_MODEL ?? "llama-3.2-11b-vision-preview";
  const timeoutMs = options?.timeoutMs ?? Number(process.env.AI_TIMEOUT_MS_GROQ ?? 4000);

  const base64Data = buffer.toString("base64");
  const dataUri = `data:${mimeType};base64,${base64Data}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "classify the single most prominent item; is_waste_item false if unclear; ignore people and faces; tip under 20 words; JSON only.",
              },
              {
                type: "image_url",
                image_url: { url: dataUri },
              },
            ],
          },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) {
      const headerVal = res.headers.get("retry-after");
      const retryAfterSeconds = headerVal ? parseInt(headerVal, 10) || 60 : 60;
      throw new GroqRateLimitError(
        retryAfterSeconds,
        `Groq rate limited (429). Retry after ${retryAfterSeconds}s`,
      );
    }

    if (res.status >= 500) {
      throw new GroqApiError(res.status, `Groq server error: HTTP ${res.status}`);
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new GroqApiError(res.status, `Groq API returned HTTP ${res.status}: ${errorText}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const rawContent = json.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw new GroqMalformedJsonError("", "Groq returned empty response content");
    }

    // Clean potential markdown code blocks
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
      throw new GroqMalformedJsonError(rawContent, "Failed to parse JSON from Groq response");
    }

    // Validate with Zod schema (unknown category will fail schema validation)
    const result = ClassificationSchema.safeParse(parsed);
    if (!result.success) {
      throw new GroqMalformedJsonError(
        rawContent,
        `Groq response schema mismatch: ${result.error.message}`,
      );
    }

    return result.data;
  } catch (err: unknown) {
    if (err instanceof GroqRateLimitError || err instanceof GroqMalformedJsonError || err instanceof GroqApiError) {
      throw err;
    }
    if ((err as Error)?.name === "AbortError") {
      throw new GroqApiError(408, `Groq request timed out after ${timeoutMs}ms`);
    }
    throw new GroqApiError(0, `Groq network error: ${(err as Error)?.message ?? String(err)}`);
  } finally {
    clearTimeout(timer);
  }
}
