"use client";

import { useQuery } from "@tanstack/react-query";
import { Trophy, Medal, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { BlockCode } from "@/lib/contract";
import { BLOCK_NAMES } from "@/lib/contract";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

interface LeaderboardEntry {
  block: BlockCode;
  checks: number;
  accuracy: number | null;
  accuracy_pct: number | null;
  points: number;
  rank: number;
}

export function Leaderboard() {
  const { data, isLoading } = useQuery<{ leaderboard: LeaderboardEntry[] }>({
    queryKey: ["waste", "summary"],
    queryFn: async () => {
      return await apiFetch<{ leaderboard: LeaderboardEntry[] }>("/api/waste/summary");
    },
    refetchInterval: 15000,
  });

  const entries = data?.leaderboard ?? [];

  return (
    <div className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-card shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-sev-amber" />
          <h3 className="text-body font-semibold text-ink">Block Leaderboard</h3>
        </div>
        <span className="text-caption text-ink-secondary">Ranked by accuracy</span>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-12 w-full rounded-control" />
          <Skeleton className="h-12 w-full rounded-control" />
          <Skeleton className="h-12 w-full rounded-control" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry, idx) => {
            const isFirst = idx === 0;
            const isSecond = idx === 1;
            const isThird = idx === 2;

            return (
              <div
                key={entry.block}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-control border p-3 transition-colors",
                  isFirst
                    ? "border-sev-amber/30 bg-sev-amber/[0.04]"
                    : "border-hairline bg-canvas/40",
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-pill text-caption font-semibold",
                      isFirst
                        ? "bg-sev-amber text-surface"
                        : isSecond
                        ? "bg-ink/20 text-ink"
                        : isThird
                        ? "bg-ink/10 text-ink-secondary"
                        : "text-ink-tertiary",
                    )}
                  >
                    {entry.rank}
                  </span>
                  <div className="min-w-0">
                    <h4 className="truncate text-caption font-semibold text-ink">
                      {BLOCK_NAMES[entry.block]}
                    </h4>
                    <span className="text-[11px] text-ink-secondary">
                      {entry.checks} checks &bull; {entry.points} pts
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-body font-semibold tabular-nums text-ink">
                    {entry.accuracy_pct !== null ? `${entry.accuracy_pct}%` : "—"}
                  </div>
                  <span className="text-[10px] text-ink-tertiary">
                    {entry.accuracy_pct !== null ? "Accuracy" : "< 10 checks"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
