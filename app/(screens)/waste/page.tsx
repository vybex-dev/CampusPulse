"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Recycle,
  Camera,
  Upload,
  RefreshCw,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Info,
  Clock,
  Layers,
} from "lucide-react";
import { useUIStore } from "@/lib/store";
import { apiFetch } from "@/lib/api";
import { resizeImageToMax1024 } from "@/lib/image";
import {
  BLOCK_CODES,
  BLOCK_NAMES,
  type BlockCode,
  type Bin,
  type WasteCategory,
  type Classification,
  type Provider,
  type WasteMode,
  WASTE_CATEGORIES,
} from "@/lib/contract";
import { CATEGORY_TABLE } from "@/lib/categories";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { TagPill } from "@/components/ui/TagPill";
import { useToast } from "@/components/ui/Toast";

// Components
import { CameraCapture } from "@/components/waste/CameraCapture";
import { ImageDropzone } from "@/components/waste/ImageDropzone";
import { ResultCard } from "@/components/waste/ResultCard";
import { ScanHistory } from "@/components/waste/ScanHistory";
import { Leaderboard } from "@/components/waste/Leaderboard";
import { MessStoryCard } from "@/components/waste/MessStoryCard";

type LabState =
  | "idle"
  | "capturing"
  | "preview"
  | "analysing"
  | "result"
  | "low_confidence"
  | "no_item";

interface ClassifyResponse {
  classification: Classification;
  provider: Provider;
  cached: boolean;
  thumb: string;
}

