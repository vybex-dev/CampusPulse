"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onFallbackToUpload: (reason: string) => void;
  onCancel: () => void;
}

export function CameraCapture({
  onCapture,
  onFallbackToUpload,
  onCancel,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isStarting, setIsStarting] = useState(true);

  useEffect(() => {
    let active = true;

    async function initCamera() {
      setIsStarting(true);
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera API not supported on this device/browser");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!active) {
          // If unmounted before stream opened, clean up immediately
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setHasPermission(true);
      } catch (err: unknown) {
        if (!active) return;
        const msg = (err as Error)?.message || "Camera permission denied or camera unavailable";
        setHasPermission(false);
        onFallbackToUpload(msg);
      } finally {
        if (active) setIsStarting(false);
      }
    }

    void initCamera();

    // Clean up: stop all tracks on unmount
    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [onFallbackToUpload]);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCapture(blob);
        }
      },
      "image/jpeg",
      0.9,
    );
  };

  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-card bg-ink text-surface min-h-[380px] w-full">
      {/* Live Video Feed */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="h-full max-h-[440px] w-full object-cover rounded-card"
      />

      {/* Camera Guidance Overlay */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-6">
        <div className="h-56 w-56 rounded-card border-2 border-dashed border-surface/50 shadow-sm" />
        <span className="mt-3 rounded-pill bg-ink/70 px-3 py-1 text-caption text-surface backdrop-blur-sm">
          Align item inside viewfinder
        </span>
      </div>

      {/* Top Bar Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-pill bg-ink/60 p-2 text-surface hover:bg-ink transition-colors backdrop-blur-sm"
          aria-label="Cancel camera"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Bottom Shutter Action Bar */}
      <div className="absolute bottom-6 inset-x-0 flex items-center justify-center gap-4 z-10 px-6">
        <Button
          variant="primary"
          size="md"
          icon={Camera}
          onClick={handleCapture}
          className="shadow-drawer px-6 h-12"
          disabled={isStarting}
        >
          Capture Photo
        </Button>
      </div>
    </div>
  );
}
