"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/ErrorState";

export default function ScreensError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Screen error caught by route boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] items-center justify-center py-12">
      <ErrorState
        title="Unable to load this section"
        message={error.message || "A client rendering error occurred. Please retry to restore view."}
        onRetry={reset}
      />
    </div>
  );
}
