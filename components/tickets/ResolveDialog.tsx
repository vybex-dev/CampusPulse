"use client";

import { useId, useState, useEffect, useRef } from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ResolveDialogProps {
  open: boolean;
  ticketId: number;
  ticketTitle: string;
  onClose: () => void;
  onConfirm: (note: string) => Promise<void>;
  loading?: boolean;
}

export function ResolveDialog({
  open,
  ticketId,
  ticketTitle,
  onClose,
  onConfirm,
  loading = false,
}: ResolveDialogProps) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const noteId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setError(null);
        setNote("");
        onClose();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = note.trim();
    if (!trimmed) {
      setError("Please provide an explanation of the fix before resolving.");
      return;
    }
    setError(null);
    try {
      await onConfirm(trimmed);
      setNote("");
      onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to resolve ticket");
    }
  };

  const handleCancel = () => {
    setError(null);
    setNote("");
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="resolve-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/20 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg rounded-card bg-surface p-card shadow-drawer border border-hairline"
      >
        <div className="flex items-center justify-between pb-4 border-b border-hairline">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-control bg-sev-green/10 text-sev-green">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <h2 id="resolve-dialog-title" className="text-section font-semibold">
              Mark Ticket #{ticketId} Resolved
            </h2>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-control p-1 text-ink-secondary hover:text-ink hover:bg-canvas transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 text-body text-ink-secondary">
          Document the action taken for <strong className="text-ink">{ticketTitle}</strong>. This note will be recorded in the immutable audit log and marks the simulated fault fixed.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div>
            <label
              htmlFor={noteId}
              className="block text-caption font-medium text-ink mb-1.5"
            >
              Resolution note <span className="text-sev-red">*</span>
            </label>
            <textarea
              id={noteId}
              rows={4}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (error && e.target.value.trim()) setError(null);
              }}
              placeholder="e.g. Turned off master switch in Room A-204; inspected HVAC timer relay."
              className="w-full rounded-control border border-hairline bg-canvas p-3 text-body text-ink placeholder:text-ink-tertiary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand resize-none"
              autoFocus
            />
            {error && (
              <p className="mt-1.5 flex items-center gap-1.5 text-caption text-sev-red font-medium">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              icon={CheckCircle2}
            >
              Confirm Resolution
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
