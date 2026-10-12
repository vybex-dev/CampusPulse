import {
  BadgeCheck,
  Calculator,
  Ruler,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { Tag } from "@/lib/contract";
import { cn } from "@/lib/cn";

// Four visually distinct treatments (fill, outline, tint, dashed) plus an icon and a word,
// so the tag is readable without colour.
const TAGS: Record<
  Tag,
  { label: string; Icon: LucideIcon; cls: string; help: string }
> = {
  verified: {
    label: "Verified",
    Icon: BadgeCheck,
    cls: "bg-ink text-surface",
    help: "Measured after a fix, against what the fault would have used.",
  },
  measured: {
    label: "Measured",
    Icon: Ruler,
    cls: "border border-ink bg-surface text-ink",
    help: "Counted directly from logged data.",
  },
  estimated: {
    label: "Estimated",
    Icon: Calculator,
    cls: "border border-hairline bg-canvas text-ink",
    help: "Calculated from flagged usage and the rates in Settings.",
  },
  projected: {
    label: "Projected",
    Icon: TrendingUp,
    cls: "border border-dashed border-ink-secondary bg-transparent text-ink-secondary",
    help: "A what-if forecast, not a measurement.",
  },
};

export function TagPill({ tag, className }: { tag: Tag; className?: string }) {
  const { label, Icon, cls, help } = TAGS[tag];
  return (
    <span
      title={help}
      className={cn(
        "inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-pill px-2.5 text-caption font-medium",
        cls,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}
