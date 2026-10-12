"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/lib/store";
import type {
  Summary,
  Anomaly,
  Ticket,
  TicketDetail,
  Range,
  ResourceTab,
  WhatIfSnapshot,
  Report,
  ReportPeriod,
  Settings,
} from "@/lib/contract";
import type { SettingsPatch } from "@/lib/settings";
import {
  MOCK_SUMMARY,
  MOCK_ANOMALIES,
  generateMockElectricitySeries,
  generateMockWaterSeries,
  generateMockTankSeries,
  MOCK_PER_CAPITA_WATER,
  MOCK_ELECTRICITY_BLOCKS,
  type ElectricitySeriesPoint,
  type WaterSeriesPoint,
  type TankSeriesPoint,
} from "@/lib/mocks";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Client-side fetch. Sends X-Role and unwraps the shared error shape. */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-Role": useUIStore.getState().role,
      ...init.headers,
    },
  });

  if (!res.ok) {
    let code = "unknown";
    let message = res.statusText || "Request failed";
    try {
      const body = (await res.json()) as {
        error?: { code?: string; message?: string };
      };
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
    } catch {
      /* keep defaults */
    }
    throw new ApiError(res.status, code, message);
  }
  return (await res.json()) as T;
}

// ── Query Hooks ─────────────────────────────────────────────────────────────

export function useSummary(range?: Range, resource?: ResourceTab) {
  const storeRange = useUIStore((s) => s.range);
  const storeResource = useUIStore((s) => s.resourceTab);

  const currentRange = range ?? storeRange;
  const currentResource = resource ?? storeResource;

  return useQuery<Summary>({
    queryKey: ["summary", currentRange, currentResource],
    queryFn: async () => {
      try {
        return await apiFetch<Summary>(
          `/api/summary?range=${currentRange}&resource=${currentResource}`,
        );
      } catch {
        // Mock fallback filtered by resource
        const filteredWasters =
          currentResource === "all"
            ? MOCK_SUMMARY.top_wasters
            : MOCK_SUMMARY.top_wasters.filter(
                (w) => w.resource === currentResource,
              );
        return {
          ...MOCK_SUMMARY,
          range: currentRange,
          resource: currentResource,
          top_wasters: filteredWasters,
        };
      }
    },
  });
}

export function useAnomalies() {
  return useQuery<Anomaly[]>({
    queryKey: ["anomalies"],
    queryFn: async () => {
      try {
        return await apiFetch<Anomaly[]>("/api/anomalies");
      } catch {
        return MOCK_ANOMALIES;
      }
    },
  });
}

export function useAnomaly(id?: number | null) {
  return useQuery<Anomaly | null>({
    queryKey: ["anomaly", id],
    enabled: id !== null && id !== undefined,
    queryFn: async () => {
      if (!id) return null;
      try {
        return await apiFetch<Anomaly>(`/api/anomalies/${id}`);
      } catch {
        return MOCK_ANOMALIES.find((a) => a.id === id) ?? null;
      }
    },
  });
}

export function useElectricitySeries(params?: {
  meter_id?: string;
  block?: string;
  range?: number;
}) {
  const range = params?.range ?? 7;
  const meterId = params?.meter_id ?? "E-A-204";
  const block = params?.block;

  return useQuery<{
    meter_id?: string;
    block?: string;
    unit: string;
    series: ElectricitySeriesPoint[];
  }>({
    queryKey: ["electricity", "series", meterId, block, range],
    queryFn: async () => {
      const q = new URLSearchParams();
      if (params?.meter_id) q.set("meter_id", params.meter_id);
      if (params?.block) q.set("block", params.block);
      q.set("range", String(range));

      try {
        const data = await apiFetch<{
          meter_id?: string;
          block?: string;
          unit: string;
          series: { ts: string; value: number }[];
        }>(`/api/electricity/series?${q.toString()}`);

        // Merge raw points with expected band for chart rendering
        const mockModel = generateMockElectricitySeries(meterId, range);
        const merged: ElectricitySeriesPoint[] = data.series.map((item, idx) => {
          const m = mockModel[idx] ?? mockModel[mockModel.length - 1];
          const expected = m?.expectedMin ?? 0.05;
          return {
            ts: item.ts,
            hour: item.ts.slice(11, 16),
            value: item.value,
            expectedMin: m ? m.expectedMin : expected * 0.8,
            expectedMax: m ? m.expectedMax : expected * 1.2,
            isAnomaly: m ? m.isAnomaly : false,
            scheduled: m ? m.scheduled : false,
          };
        });

        return {
          meter_id: data.meter_id,
          block: data.block,
          unit: data.unit ?? "kW",
          series: merged.length > 0 ? merged : mockModel,
        };
      } catch {
        return {
          meter_id: meterId,
          block,
          unit: "kW",
          series: generateMockElectricitySeries(meterId, range),
        };
      }
    },
  });
}

