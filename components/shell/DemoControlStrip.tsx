"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FastForward, Film, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { apiFetch } from "@/lib/api";
import type { DemoState } from "@/lib/contract";
import { useUIStore } from "@/lib/store";

type Action = { type: "ff"; days: 1 | 7 } | { type: "reset" };

export function DemoControlStrip() {
  const role = useUIStore((s) => s.role);
  const queryClient = useQueryClient();
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: (action: Action) =>
      action.type === "reset"
        ? apiFetch<DemoState>("/api/demo/reset", { method: "POST" })
        : apiFetch<DemoState>("/api/demo/fastforward", {
            method: "POST",
            body: JSON.stringify({ days: action.days }),
          }),
    onSuccess: (_data, action) => {
      void queryClient.invalidateQueries();
      toast(
        action.type === "reset"
          ? "Demo reset to its starting state"
          : `Simulated clock moved forward ${action.days} day${action.days > 1 ? "s" : ""}`,
        "success",
      );
    },
    onError: (error) =>
      toast(
        error instanceof Error ? error.message : "Demo action failed",
        "error",
      ),
  });

  if (role !== "admin") return null;
  const busy = mutation.isPending;

  return (
    <section
      aria-label="Demo controls"
      className="flex flex-wrap items-center justify-between gap-4 rounded-control border border-hairline bg-surface px-4 py-3"
    >
      <div className="flex items-center gap-2 text-caption text-ink-secondary">
        <Film className="h-4 w-4" aria-hidden="true" />
        Demo controls &middot; Admin only
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          icon={FastForward}
          disabled={busy}
          onClick={() => mutation.mutate({ type: "ff", days: 1 })}
        >
          +1 day
        </Button>
        <Button
          size="sm"
          icon={FastForward}
          disabled={busy}
          onClick={() => mutation.mutate({ type: "ff", days: 7 })}
        >
          +7 days
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon={RotateCcw}
          loading={busy && mutation.variables?.type === "reset"}
          disabled={busy}
          onClick={() => mutation.mutate({ type: "reset" })}
        >
          Reset
        </Button>
      </div>
    </section>
  );
}
