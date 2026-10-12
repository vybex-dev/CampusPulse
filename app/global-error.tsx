"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/ErrorState";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-canvas font-sans antialiased">
        <div className="flex min-h-screen items-center justify-center px-6 py-12">
          <ErrorState
            title="Application error"
            message={
              error.message ||
              "An unexpected error occurred. No data has been lost — please retry to restore the view."
            }
            onRetry={reset}
          />
        </div>
      </body>
    </html>
  );
}
