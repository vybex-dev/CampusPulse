import { NextResponse } from "next/server";
import { SAMPLE_ITEMS } from "@/lib/ai/samples";
import { CATEGORY_TABLE } from "@/lib/ai/classify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const items = SAMPLE_ITEMS.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    bin: CATEGORY_TABLE[s.category]?.bin ?? "black",
    bin_name: CATEGORY_TABLE[s.category]?.binName ?? "Black (residual)",
    thumb: s.thumb,
    classification: s.classification,
  }));

  return NextResponse.json({ samples: items });
}
