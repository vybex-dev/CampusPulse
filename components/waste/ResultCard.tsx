"use client";

import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Zap,
  Leaf,
  Award,
  Layers,
} from "lucide-react";
import type {
  Classification,
  Provider,
  Bin,
  WasteCategory,
} from "@/lib/contract";
import { Pill } from "@/components/ui/Pill";
import { TagPill } from "@/components/ui/TagPill";
import { CATEGORY_TABLE } from "@/lib/categories";
import { cn } from "@/lib/cn";

interface ResultCardProps {
  classification: Classification;
  provider: Provider;
  mode: "identify" | "bin_check";
  chosenBin?: Bin | null;
  cached?: boolean;
}

const BIN_COLORS: Record<Bin, { bg: string; text: string; dot: string; label: string }> = {
  green: { bg: "bg-sev-green/10", text: "text-sev-green", dot: "bg-sev-green", label: "Green (wet)" },
  blue: { bg: "bg-res-water/10", text: "text-res-water", dot: "bg-res-water", label: "Blue (dry recyclable)" },
  red: { bg: "bg-sev-red/10", text: "text-sev-red", dot: "bg-sev-red", label: "Red (special collection)" },
  black: { bg: "bg-ink/10", text: "text-ink", dot: "bg-ink", label: "Black (residual)" },
};

const PROVIDER_NAMES: Record<Provider, string> = {
  groq: "Groq Llama 3.2 Vision",
  gemini: "Gemini 1.5 Flash Fallback",
  sample: "Prepared Sample Mode",
};

export function ResultCard({
  classification,
  provider,
  mode,
  chosenBin,
  cached = false,
}: ResultCardProps) {
  const meta = CATEGORY_TABLE[classification.category] ?? CATEGORY_TABLE.other_residual;
  const targetBin = meta.bin;
  const binStyle = BIN_COLORS[targetBin];

  const isBinCheck = mode === "bin_check";
  const isCorrect = isBinCheck && chosenBin ? chosenBin === targetBin : null;

  return (
    <div className="flex flex-col gap-5 rounded-card border border-hairline bg-surface p-card shadow-card">
      {/* Bin Check Outcome Banner */}
      {isBinCheck && chosenBin && (
        <div
          className={cn(
            "flex items-center gap-3 rounded-control p-4 border",
            isCorrect
              ? "bg-sev-green/10 border-sev-green/20 text-ink"
              : "bg-sev-red/10 border-sev-red/20 text-ink",
          )}
        >
          {isCorrect ? (
            <CheckCircle2 className="h-6 w-6 text-sev-green shrink-0" />
          ) : (
            <AlertTriangle className="h-6 w-6 text-sev-red shrink-0" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-body">
                {isCorrect ? "Correct Bin Selection!" : "Incorrect Bin"}
              </span>
              <span className="text-caption font-medium">
                {isCorrect ? "+10 Points earned" : "0 Points"}
              </span>
            </div>
            <p className="mt-0.5 text-caption text-ink-secondary">
              {isCorrect
                ? `Well done! ${classification.item_name} belongs in the ${binStyle.label} bin.`
                : `You selected ${BIN_COLORS[chosenBin]?.label ?? chosenBin}, but ${classification.item_name} belongs in the ${binStyle.label} bin.`}
            </p>
          </div>
        </div>
      )}

      {/* Item Headline & Confidence */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-caption font-semibold uppercase tracking-wider text-ink-tertiary">
              Classification Result
            </span>
            <span className="inline-flex items-center gap-1 rounded-pill bg-canvas px-2.5 py-0.5 text-caption font-mono text-ink-secondary border border-hairline">
              <Sparkles className="h-3 w-3 text-brand" />
              {PROVIDER_NAMES[provider] ?? provider}
              {cached && " (cached)"}
            </span>
          </div>

          <h3 className="text-section font-semibold text-ink">
            {classification.item_name}
          </h3>
          <p className="mt-1 text-caption text-ink-secondary">
            {meta.name}
          </p>
        </div>

        {/* Confidence chip */}
        <div className="flex flex-col items-end">
          <span className="text-caption text-ink-tertiary">Confidence</span>
          <span className="text-body font-semibold tabular-nums text-ink">
            {Math.round(classification.confidence * 100)}%
          </span>
        </div>
      </div>

      {/* Target Bin Card */}
      <div className="flex items-center justify-between rounded-control border border-hairline bg-canvas p-4">
        <div className="flex items-center gap-3">
          <span className={cn("h-4 w-4 rounded-full", binStyle.dot)} />
          <div>
            <span className="text-caption text-ink-tertiary block">Designated Bin</span>
            <strong className="text-body font-semibold text-ink">
              {binStyle.label}
            </strong>
          </div>
        </div>
        <div className="text-right">
          <span className="text-caption text-ink-tertiary block">Est. Weight</span>
          <span className="text-caption font-semibold text-ink tabular-nums">
            {meta.weight_kg} kg
          </span>
        </div>
      </div>

      {/* Disposal Tip */}
      <div className="flex items-start gap-3 rounded-control bg-brand/[0.04] p-4 border border-brand/10">
        <Lightbulb className="h-5 w-5 text-brand shrink-0 mt-0.5" />
        <div className="text-caption leading-relaxed">
          <span className="font-semibold text-ink block mb-0.5">Disposal Guidance</span>
          <p className="text-ink-secondary">{classification.disposal_tip}</p>
        </div>
      </div>

      {/* Eco impact & Points chips */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-hairline">
        <div className="flex items-center gap-2 text-caption">
          <Leaf className="h-4 w-4 text-res-waste" />
          <div>
            <span className="text-ink-tertiary block text-caption">CO₂e Avoided</span>
            <span className="font-semibold text-ink tabular-nums">
              {(meta.weight_kg * meta.ef_kg_per_kg).toFixed(2)} kg CO₂e
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-caption">
          <Award className="h-4 w-4 text-sev-amber" />
          <div>
            <span className="text-ink-tertiary block text-caption">Gamification Points</span>
            <span className="font-semibold text-ink tabular-nums">
              {meta.points} pts
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
