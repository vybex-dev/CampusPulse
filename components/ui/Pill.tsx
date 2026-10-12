import type { ReactNode } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

export type PillTone =
  | "neutral"
  | "green"
  | "amber"
  | "red"
  | "electricity"
  | "water"
  | "waste";

// Severity pills always carry an icon, and the label stays ink for 4.5:1 contrast,
// so colour never carries meaning alone.
const SEVERITY: Partial<
  Record<PillTone, { bg: string; icon: string; Icon: LucideIcon }>
> = {
  green: { bg: "bg-sev-green/10", icon: "text-sev-green", Icon: CheckCircle2 },
  amber: { bg: "bg-sev-amber/10", icon: "text-sev-amber", Icon: AlertTriangle },
  red: { bg: "bg-sev-red/10", icon: "text-sev-red", Icon: AlertOctagon },
};

const RESOURCE_DOT: Partial<Record<PillTone, string>> = {
  electricity: "bg-res-electricity",
  water: "bg-res-water",
  waste: "bg-res-waste",
};

interface PillProps {
  tone?: PillTone;
  icon?: LucideIcon;
  className?: string;
  children: ReactNode;
}

export function Pill({
  tone = "neutral",
  icon,
  className,
  children,
}: PillProps) {
  const severity = SEVERITY[tone];
  const dot = RESOURCE_DOT[tone];
  const Glyph = icon ?? severity?.Icon;

  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 text-caption font-medium text-ink",
        severity ? severity.bg : "bg-canvas",
        className,
      )}
    >
      {dot && (
        <span aria-hidden="true" className={cn("h-2 w-2 rounded-pill", dot)} />
      )}
      {Glyph && (
        <Glyph
          aria-hidden="true"
          className={cn(
            "h-3.5 w-3.5",
            severity ? severity.icon : "text-ink-secondary",
          )}
        />
      )}
      {children}
    </span>
  );
}
