"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/ErrorState";

export default function ReportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Report route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] items-center justify-center py-12">
      <ErrorState
        title="Unable to generate Impact Report"
        message={error.message || "Failed to compute campus verification audit. Please try again."}
        onRetry={reset}
      />
    </div>
  );
}
