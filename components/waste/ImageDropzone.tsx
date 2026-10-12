"use client";

import { useState, useRef, type DragEvent } from "react";
import { UploadCloud, Image as ImageIcon, Camera, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ImageDropzoneProps {
  onFileSelect: (file: File) => void;
  onLaunchCamera: () => void;
  disabled?: boolean;
  denialReason?: string | null;
}

export function ImageDropzone({
  onFileSelect,
  onLaunchCamera,
  disabled = false,
  denialReason,
}: ImageDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onFileSelect(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {denialReason && (
        <div className="flex items-center gap-2 rounded-control bg-sev-amber/10 p-3 text-caption text-ink border border-sev-amber/20">
          <AlertCircle className="h-4 w-4 shrink-0 text-sev-amber" />
          <span>Camera notice: {denialReason}. Uploading an image instead.</span>
        </div>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-4 rounded-card border-2 border-dashed p-10 text-center transition-colors cursor-pointer ${
          isDragOver
            ? "border-brand bg-brand/[0.04]"
            : "border-hairline bg-surface hover:border-ink/20"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInputChange}
          disabled={disabled}
        />

        <div className="flex h-14 w-14 items-center justify-center rounded-control bg-canvas text-ink-secondary">
          <UploadCloud className="h-7 w-7" />
        </div>

        <div>
          <h3 className="text-body font-semibold text-ink">
            Drag & drop an item image here
          </h3>
          <p className="mt-1 text-caption text-ink-secondary">
            JPEG, PNG or WebP up to 10 MB (auto-resized on device)
          </p>
        </div>

        <div className="flex items-center gap-3 mt-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            Browse files
          </Button>

          <span className="text-caption text-ink-tertiary">or</span>

          <Button
            variant="primary"
            size="sm"
            icon={Camera}
            onClick={onLaunchCamera}
            disabled={disabled}
          >
            Open camera
          </Button>
        </div>
      </div>
    </div>
  );
}
