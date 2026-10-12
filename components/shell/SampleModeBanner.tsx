"use client";

import { useQuery } from "@tanstack/react-query";
import { FlaskConical } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { Health } from "@/lib/contract";

/** Shows when the AI ladder has fallen to prepared samples. `force` is for previews. */
export function SampleModeBanner({ force = false }: { force?: boolean }) {
  const { data } = useQuery({
    queryKey: ["health"],
    queryFn: () => apiFetch<Health>("/api/health"),
    refetchInterval: 15_000,
  });

  if (!force && !data?.sample_mode) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-control border border-hairline bg-surface px-4 py-3 text-body"
    >
      <FlaskConical
        className="mt-0.5 h-5 w-5 shrink-0 text-ink-secondary"
        aria-hidden="true"
      />
      <p>
        <span className="font-medium">Results are from prepared samples.</span>{" "}
        <span className="text-ink-secondary">
          The live AI service is unavailable or sample mode is on, so scans use
          saved example items.
        </span>
      </p>
    </div>
  );
}
