import type { ReactNode } from "react";
import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-pill bg-canvas text-ink-secondary">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-section">{title}</h2>
        {description && (
          <p className="text-body text-ink-secondary">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
