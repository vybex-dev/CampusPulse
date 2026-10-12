"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface SegmentedProps<T extends string | number> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: "sm" | "md";
  className?: string;
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  size = "md",
  className,
}: SegmentedProps<T>) {
  const indicatorId = useId();
  const reduce = useReducedMotion();

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "relative inline-flex rounded-pill bg-ink/[0.06] p-1",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative inline-flex items-center justify-center rounded-pill font-medium transition-colors duration-200",
              size === "sm" ? "h-7 px-3 text-caption" : "h-8 px-4 text-body",
              active ? "text-ink" : "text-ink-secondary hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId={indicatorId}
                aria-hidden="true"
                className="absolute inset-0 rounded-pill bg-surface shadow-card"
                transition={{ duration: reduce ? 0 : 0.2, ease: "easeOut" }}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
