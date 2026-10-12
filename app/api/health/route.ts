import { NextResponse } from "next/server";
import type { Health } from "@/lib/contract";
import {
  isProviderCoolingDown,
  getProviderCooldownRemaining,
} from "@/lib/ai/limiter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const groqKey = Boolean(process.env.GROQ_API_KEY);
  const geminiKey = Boolean(process.env.GEMINI_API_KEY);

  const groqCooling = isProviderCoolingDown("groq");
  const geminiCooling = isProviderCoolingDown("gemini");

  const groqRetryAfter = groqCooling ? getProviderCooldownRemaining("groq") : undefined;
  const geminiRetryAfter = geminiCooling ? getProviderCooldownRemaining("gemini") : undefined;

  let groqStatus: "ok" | "cooling_down" | "unconfigured" = "unconfigured";
  if (groqKey) {
    groqStatus = groqCooling ? "cooling_down" : "ok";
  }

  let geminiStatus: "ok" | "cooling_down" | "unconfigured" = "unconfigured";
  if (geminiKey) {
    geminiStatus = geminiCooling ? "cooling_down" : "ok";
  }

  const body: Health = {
    providers: {
      groq: {
        status: groqStatus,
        model: process.env.GROQ_MODEL ?? "llama-3.2-11b-vision-preview",
        ...(groqRetryAfter !== undefined ? { retry_after_s: groqRetryAfter } : {}),
      },
      gemini: {
        status: geminiStatus,
        model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
        ...(geminiRetryAfter !== undefined ? { retry_after_s: geminiRetryAfter } : {}),
      },
    },
    sample_mode: process.env.AI_MODE === "sample" || (!groqKey && !geminiKey),
  };

  return NextResponse.json(body);
}
