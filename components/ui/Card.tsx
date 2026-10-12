import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Remove the 32px padding (for tables, charts that bleed to the edge). */
  flush?: boolean;
}

export function Card({ flush = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-hairline bg-surface shadow-card",
        !flush && "p-card",
        className,
      )}
      {...props}
    />
  );
}
