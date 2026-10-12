"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiFetch } from "@/lib/api";
import type { DemoState } from "@/lib/contract";
import { formatSimClock } from "@/lib/format";

export function SimClock() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["demo", "state"],
    queryFn: () => apiFetch<DemoState>("/api/demo/state"),
  });

  return (
    <div
      className="flex items-center gap-2 text-body tabular-nums text-ink-secondary"
      title="Simulated date and time"
    >
      <Clock className="h-4 w-4" aria-hidden="true" />
      {isLoading ? (
        <Skeleton className="h-5 w-28" />
      ) : isError || !data ? (
        <span>Clock unavailable</span>
      ) : (
        <span>{formatSimClock(data.clock)}</span>
      )}
    </div>
  );
}
