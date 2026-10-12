import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-control bg-ink/[0.06] motion-safe:animate-pulse",
        className,
      )}
    />
  );
}
