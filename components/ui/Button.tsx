import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  icon?: LucideIcon;
  loading?: boolean;
}

const VARIANTS = {
  // Brand green is reserved for the primary action.
  primary: "bg-brand text-surface hover:bg-brand-hover",
  secondary: "border border-hairline bg-surface text-ink hover:bg-canvas",
  ghost: "text-ink-secondary hover:bg-ink/5 hover:text-ink",
} as const;

const SIZES = { sm: "h-9 px-4", md: "h-11 px-5" } as const;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "secondary",
      size = "md",
      icon: Icon,
      loading = false,
      className,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control text-body font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50",
          VARIANTS[variant],
          SIZES[size],
          // Icon-only buttons are square; give them an aria-label.
          !children && "aspect-square px-0",
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2
            className="h-4 w-4 motion-safe:animate-spin"
            aria-hidden="true"
          />
        ) : (
          Icon && <Icon className="h-4 w-4" aria-hidden="true" />
        )}
        {children}
      </button>
    );
  },
);