export default function WasteLabPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const storedBlock = useUIStore((s) => s.block);
  const setStoredBlock = useUIStore((s) => s.setBlock);
  const wasteMode = useUIStore((s) => s.wasteMode);
  const setWasteMode = useUIStore((s) => s.setWasteMode);

  // Lab lifecycle states
  const [labState, setLabState] = useState<LabState>("idle");
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraDenialReason, setCameraDenialReason] = useState<string | null>(null);

  // Bin check selection
  const [chosenBin, setChosenBin] = useState<Bin | null>(null);

  // Analysis result state
  const [result, setResult] = useState<ClassifyResponse | null>(null);
  const [analysingSeconds, setAnalysingSeconds] = useState(0);

  // 2s cooldown debounce for Analyse button
  const [cooldown, setCooldown] = useState(false);

  // Selected Block (required before saving)
  const [selectedBlock, setSelectedBlock] = useState<BlockCode>(storedBlock ?? "MESS");

  // Timer for 8-second slow analysis detection
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (labState === "analysing") {
      setAnalysingSeconds(0);
      interval = setInterval(() => {
        setAnalysingSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [labState]);

  // Handle image acquired from either camera or dropzone
  const handleImageAcquired = async (fileOrBlob: Blob) => {
    try {
      const { blob, dataUrl } = await resizeImageToMax1024(fileOrBlob);
      setImageBlob(blob);
      setPreviewUrl(dataUrl);
      setLabState("preview");
    } catch (err: unknown) {
      toast((err as Error)?.message || "Failed to process image", "error");
    }
  };

  // Run AI classification
  const handleAnalyse = async (forceSample = false) => {
    if (!imageBlob || cooldown) return;

    setCooldown(true);
    setTimeout(() => setCooldown(false), 2000);

    setLabState("analysing");

    try {
      let data: ClassifyResponse;

      if (forceSample) {
        // Sample mode fallback
        const sampleRes = await apiFetch<{
          classification: Classification;
          provider: Provider;
          cached: boolean;
          thumb: string;
        }>("/api/waste/classifysample", {
          method: "POST",
          body: JSON.stringify({ sample_id: "sm-plastic-cup" }),
        });
        data = sampleRes;
      } else {
        const formData = new FormData();
        formData.append("file", imageBlob, "scan.jpg");

        const res = await fetch("/api/waste/classify", {
          method: "POST",
          headers: {
            "X-Role": useUIStore.getState().role,
          },
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Classification server error: ${res.statusText}`);
        }
        data = (await res.json()) as ClassifyResponse;
      }

      setResult(data);

      const cls = data.classification;

      // 1. Not a waste item check
      if (!cls.is_waste_item) {
        setLabState("no_item");
        return;
      }

      // 2. Low confidence (< 0.6) check
      if (cls.confidence < 0.6) {
        setLabState("low_confidence");
        return;
      }

      // 3. Normal high/medium confidence result -> Log to DB
      setLabState("result");
      await saveWasteLog(cls, data.provider, data.thumb, "ai");
    } catch (err: unknown) {
      console.error("Analysis failed:", err);
      toast("Live vision timed out. Switched to prepared sample mode.", "neutral");
      // Fallback directly to prepared sample
      void handleAnalyse(true);
    }
  };

  // Save scan to database log
  const saveWasteLog = async (
    classification: Classification,
    provider: Provider,
    thumb: string,
    source: "ai" | "user_corrected" | "sample",
  ) => {
    try {
      await apiFetch("/api/waste/log", {
        method: "POST",
        body: JSON.stringify({
          block_id: selectedBlock,
          mode: wasteMode,
          category: classification.category,
          item_name: classification.item_name,
          confidence: classification.confidence,
          source,
          provider,
          chosen_bin: wasteMode === "bin_check" ? chosenBin : null,
          thumb,
        }),
      });

      void queryClient.invalidateQueries({ queryKey: ["waste"] });
      void queryClient.invalidateQueries({ queryKey: ["summary"] });
      toast("Scan logged to campus dataset", "success");
    } catch (err: unknown) {
      console.error("Failed to save waste log:", err);
    }
  };

  // Handle user correction on low confidence
  const handleUserCorrection = async (chosenCategory: WasteCategory) => {
    if (!result) return;
    const meta = CATEGORY_TABLE[chosenCategory];
    const correctedClassification: Classification = {
      ...result.classification,
      category: chosenCategory,
      item_name: meta.name.split(" ")[0],
      confidence: 1.0,
      disposal_tip: `Sort into ${meta.binName}. Verified by user correction.`,
    };

    setResult({
      ...result,
      classification: correctedClassification,
    });
    setLabState("result");

    await saveWasteLog(
      correctedClassification,
      result.provider,
      result.thumb,
      "user_corrected",
    );
  };

  const handleRetake = () => {
    setImageBlob(null);
    setPreviewUrl(null);
    setResult(null);
    setChosenBin(null);
    setLabState("idle");
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Waste Lab"
        description="Computer vision sorting assistant for students and staff. Identify recyclable packaging or verify your bin choices in real time."
        actions={
          <Segmented
            ariaLabel="Waste lab scanning mode"
            value={wasteMode}
            onChange={(v) => {
              const m = v as WasteMode;
              setWasteMode(m);
              setChosenBin(null);
            }}
            options={[
              { value: "identify", label: "Identify Item" },
              { value: "bin_check", label: "Bin Check Challenge" },
            ]}
          />
        }
      />

      {/* Main 2-Column Desktop Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7-Cols: Hero Scanner Card */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <Card className="p-card flex flex-col gap-6 shadow-card">
            {/* Block Selector Strip & Privacy Notice */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-hairline">
              <div className="flex items-center gap-2">
                <label className="text-caption font-semibold text-ink">
                  Location Block:
                </label>
                <select
                  value={selectedBlock}
                  onChange={(e) => {
                    const b = e.target.value as BlockCode;
                    setSelectedBlock(b);
                    setStoredBlock(b);
                  }}
                  className="rounded-control border border-hairline bg-canvas px-3 py-1.5 text-caption font-medium text-ink focus:border-brand focus:outline-none"
                >
                  {BLOCK_CODES.map((code) => (
                    <option key={code} value={code}>
                      {code} ({BLOCK_NAMES[code]})
                    </option>
                  ))}
                </select>
              </div>

              {/* Privacy Notice */}
              <div className="flex items-center gap-1.5 text-[11px] text-ink-tertiary">
                <Lock className="h-3 w-3" />
                <span>Photograph the item only. Never store personal data.</span>
              </div>
            </div>

            {/* Mode-Specific Bin Check Selector */}
            {wasteMode === "bin_check" && labState !== "result" && (
              <div className="rounded-control bg-canvas p-4 border border-hairline flex flex-col gap-2">
                <span className="text-caption font-semibold text-ink">
                  Step 1: Which bin are you placing this item into?
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: "green", label: "Green (wet)", cls: "border-sev-green text-sev-green" },
                      { id: "blue", label: "Blue (dry)", cls: "border-sky-500 text-sky-600" },
                      { id: "red", label: "Red (special)", cls: "border-sev-red text-sev-red" },
                      { id: "black", label: "Black (residual)", cls: "border-ink text-ink" },
                    ] as const
                  ).map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setChosenBin(b.id)}
                      className={`py-2 px-3 text-caption font-medium rounded-control border transition-all text-center ${
                        chosenBin === b.id
                          ? "bg-surface shadow-card ring-2 ring-brand font-semibold"
                          : "bg-surface/50 hover:bg-surface border-hairline"
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Hero Interactive Scanner Viewport */}
            {labState === "idle" && (
              <ImageDropzone
                onFileSelect={handleImageAcquired}
                onLaunchCamera={() => setLabState("capturing")}
                denialReason={cameraDenialReason}
              />
            )}

            {labState === "capturing" && (
              <CameraCapture
                onCapture={handleImageAcquired}
                onFallbackToUpload={(reason) => {
                  setCameraDenialReason(reason);
                  setLabState("idle");
                }}
                onCancel={() => setLabState("idle")}
              />
            )}

            {labState === "preview" && previewUrl && (
              <div className="flex flex-col gap-4">
                <div className="relative overflow-hidden rounded-card bg-ink h-72 w-full flex items-center justify-center">
                  <img
                    src={previewUrl}
                    alt="Captured waste item preview"
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <Button variant="secondary" onClick={handleRetake}>
                    Retake / Change
                  </Button>
                  <Button
                    variant="primary"
                    icon={Sparkles}
                    onClick={() => handleAnalyse(false)}
                    disabled={
                      cooldown ||
                      (wasteMode === "bin_check" && chosenBin === null)
                    }
                  >
                    {wasteMode === "bin_check" && chosenBin === null
                      ? "Select a bin first"
                      : "Analyse Item"}
                  </Button>
                </div>
              </div>
            )}

            {labState === "analysing" && (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                <div className="h-12 w-12 rounded-full border-4 border-brand/20 border-t-brand animate-spin" />
                <div>
                  <h3 className="text-body font-semibold text-ink">
                    Looking at your item...
                  </h3>
                  <p className="mt-1 text-caption text-ink-secondary">
                    Running multimodal classification ladder (Groq &rarr; Gemini &rarr; Sample)
                  </p>
                </div>

                {/* Offer sample mode button after 8 seconds of latency */}
                {analysingSeconds >= 8 && (
                  <div className="mt-4 flex flex-col items-center gap-2 rounded-control bg-canvas p-4 border border-hairline">
                    <p className="text-caption text-ink-secondary">
                      Cloud vision is taking longer than usual.
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAnalyse(true)}
                    >
                      Switch to instant sample mode
                    </Button>
                  </div>
                )}
              </div>
            )}

            {labState === "result" && result && (
              <div className="flex flex-col gap-4">
                <ResultCard
                  classification={result.classification}
                  provider={result.provider}
                  mode={wasteMode}
                  chosenBin={chosenBin}
                  cached={result.cached}
                />
                <Button variant="secondary" onClick={handleRetake}>
                  Scan Another Item
                </Button>
              </div>
            )}

            {labState === "low_confidence" && result && (
              <div className="flex flex-col gap-4 rounded-control border border-sev-amber/30 bg-sev-amber/[0.04] p-5">
                <div className="flex items-center gap-2 text-sev-amber">
                  <HelpCircle className="h-5 w-5" />
                  <h3 className="text-body font-semibold text-ink">
                    Not quite sure ({Math.round(result.classification.confidence * 100)}% confidence)
                  </h3>
                </div>
                <p className="text-caption text-ink-secondary">
                  Vision model was uncertain. Which category does this item belong to? Your correction will be logged.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {WASTE_CATEGORIES.map((cat) => {
                    const meta = CATEGORY_TABLE[cat];
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleUserCorrection(cat)}
                        className="p-2.5 rounded-control border border-hairline bg-surface hover:border-brand text-left transition-colors"
                      >
                        <span className="text-caption font-semibold text-ink block truncate">
                          {meta.name.split("/")[0]}
                        </span>
                        <span className="text-[11px] text-ink-tertiary">
                          {meta.binName.split(" ")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {labState === "no_item" && (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                <AlertTriangle className="h-10 w-10 text-ink-tertiary" />
                <h3 className="text-body font-semibold text-ink">
                  No waste item detected
                </h3>
                <p className="text-caption text-ink-secondary max-w-sm">
                  We could not clearly detect a waste or recyclable object in this image. Please ensure the item is well-lit and centered.
                </p>
                <Button variant="secondary" onClick={handleRetake} className="mt-2">
                  Try Again
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Right 5-Cols: ScanHistory, Leaderboard, Mess Story Card */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <ScanHistory />
          <Leaderboard />
          <MessStoryCard />
        </div>
      </div>
    </div>
  );
}
