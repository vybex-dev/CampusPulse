"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/ErrorState";

export default function ElectricityError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Electricity route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] items-center justify-center py-12">
      <ErrorState
        title="Failed to load electricity load series"
        message={error.message || "Could not retrieve meter telemetry for this room. Please retry."}
        onRetry={reset}
      />
    </div>
  );
}
