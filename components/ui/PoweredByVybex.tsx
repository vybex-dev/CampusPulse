/**
 * "Powered by VYBEX" tag. The animated gradient lives in app/globals.css
 * (.pbv-wordmark) because the Tailwind palette is intentionally locked.
 */
export function PoweredByVybex({ className = "" }: { className?: string }) {
  return (
    <a
      href="https://vybex-dev.vercel.app"
      target="_blank"
      rel="noopener noreferrer"
      className={`whitespace-nowrap text-caption text-ink-tertiary transition-colors hover:text-ink-secondary ${className}`}
    >
      Powered by <span className="pbv-wordmark font-bold tracking-[0.01em]">VYBEX</span>
    </a>
  );
}