export function useWaterSeries(params?: {
  meter_id?: string;
  block?: string;
  range?: number;
}) {
  const range = params?.range ?? 7;
  const block = params?.block ?? "HST-1";
  const meterId = params?.meter_id;

  return useQuery<{
    resource: string;
    unit: string;
    series: WaterSeriesPoint[];
  }>({
    queryKey: ["water", "series", meterId, block, range],
    queryFn: async () => {
      const q = new URLSearchParams();
      if (meterId) q.set("meter_id", meterId);
      if (block) q.set("block", block);
      q.set("range", String(range));

      try {
        const data = await apiFetch<{
          resource: string;
          unit: string;
          series: { ts: string; value: number }[];
        }>(`/api/water/series?${q.toString()}`);

        const mockModel = generateMockWaterSeries(block, range);
        const baseline = block === "HST-1" ? 120 : 60;
        const merged: WaterSeriesPoint[] = data.series.map((item) => {
          const hour = parseInt(item.ts.slice(11, 13), 10);
          const isNight = hour >= 2 && hour <= 4;
          return {
            ts: item.ts,
            hour: item.ts.slice(11, 16),
            value: item.value,
            baseline,
            isNightWindow: isNight,
            isLeak: isNight && item.value > baseline + 200,
          };
        });

        return {
          resource: data.resource ?? "water",
          unit: data.unit ?? "L/h",
          series: merged.length > 0 ? merged : mockModel,
        };
      } catch {
        return {
          resource: "water",
          unit: "L/h",
          series: generateMockWaterSeries(block, range),
        };
      }
    },
  });
}

export function useTankSeries(params?: {
  meter_id?: string;
  block?: string;
  range?: number;
}) {
  const range = params?.range ?? 7;
  const block = params?.block ?? "AB-B";
  const meterId = params?.meter_id ?? "T-AB-B";

  return useQuery<{
    meter_id: string;
    unit: string;
    series: TankSeriesPoint[];
  }>({
    queryKey: ["water", "tank", meterId, block, range],
    queryFn: async () => {
      try {
        const data = await apiFetch<{
          meter_id: string;
          unit: string;
          series: { ts: string; value: number }[];
        }>(`/api/water/series?meter_id=${meterId}&range=${range}`);

        const mockModel = generateMockTankSeries(block, range);
        const merged: TankSeriesPoint[] = data.series.map((item, idx) => {
          const m = mockModel[idx] ?? mockModel[mockModel.length - 1];
          return {
            ts: item.ts,
            hour: item.ts.slice(11, 16),
            levelPct: item.value,
            inflowLph: m ? m.inflowLph : 800,
            isOverflow: item.value >= 99.5,
          };
        });

        return {
          meter_id: meterId,
          unit: "%",
          series: merged.length > 0 ? merged : mockModel,
        };
      } catch {
        return {
          meter_id: meterId,
          unit: "%",
          series: generateMockTankSeries(block, range),
        };
      }
    },
  });
}

export function usePerCapitaWater() {
  return useQuery<typeof MOCK_PER_CAPITA_WATER>({
    queryKey: ["water", "percapita"],
    queryFn: async () => {
      try {
        return await apiFetch<typeof MOCK_PER_CAPITA_WATER>(
          "/api/water/percapita",
        );
      } catch {
        return MOCK_PER_CAPITA_WATER;
      }
    },
  });
}

export function useElectricityBlocks() {
  return useQuery<typeof MOCK_ELECTRICITY_BLOCKS>({
    queryKey: ["electricity", "blocks"],
    queryFn: async () => {
      try {
        return await apiFetch<typeof MOCK_ELECTRICITY_BLOCKS>(
          "/api/electricity/blocks",
        );
      } catch {
        return MOCK_ELECTRICITY_BLOCKS;
      }
    },
  });
}

