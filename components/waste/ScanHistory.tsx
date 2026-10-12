"use client";

import { useQuery } from "@tanstack/react-query";
import { History, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { WasteLog } from "@/lib/contract";
import { CATEGORY_TABLE } from "@/lib/categories";
import { Skeleton } from "@/components/ui/Skeleton";

export function ScanHistory() {
  const { data, isLoading } = useQuery<{ logs: WasteLog[] }>({
    queryKey: ["waste", "history", 10],
    queryFn: async () => {
      return await apiFetch<{ logs: WasteLog[] }>("/api/waste/history?limit=10");
    },
    refetchInterval: 10000,
  });

  const logs = data?.logs ?? [];

  return (
    <div className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-card shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-ink-secondary" />
          <h3 className="text-body font-semibold text-ink">Recent Scans</h3>
        </div>
        <span className="text-caption text-ink-secondary">Last 10</span>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-14 w-full rounded-control" />
          <Skeleton className="h-14 w-full rounded-control" />
          <Skeleton className="h-14 w-full rounded-control" />
        </div>
      ) : logs.length === 0 ? (
        <div className="py-8 text-center text-caption text-ink-tertiary border border-dashed border-hairline rounded-control">
          No scans recorded yet
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {logs.map((log) => {
            const meta = CATEGORY_TABLE[log.category] ?? CATEGORY_TABLE.other_residual;
            return (
              <div
                key={log.id}
                className="flex items-center gap-3 rounded-control border border-hairline bg-canvas/50 p-2.5 transition-colors hover:bg-canvas"
              >
                {/* 160px Max Thumbnail with Alt Text */}
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-control bg-ink/5 border border-hairline">
                  {log.thumb ? (
                    <img
                      src={log.thumb}
                      alt={`Photograph thumbnail of ${log.item_name}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-caption font-mono text-ink-tertiary">
                      IMG
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="truncate text-caption font-semibold text-ink">
                      {log.item_name}
                    </h4>
                    <span className="font-mono text-caption text-ink-tertiary shrink-0">
                      {log.ts.slice(11, 16)}
                    </span>
                  </div>

                  <div className="mt-0.5 flex items-center justify-between gap-2 text-caption text-ink-secondary">
                    <span className="truncate">{log.block_id} &bull; {meta.binName.split(" ")[0]}</span>
                    {log.mode === "bin_check" && (
                      <span className="flex items-center gap-0.5 shrink-0">
                        {log.is_correct ? (
                          <CheckCircle2 className="h-3 w-3 text-sev-green" />
                        ) : (
                          <XCircle className="h-3 w-3 text-sev-red" />
                        )}
                        <span className="font-medium">
                          {log.is_correct ? "+10 pts" : "0"}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
