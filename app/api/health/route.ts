import { NextResponse } from "next/server";
import type { Health } from "@/lib/contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const groqKey = Boolean(process.env.GROQ_API_KEY);
  const geminiKey = Boolean(process.env.GEMINI_API_KEY);
  const body: Health = {
    providers: {
      groq: {
        status: groqKey ? "ok" : "unconfigured",
        model: process.env.GROQ_MODEL ?? "qwen/qwen3.8-27b",
      },
      gemini: {
        status: geminiKey ? "ok" : "unconfigured",
        model: process.env.GEMINI_MODEL ?? "gemini-3.8-flash",
      },
    },
    sample_mode: process.env.AI_MODE === "sample" || (!groqKey && !geminiKey),
  };
  return NextResponse.json(body);
}
