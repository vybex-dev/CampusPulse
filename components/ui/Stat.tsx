"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import type { Tag } from "@/lib/contract";
import { cn } from "@/lib/cn";
import { Skeleton } from "./Skeleton";
import { TagPill } from "./TagPill";

interface StatProps {
  label: string;
  value: number | null;
  unit?: string;
  prefix?: string;
  decimals?: number;
  tag?: Tag;
  loading?: boolean;
  className?: string;
}

function CountUp({ value, decimals }: { value: number; decimals: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    if (reduce) {
      current.current = value;
      setShown(value);
      return;
    }
    const controls = animate(current.current, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (v) => {
        current.current = v;
        setShown(v);
      },
    });
    return () => controls.stop();
  }, [value, reduce]);

  return (
    <>
      {shown.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </>
  );
}

/** Large numeral + unit + tag. Three font sizes: caption, display, body. */
export function Stat({
  label,
  value,
  unit,
  prefix,
  decimals = 0,
  tag,
  loading = false,
  className,
}: StatProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-caption text-ink-secondary">{label}</span>
        {tag && <TagPill tag={tag} />}
      </div>
      {loading ? (
        <Skeleton className="h-16 w-44" />
      ) : (
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-display tabular-nums">
            {value === null ? (
              <span className="text-ink-secondary">&mdash;</span>
            ) : (
              <>
                {prefix}
                <CountUp value={value} decimals={decimals} />
              </>
            )}
          </span>
          {unit && <span className="text-body text-ink-secondary">{unit}</span>}
        </div>
      )}
    </div>
  );
}
