import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { tokens } from "@/tailwind.config";

/** Shared contract between ThreeCanvas and every scene module. */
export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  /** True when the user prefers reduced motion: build a calm, near-static frame. */
  reducedMotion: boolean;
}

export interface SceneInstance {
  /** t = seconds since start, dt = seconds since last frame, pointer in -1..1 (eased). */
  update(t: number, dt: number, pointer: { x: number; y: number }): void;
  dispose?(): void;
}

export type SceneFactory = (ctx: SceneContext) => SceneInstance;

/** Brand + resource colours come from the single design-token source. */
export const COLORS = {
  brand: new THREE.Color(tokens.color.brand.DEFAULT),
  electricity: new THREE.Color(tokens.color.res.electricity),
  water: new THREE.Color(tokens.color.res.water),
  waste: new THREE.Color(tokens.color.res.waste),
  red: new THREE.Color(tokens.color.sev.red),
  amber: new THREE.Color(tokens.color.sev.amber),
  green: new THREE.Color(tokens.color.sev.green),
  ink: new THREE.Color(tokens.color.ink.DEFAULT),
  surface: new THREE.Color(tokens.color.surface),
  canvas: new THREE.Color(tokens.color.canvas),
};

export function rounded(w: number, h: number, d: number, r = 0.08) {
  return new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2));
}

export function matte(color: THREE.ColorRepresentation, rough = 0.55) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: rough,
    metalness: 0.04,
  });
}

export function glossy(color: THREE.ColorRepresentation) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.35,
    metalness: 0.05,
    clearcoat: 0.8,
    clearcoatRoughness: 0.25,
  });
}

export function glow(color: THREE.ColorRepresentation, intensity = 1) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.4,
  });
}

/** Soft lighting rig. Cheap, no shadow maps. */
export function addStudioLights(
  scene: THREE.Scene,
  opts: { key?: number; fill?: number; dark?: boolean } = {},
) {
  const hemi = new THREE.HemisphereLight(
    0xffffff,
    opts.dark ? 0x2a2a30 : 0xd8dce3,
    opts.dark ? 0.55 : 0.9,
  );
  const key = new THREE.DirectionalLight(0xffffff, opts.key ?? 2.2);
  key.position.set(5, 9, 6);
  const rim = new THREE.DirectionalLight(0xbfd8ff, opts.fill ?? 0.9);
  rim.position.set(-6, 4, -5);
  scene.add(hemi, key, rim);
}

let blobTexture: THREE.CanvasTexture | null = null;

/** Radial-gradient "contact shadow" so objects sit on the page without shadow maps. */
export function contactShadow(size: number, opacity = 0.22) {
  if (!blobTexture) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, "rgba(0,0,0,0.9)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    blobTexture = new THREE.CanvasTexture(c);
  }
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({
      map: blobTexture,
      transparent: true,
      opacity,
      depthWrite: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

export interface LabelHandle {
  sprite: THREE.Sprite;
  setText(text: string, dot?: THREE.ColorRepresentation): void;
  dispose(): void;
}

/** Floating pill label rendered to a canvas texture (crisp at 2x). */
export function makeLabel(
  text: string,
  dot: THREE.ColorRepresentation,
  opts: { scale?: number; dark?: boolean } = {},
): LabelHandle {
  const W = 640;
  const H = 128;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d")!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(mat);
  const s = opts.scale ?? 2.6;
  sprite.scale.set(s, s * (H / W), 1);
  sprite.renderOrder = 10;

  const draw = (t: string, d: THREE.ColorRepresentation) => {
    g.clearRect(0, 0, W, H);
    const pad = 6;
    const r = (H - pad * 2) / 2;
    g.font =
      '600 38px -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, system-ui, sans-serif';
    const tw = g.measureText(t).width;
    const w = Math.min(W - pad * 2, tw + 110);
    const x = (W - w) / 2;
    g.shadowColor = "rgba(0,0,0,0.18)";
    g.shadowBlur = 18;
    g.shadowOffsetY = 6;
    g.fillStyle = opts.dark ? "rgba(29,29,31,0.92)" : "rgba(255,255,255,0.96)";
    g.beginPath();
    g.roundRect(x, pad, w, H - pad * 2 - 8, r);
    g.fill();
    g.shadowColor = "transparent";
    g.fillStyle = "#" + new THREE.Color(d).getHexString();
    g.beginPath();
    g.arc(x + 44, H / 2 - 4, 13, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = opts.dark ? "#FFFFFF" : "#1D1D1F";
    g.textBaseline = "middle";
    g.fillText(t, x + 72, H / 2 - 3);
    texture.needsUpdate = true;
  };
  draw(text, dot);

  return {
    sprite,
    setText: (t, d = dot) => draw(t, d),
    dispose() {
      texture.dispose();
      mat.dispose();
    },
  };
}

/** Dispose every geometry/material/texture below a root. */
export function disposeTree(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else mat?.dispose();
  });
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