export function useTickets(filter?: { status?: string; resource?: string }) {
  return useQuery<Ticket[]>({
    queryKey: ["tickets", filter?.status, filter?.resource],
    queryFn: async () => {
      const q = new URLSearchParams();
      if (filter?.status) q.set("status", filter.status);
      if (filter?.resource) q.set("resource", filter.resource);
      return await apiFetch<Ticket[]>(`/api/tickets?${q.toString()}`);
    },
  });
}

export function useTicket(id?: number | null) {
  return useQuery<TicketDetail | null>({
    queryKey: ["ticket", id],
    enabled: id !== null && id !== undefined,
    queryFn: async () => {
      if (!id) return null;
      return await apiFetch<TicketDetail>(`/api/tickets/${id}`);
    },
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (anomalyId: number) => {
      return await apiFetch<Ticket>("/api/tickets", {
        method: "POST",
        body: JSON.stringify({ anomaly_id: anomalyId }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
      void queryClient.invalidateQueries({ queryKey: ["anomalies"] });
      void queryClient.invalidateQueries({ queryKey: ["summary"] });
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      note,
    }: {
      id: number;
      status?: string;
      note?: string;
    }) => {
      return await apiFetch<TicketDetail>(`/api/tickets/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, note }),
      });
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
      void queryClient.invalidateQueries({ queryKey: ["ticket", data.id] });
      void queryClient.invalidateQueries({ queryKey: ["anomalies"] });
      void queryClient.invalidateQueries({ queryKey: ["summary"] });
    },
  });
}

export function useWhatIfSnapshot() {
  return useQuery<WhatIfSnapshot>({
    queryKey: ["whatif", "snapshot"],
    queryFn: async () => {
      return await apiFetch<WhatIfSnapshot>("/api/whatif/snapshot");
    },
  });
}

export function useImpactReport(period: ReportPeriod = "7") {
  return useQuery<Report>({
    queryKey: ["report", period],
    queryFn: async () => {
      return await apiFetch<Report>(`/api/report?period=${period}`);
    },
  });
}

export function useSettings() {
  return useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: async () => {
      return await apiFetch<Settings>("/api/settings");
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: SettingsPatch) => {
      return await apiFetch<Settings>("/api/settings", {
        method: "PUT",
        body: JSON.stringify(patch),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
      void queryClient.invalidateQueries({ queryKey: ["summary"] });
      void queryClient.invalidateQueries({ queryKey: ["anomalies"] });
      void queryClient.invalidateQueries({ queryKey: ["whatif"] });
      void queryClient.invalidateQueries({ queryKey: ["report"] });
    },
  });
}

export function useResetSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return await apiFetch<Settings>("/api/settings", {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
      void queryClient.invalidateQueries({ queryKey: ["summary"] });
      void queryClient.invalidateQueries({ queryKey: ["anomalies"] });
      void queryClient.invalidateQueries({ queryKey: ["whatif"] });
      void queryClient.invalidateQueries({ queryKey: ["report"] });
    },
  });
}

export interface ImportCsvResponse {
  success: boolean;
  imported_rows: number;
  meters: string[];
  min_ts: string;
  max_ts: string;
  message: string;
}

export function useImportElectricityCsv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fileOrText: File | string) => {
      let init: RequestInit;
      if (typeof fileOrText === "string") {
        init = {
          method: "POST",
          headers: { "Content-Type": "text/csv" },
          body: fileOrText,
        };
      } else {
        const data = new FormData();
        data.append("file", fileOrText);
        init = {
          method: "POST",
          // Let browser set multipart boundary
          headers: { "X-Role": useUIStore.getState().role },
          body: data,
        };
      }
      return await apiFetch<ImportCsvResponse>("/api/electricity/import", init);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["electricity"] });
      void queryClient.invalidateQueries({ queryKey: ["summary"] });
      void queryClient.invalidateQueries({ queryKey: ["whatif"] });
      void queryClient.invalidateQueries({ queryKey: ["report"] });
      void queryClient.invalidateQueries({ queryKey: ["anomalies"] });
    },
  });
}
