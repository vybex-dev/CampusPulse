"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/ErrorState";

export default function TicketsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Tickets route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] items-center justify-center py-12">
      <ErrorState
        title="Could not load action tickets"
        message={error.message || "There was a problem fetching the campus ticket queue. Please try again."}
        onRetry={reset}
      />
    </div>
  );
}
