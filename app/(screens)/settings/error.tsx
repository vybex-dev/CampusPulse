"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/ErrorState";

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Settings route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] items-center justify-center py-12">
      <ErrorState
        title="Unable to load settings"
        message={error.message || "Could not read system configuration. Please check connection and try again."}
        onRetry={reset}
      />
    </div>
  );
}
