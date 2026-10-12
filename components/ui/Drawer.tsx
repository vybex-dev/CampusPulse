"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "./Button";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
}: DrawerProps) {
  const reduce = useReducedMotion();
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open]);

  const transition = { duration: reduce ? 0 : 0.2, ease: "easeOut" as const };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            aria-hidden="true"
            className="fixed inset-0 z-50 bg-ink/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
            onClick={onClose}
          />
          <motion.aside
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="fixed inset-y-0 right-0 z-50 flex w-[480px] max-w-full flex-col bg-surface shadow-drawer outline-none"
            initial={{ x: 48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 48, opacity: 0 }}
            transition={transition}
          >
            <div className="flex items-center justify-between border-b border-hairline px-card py-6">
              <h2 id={titleId} className="text-section">
                {title}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                icon={X}
                aria-label="Close panel"
                onClick={onClose}
              />
            </div>
            <div className="flex-1 overflow-y-auto px-card py-6">
              {children}
            </div>
            {footer && (
              <div className="border-t border-hairline px-card py-6">
                {footer}
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
