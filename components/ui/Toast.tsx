"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export type ToastTone = "neutral" | "success" | "error";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

type ToastFn = (message: string, tone?: ToastTone) => void;

const ToastContext = createContext<ToastFn | null>(null);

export function useToast(): ToastFn {
  const fn = useContext(ToastContext);
  if (!fn) throw new Error("useToast must be used inside <ToastProvider>");
  return fn;
}

const ICONS = {
  neutral: Info,
  success: CheckCircle2,
  error: AlertCircle,
} as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const reduce = useReducedMotion();

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastFn>(
    (message, tone = "neutral") => {
      const id = nextId.current++;
      setItems((list) => [...list, { id, message, tone }]);
      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2 px-6"
      >
        <AnimatePresence>
          {items.map((t) => {
            const Icon = ICONS[t.tone];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: reduce ? 0 : 0.2, ease: "easeOut" }}
                className="pointer-events-auto flex items-center gap-3 rounded-control bg-ink px-4 py-3 text-body text-surface shadow-card"
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{t.message}</span>
                <button
                  type="button"
                  aria-label="Dismiss notification"
                  onClick={() => dismiss(t.id)}
                  className="rounded-pill p-1 text-surface/80 transition-colors duration-200 hover:text-surface"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
