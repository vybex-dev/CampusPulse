"use client";

import { AlertCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "We could not load this. Check your connection and try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-4 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-pill bg-canvas text-ink">
        <AlertCircle className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-section">{title}</h2>
        <p className="text-body text-ink-secondary">{message}</p>
      </div>
      {onRetry && (
        <Button icon={RotateCcw} onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
