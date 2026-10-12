"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/ErrorState";

export default function WaterError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Water route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] items-center justify-center py-12">
      <ErrorState
        title="Failed to load water telemetry"
        message={error.message || "Could not retrieve real-time flow and tank data from campus sensors."}
        onRetry={reset}
      />
    </div>
  );
}
