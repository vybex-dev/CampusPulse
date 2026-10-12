"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/Toast";
import {
  useSettings,
  useUpdateSettings,
  useResetSettings,
  useImportElectricityCsv,
} from "@/lib/api";
import type { Settings } from "@/lib/contract";
import {
  Sliders,
  RotateCcw,
  Save,
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Zap,
  Recycle,
  Copy,
  Check,
} from "lucide-react";

export default function SettingsPage() {
  const { data: serverSettings, isLoading, isError, refetch } = useSettings();
  const updateSettingsMutation = useUpdateSettings();
  const resetSettingsMutation = useResetSettings();
  const importCsvMutation = useImportElectricityCsv();
  const toast = useToast();

  // Local form state
  const [formData, setFormData] = useState<Settings | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null);
  const [copiedSample, setCopiedSample] = useState(false);

  useEffect(() => {
    if (serverSettings) {
      setFormData(serverSettings);
    }
  }, [serverSettings]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 pb-16">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !formData) {
    return (
      <ErrorState
        title="Unable to load settings"
        message="Could not read system configuration. Please check connection and try again."
        onRetry={() => void refetch()}
      />
    );
  }

  const handleFieldChange = (key: keyof Settings, value: unknown) => {
    setFormData((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleThresholdChange = (key: string, value: number) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            thresholds: {
              ...prev.thresholds,
              [key]: value,
            },
          }
        : prev,
    );
  };

  const handleBinChange = (
    binKey: "green" | "blue" | "red" | "black",
    field: "name" | "colour",
    val: string,
  ) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            bins: {
              ...prev.bins,
              [binKey]: {
                ...prev.bins[binKey],
                [field]: val,
              },
            },
          }
        : prev,
    );
  };

  const handleSaveSettings = async () => {
    if (!formData) return;
    try {
      await updateSettingsMutation.mutateAsync(formData);
      toast("Settings saved successfully. Campus analytics recomputed.", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save settings";
      toast(msg, "error");
    }
  };

  const handleRestoreDefaults = async () => {
    if (
      !confirm(
        "Are you sure you want to reset all rates, thresholds, and bin colors to their factory defaults?",
      )
    ) {
      return;
    }
    try {
      const res = await resetSettingsMutation.mutateAsync();
      setFormData(res);
      toast("Default settings restored and all analytics recomputed.", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reset settings";
      toast(msg, "error");
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) return;
    setCsvError(null);
    setCsvSuccess(null);

    try {
      const res = await importCsvMutation.mutateAsync(csvFile);
      setCsvSuccess(res.message);
      setCsvFile(null);
      toast(res.message, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to import CSV";
      setCsvError(msg);
      toast(msg, "error");
    }
  };

  const sampleCsvContent = `meter_id,ts,value\nE-A-204,2026-10-12T14:00,1.25\nE-A-204,2026-10-12T15:00,1.40\nE-A-L3,2026-10-12T14:00,2.10`;

  const copySampleCsv = () => {
    void navigator.clipboard.writeText(sampleCsvContent);
    setCopiedSample(true);
    setTimeout(() => setCopiedSample(false), 2000);
  };

  return (
    <div className="flex flex-col gap-10 pb-16">
      {/* 1. Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-hairline pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-title font-semibold tracking-tight text-ink">
              System Settings & Data Import
            </h1>
            <span className="rounded-pill border border-hairline bg-surface px-2.5 py-0.5 text-caption font-medium text-ink-secondary">
              Simulated data
            </span>
          </div>
          <p className="mt-1 text-body text-ink-secondary">
            Manage tariffs, carbon factors, anomaly trigger thresholds, waste bin configurations, and upload readings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            icon={RotateCcw}
            onClick={handleRestoreDefaults}
            disabled={resetSettingsMutation.isPending}
          >
            Restore Defaults
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Save}
            onClick={handleSaveSettings}
            disabled={updateSettingsMutation.isPending}
          >
            {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* 2. Tariffs & Emission Factors */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-accent-electricity" />
          <h2 className="text-section font-semibold text-ink">
            Utility Rates & Emission Factors
          </h2>
        </div>

        <Card className="grid grid-cols-1 gap-6 p-card sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-caption font-medium text-ink-secondary">
              Electricity Tariff (₹/kWh)
            </label>
            <input
              type="number"
              step="0.5"
              min="0.1"
              value={formData.tariff_inr_per_kwh}
              onChange={(e) =>
                handleFieldChange("tariff_inr_per_kwh", parseFloat(e.target.value) || 0)
              }
              className="mt-1 w-full rounded-control border border-hairline bg-canvas px-3 py-2 text-body font-medium text-ink focus:border-brand focus:outline-none"
            />
            <span className="mt-1 block text-caption text-ink-secondary">Default: ₹8.00/kWh</span>
          </div>

          <div>
            <label className="text-caption font-medium text-ink-secondary">
              Water Tariff (₹/kL)
            </label>
            <input
              type="number"
              step="1"
              min="0.1"
              value={formData.water_inr_per_kl}
              onChange={(e) =>
                handleFieldChange("water_inr_per_kl", parseFloat(e.target.value) || 0)
              }
              className="mt-1 w-full rounded-control border border-hairline bg-canvas px-3 py-2 text-body font-medium text-ink focus:border-brand focus:outline-none"
            />
            <span className="mt-1 block text-caption text-ink-secondary">Default: ₹20.00/kL</span>
          </div>

          <div>
            <label className="text-caption font-medium text-ink-secondary">
              Grid Emission Factor (kg CO2e/kWh)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.ef_grid_kg_per_kwh}
              onChange={(e) =>
                handleFieldChange("ef_grid_kg_per_kwh", parseFloat(e.target.value) || 0)
              }
              className="mt-1 w-full rounded-control border border-hairline bg-canvas px-3 py-2 text-body font-medium text-ink focus:border-brand focus:outline-none"
            />
            <span className="mt-1 block text-caption text-ink-secondary">Default: 0.72 kg/kWh (CEA)</span>
          </div>

          <div>
            <label className="text-caption font-medium text-ink-secondary">
              Water Emission Factor (kg CO2e/kL)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.ef_water_kg_per_kl}
              onChange={(e) =>
                handleFieldChange("ef_water_kg_per_kl", parseFloat(e.target.value) || 0)
              }
              className="mt-1 w-full rounded-control border border-hairline bg-canvas px-3 py-2 text-body font-medium text-ink focus:border-brand focus:outline-none"
            />
            <span className="mt-1 block text-caption text-ink-secondary">Default: 0.30 kg/kL</span>
          </div>
        </Card>
      </section>

      {/* 3. Operational Thresholds */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Sliders className="h-5 w-5 text-brand" />
          <h2 className="text-section font-semibold text-ink">
            Score & Priority Ceilings
          </h2>
        </div>

        <Card className="grid grid-cols-1 gap-6 p-card sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="text-caption font-medium text-ink-secondary">
              Electricity Score Ceiling (a_E max)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="1"
              value={formData.score_ceiling_electricity}
              onChange={(e) =>
                handleFieldChange("score_ceiling_electricity", parseFloat(e.target.value) || 0.1)
              }
              className="mt-1 w-full rounded-control border border-hairline bg-canvas px-3 py-2 text-body font-medium text-ink focus:border-brand focus:outline-none"
            />
            <span className="mt-1 block text-caption text-ink-secondary">Default: 0.10 (10% avoidable waste = 0 pts)</span>
          </div>

          <div>
            <label className="text-caption font-medium text-ink-secondary">
              Water Score Ceiling (a_W max)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="1"
              value={formData.score_ceiling_water}
              onChange={(e) =>
                handleFieldChange("score_ceiling_water", parseFloat(e.target.value) || 0.2)
              }
              className="mt-1 w-full rounded-control border border-hairline bg-canvas px-3 py-2 text-body font-medium text-ink focus:border-brand focus:outline-none"
            />
            <span className="mt-1 block text-caption text-ink-secondary">Default: 0.20 (20% avoidable leak = 0 pts)</span>
          </div>

          <div>
            <label className="text-caption font-medium text-ink-secondary">
              Fix Effectiveness Factor (η)
            </label>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={formData.fix_effectiveness}
              onChange={(e) =>
                handleFieldChange("fix_effectiveness", parseFloat(e.target.value) || 0.85)
              }
              className="mt-1 w-full rounded-control border border-hairline bg-canvas px-3 py-2 text-body font-medium text-ink focus:border-brand focus:outline-none"
            />
            <span className="mt-1 block text-caption text-ink-secondary">Default: 0.85 (85% recovery on fix)</span>
          </div>

          <div>
            <label className="text-caption font-medium text-ink-secondary">
              High Priority Threshold (₹/day)
            </label>
            <input
              type="number"
              step="10"
              min="1"
              value={formData.priority_high_inr_per_day}
              onChange={(e) =>
                handleFieldChange("priority_high_inr_per_day", parseFloat(e.target.value) || 250)
              }
              className="mt-1 w-full rounded-control border border-hairline bg-canvas px-3 py-2 text-body font-medium text-ink focus:border-brand focus:outline-none"
            />
            <span className="mt-1 block text-caption text-ink-secondary">Default: ₹250/day</span>
          </div>

          <div>
            <label className="text-caption font-medium text-ink-secondary">
              Medium Priority Threshold (₹/day)
            </label>
            <input
              type="number"
              step="10"
              min="1"
              value={formData.priority_medium_inr_per_day}
              onChange={(e) =>
                handleFieldChange("priority_medium_inr_per_day", parseFloat(e.target.value) || 50)
              }
              className="mt-1 w-full rounded-control border border-hairline bg-canvas px-3 py-2 text-body font-medium text-ink focus:border-brand focus:outline-none"
            />
            <span className="mt-1 block text-caption text-ink-secondary">Default: ₹50/day</span>
          </div>

          <div>
            <label className="text-caption font-medium text-ink-secondary">
              Elec Unscheduled Trigger (kW)
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={formData.thresholds.elec_min_excess_kw}
              onChange={(e) =>
                handleThresholdChange("elec_min_excess_kw", parseFloat(e.target.value) || 0.4)
              }
              className="mt-1 w-full rounded-control border border-hairline bg-canvas px-3 py-2 text-body font-medium text-ink focus:border-brand focus:outline-none"
            />
            <span className="mt-1 block text-caption text-ink-secondary">Default: 0.4 kW excess</span>
          </div>
        </Card>
      </section>

      {/* 4. Bin Names & Colours */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Recycle className="h-5 w-5 text-accent-waste" />
          <h2 className="text-section font-semibold text-ink">
            Waste Bin Classifications & Colors
          </h2>
        </div>

        <Card className="grid grid-cols-1 gap-6 p-card sm:grid-cols-2 lg:grid-cols-4">
          {(["green", "blue", "red", "black"] as const).map((binKey) => {
            const b = formData.bins[binKey];
            return (
              <div key={binKey} className="flex flex-col gap-2 rounded-control border border-hairline p-4">
                <div className="flex items-center justify-between">
                  <span className="text-caption font-semibold uppercase text-ink-secondary">
                    {binKey} Bin
                  </span>
                  <div
                    className="h-5 w-5 rounded-pill border border-hairline"
                    style={{ backgroundColor: b.colour }}
                  />
                </div>

                <div className="mt-2">
                  <label className="text-caption text-ink-secondary">Label / Name</label>
                  <input
                    type="text"
                    value={b.name}
                    onChange={(e) => handleBinChange(binKey, "name", e.target.value)}
                    className="mt-1 w-full rounded-control border border-hairline bg-canvas px-3 py-1.5 text-caption font-medium text-ink focus:border-brand focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-caption text-ink-secondary">Hex Colour</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={b.colour}
                      onChange={(e) => handleBinChange(binKey, "colour", e.target.value)}
                      className="h-8 w-10 cursor-pointer rounded-control border-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={b.colour}
                      onChange={(e) => handleBinChange(binKey, "colour", e.target.value)}
                      className="w-full rounded-control border border-hairline bg-canvas px-2 py-1 text-caption font-mono uppercase text-ink focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </Card>
      </section>

      {/* 5. CSV Readings Import */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-brand" />
            <h2 className="text-section font-semibold text-ink">
              Electricity Meter CSV Import
            </h2>
          </div>
          <span className="text-caption text-ink-secondary">
            Columns: meter_id, ts, value
          </span>
        </div>

        <Card className="flex flex-col gap-6 p-card">
          <div className="flex flex-col gap-2">
            <p className="text-body text-ink-secondary">
              Upload hourly or sub-hourly readings for any registered electricity meter (e.g., E-A-204, E-A-L3, E-B-101, E-LIB-MAIN).
              The simulator will validate column headers, meter existence, timestamp formats, and numeric bounds.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                icon={copiedSample ? Check : Copy}
                onClick={copySampleCsv}
              >
                {copiedSample ? "Sample Copied!" : "Copy Sample CSV Header"}
              </Button>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div className="flex flex-col items-center justify-center rounded-card border-2 border-dashed border-hairline bg-canvas p-8 text-center transition-colors hover:border-brand/40">
            <FileSpreadsheet className="h-10 w-10 text-brand" />
            <label className="mt-3 cursor-pointer">
              <span className="text-body font-semibold text-brand hover:underline">
                {csvFile ? csvFile.name : "Click to select a CSV file"}
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setCsvFile(e.target.files[0]);
                    setCsvError(null);
                    setCsvSuccess(null);
                  }
                }}
                className="hidden"
              />
            </label>
            <span className="mt-1 text-caption text-ink-secondary">
              or drag and drop your .csv file here
            </span>

            {csvFile && (
              <div className="mt-4 flex items-center gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCsvUpload}
                  disabled={importCsvMutation.isPending}
                >
                  {importCsvMutation.isPending ? "Validating & Importing..." : "Validate & Import"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Trash2}
                  onClick={() => setCsvFile(null)}
                >
                  Remove
                </Button>
              </div>
            )}
          </div>

          {/* Error Callout */}
          {csvError && (
            <div className="flex items-start gap-3 rounded-control border border-red-200 bg-red-50 p-4 text-caption text-red-900">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
              <div>
                <span className="font-semibold">CSV Validation Error:</span>
                <p className="mt-0.5">{csvError}</p>
              </div>
            </div>
          )}

          {/* Success Callout */}
          {csvSuccess && (
            <div className="flex items-start gap-3 rounded-control border border-emerald-200 bg-emerald-50 p-4 text-caption text-emerald-900">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <span className="font-semibold">Import Complete:</span>
                <p className="mt-0.5">{csvSuccess}</p>
              </div>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
