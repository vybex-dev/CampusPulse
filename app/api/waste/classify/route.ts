import { type NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { classifyWasteImage, makeThumbnail } from "@/lib/ai/classify";
import { checkRouteRateLimit } from "@/lib/ai/limiter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 1.5 * 1024 * 1024; // 1.5 MB limit

export async function POST(req: NextRequest) {
  // 1. Rate limiting: 20 req/min
  const clientIp = req.headers.get("x-forwarded-for") ?? "local-client";
  const rateLimit = checkRouteRateLimit(`classify:${clientIp}`, 20, 60000);
  if (!rateLimit.allowed) {
    return jsonError(
      429,
      "RATE_LIMITED",
      "Rate limit exceeded (max 20 requests per minute). Please try again shortly.",
    );
  }

  // 2. Read multipart form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return jsonError(400, "INVALID_FORM_DATA", "Expected multipart/form-data with an image file");
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return jsonError(400, "MISSING_FILE", "Image file under 'file' key is required");
  }

  if (file.size > MAX_FILE_SIZE) {
    return jsonError(
      413,
      "PAYLOAD_TOO_LARGE",
      `Image file exceeds 1.5 MB limit (${Math.round(file.size / 1024)} KB)`,
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = file.type || "image/jpeg";

  try {
    // 3. Generate compact <= 160px thumbnail data URL (never writing full image to disk)
    const thumb = await makeThumbnail(buffer, mimeType);

    // 4. Classify through ladder (Cache -> Groq -> Gemini -> Sample)
    const result = await classifyWasteImage(buffer, mimeType);

    return NextResponse.json({
      classification: result.classification,
      provider: result.provider,
      cached: result.cached,
      thumb: result.sample?.thumb ?? thumb,
    });
  } catch (err: unknown) {
    console.error("Classification error:", err);
    return jsonError(
      500,
      "CLASSIFY_FAILED",
      `Waste classification failed: ${(err as Error)?.message ?? String(err)}`,
    );
  }
}
