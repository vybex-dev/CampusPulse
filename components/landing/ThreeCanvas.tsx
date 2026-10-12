"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { SceneFactory } from "./scenes/common";

export type SceneId = "campus" | "electricity" | "water" | "waste" | "loop";

// Scene modules (and three.js itself) load lazily, only when a canvas mounts.
const LOADERS: Record<SceneId, () => Promise<{ create: SceneFactory }>> = {
  campus: () => import("./scenes/campus"),
  electricity: () => import("./scenes/electricity"),
  water: () => import("./scenes/water"),
  waste: () => import("./scenes/waste"),
  loop: () => import("./scenes/loop"),
};

const REF_ASPECT = 1.45;

interface Props {
  scene: SceneId;
  label: string;
  className?: string;
  /** Camera distance / field of view tweaks per placement. */
  fov?: number;
}

export function ThreeCanvas({ scene, label, className, fov = 32 }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let raf = 0;
    let cleanup: (() => void) | undefined;

    (async () => {
      const THREE = await import("three");
      const mod = await LOADERS[scene]();
      if (disposed) return;

      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        });
      } catch {
        setFailed(true);
        return;
      }

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.setClearColor(0x000000, 0);
      const el = renderer.domElement;
      el.style.cssText = "display:block;width:100%;height:100%;";
      host.appendChild(el);

      const three = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
      const instance = mod.create({
        scene: three,
        camera,
        renderer,
        reducedMotion,
      });

      const resize = () => {
        const w = host.clientWidth || 1;
        const h = host.clientHeight || 1;
        renderer.setSize(w, h, false);
        const aspect = w / h;
        camera.aspect = aspect;
        // Scenes are composed for ~1.45:1. On narrower stages widen the vertical
        // field of view so the full model (and its labels) always fits.
        camera.fov =
          aspect >= REF_ASPECT
            ? fov
            : (2 *
                Math.atan((Math.tan((fov * Math.PI) / 360) * REF_ASPECT) / aspect) *
                180) /
              Math.PI;
        camera.updateProjectionMatrix();
        if (reducedMotion) renderer.render(three, camera);
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(host);

      const pointer = { x: 0, y: 0 };
      const target = { x: 0, y: 0 };
      const onMove = (e: PointerEvent) => {
        const r = host.getBoundingClientRect();
        target.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        target.y = ((e.clientY - r.top) / r.height) * 2 - 1;
      };
      const onLeave = () => {
        target.x = 0;
        target.y = 0;
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      host.addEventListener("pointerleave", onLeave);

      let visible = true;
      const io = new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
        },
        { rootMargin: "120px" },
      );
      io.observe(host);

      const clock = new THREE.Clock();
      let t = reducedMotion ? 4 : 0;
      let first = true;
      const frame = () => {
        raf = requestAnimationFrame(frame);
        if (!visible && !first) return;
        const dt = Math.min(clock.getDelta(), 0.05);
        if (!reducedMotion) t += dt;
        pointer.x += (target.x - pointer.x) * 0.06;
        pointer.y += (target.y - pointer.y) * 0.06;
        instance.update(t, reducedMotion ? 0 : dt, pointer);
        renderer.render(three, camera);
        if (first) {
          first = false;
          setReady(true);
        }
        // Reduced motion: one still frame is enough.
        if (reducedMotion) cancelAnimationFrame(raf);
      };
      frame();

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        window.removeEventListener("pointermove", onMove);
        host.removeEventListener("pointerleave", onLeave);
        instance.dispose?.();
        renderer.dispose();
        renderer.forceContextLoss();
        el.remove();
      };
      if (disposed) cleanup();
    })().catch(() => setFailed(true));

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [scene, fov]);

  return (
    <div
      ref={hostRef}
      role="img"
      aria-label={label}
      className={cn(
        "relative transition-opacity duration-700",
        ready || failed ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center text-caption text-ink-tertiary">
          3D preview unavailable on this device
        </div>
      )}
    </div>
  );
}
