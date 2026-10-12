import * as THREE from "three";
import {
  COLORS,
  SceneFactory,
  addStudioLights,
  contactShadow,
  disposeTree,
  glossy,
  glow,
  makeLabel,
  matte,
  rounded,
} from "./common";

type Accent = "electricity" | "water" | "waste";

interface Block {
  x: number;
  z: number;
  w: number;
  d: number;
  floors: number;
  accent: Accent;
}

// A fictional campus: eight blocks, tinted by the resource they mostly drive.
const BLOCKS: Block[] = [
  { x: -2.6, z: -2.2, w: 2.2, d: 1.8, floors: 5, accent: "electricity" }, // Academic A (anomaly)
  { x: 0.4, z: -2.6, w: 1.6, d: 1.6, floors: 3, accent: "electricity" },
  { x: 3.0, z: -2.0, w: 1.8, d: 2.2, floors: 4, accent: "water" },
  { x: -3.0, z: 1.0, w: 1.6, d: 2.2, floors: 6, accent: "water" }, // hostel
  { x: 0.2, z: 0.4, w: 2.4, d: 1.6, floors: 2, accent: "waste" }, // mess
  { x: 3.1, z: 1.6, w: 1.8, d: 1.6, floors: 3, accent: "electricity" },
  { x: -0.6, z: 3.2, w: 2.0, d: 1.4, floors: 2, accent: "electricity" },
  { x: 2.2, z: 3.6, w: 1.4, d: 1.2, floors: 4, accent: "water" },
];

const FLOOR_H = 0.42;

export const create: SceneFactory = ({ scene, camera, reducedMotion }) => {
  addStudioLights(scene);
  const root = new THREE.Group();
  scene.add(root);

  // Base slab + lawn
  const base = new THREE.Mesh(rounded(10.4, 0.5, 9.6, 0.25), matte(0xffffff, 0.7));
  base.position.y = -0.25;
  root.add(base);
  const lawnColor = COLORS.brand.clone().lerp(COLORS.surface, 0.88);
  const lawn = new THREE.Mesh(rounded(9.8, 0.08, 9.0, 0.18), matte(lawnColor, 0.9));
  lawn.position.y = 0.02;
  root.add(lawn);
  // Paths
  const pathMat = matte(0xffffff, 0.8);
  const p1 = new THREE.Mesh(rounded(9.2, 0.06, 0.45, 0.03), pathMat);
  p1.position.set(0, 0.07, -0.55);
  const p2 = new THREE.Mesh(rounded(0.45, 0.06, 8.4, 0.03), pathMat);
  p2.position.set(-1.35, 0.07, 0);
  root.add(p1, p2);

  const shadow = contactShadow(15, 0.2);
  shadow.position.y = -0.52;
  root.add(shadow);

  const bodyMat = glossy(0xffffff);
  const bandMat = matte(0xe3e6eb, 0.6);
  const roofTops: THREE.Vector3[] = [];
  const accentMats: THREE.MeshStandardMaterial[] = [];

  BLOCKS.forEach((b, i) => {
    const h = b.floors * FLOOR_H;
    const g = new THREE.Group();
    g.position.set(b.x, 0, b.z);
    const body = new THREE.Mesh(rounded(b.w, h, b.d, 0.1), bodyMat);
    body.position.y = h / 2 + 0.06;
    g.add(body);
    for (let f = 1; f < b.floors; f++) {
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(b.w + 0.02, 0.07, b.d + 0.02),
        bandMat,
      );
      band.position.y = f * FLOOR_H + 0.06;
      g.add(band);
    }
    const accentMat = glow(COLORS[b.accent], 0.55);
    accentMats.push(accentMat);
    const roof = new THREE.Mesh(rounded(b.w * 0.62, 0.1, b.d * 0.62, 0.04), accentMat);
    roof.position.y = h + 0.12;
    g.add(roof);
    root.add(g);
    roofTops.push(new THREE.Vector3(b.x, h + 0.2, b.z));
    void i;
  });

  // Water tower beside the hostel
  const tower = new THREE.Group();
  tower.position.set(-4.4, 0, 2.4);
  for (const [dx, dz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 8), matte(0xc9ced6));
    leg.position.set(dx, 0.7, dz);
    tower.add(leg);
  }
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.46, 0.7, 32),
    glossy(COLORS.water),
  );
  tank.position.y = 1.6;
  tower.add(tank);
  root.add(tower);

  // Waste bins near the mess
  const binColors = [COLORS.green, 0x2563eb, COLORS.red, 0x2b2b30];
  binColors.forEach((c, i) => {
    const bin = new THREE.Mesh(rounded(0.26, 0.4, 0.26, 0.05), matte(c, 0.5));
    bin.position.set(-1.0 + i * 0.34, 0.26, 1.5);
    root.add(bin);
  });

  // Trees
  const leaf = matte(COLORS.brand.clone().lerp(COLORS.surface, 0.25), 0.85);
  const trunk = matte(0xb8a48e, 0.9);
  const treeSpots: [number, number, number][] = [
    [-4.3, -3.6, 1], [-4.5, -0.6, 0.8], [4.4, -0.2, 1], [4.4, 3.4, 0.8],
    [1.4, 1.9, 0.7], [-1.9, 3.8, 0.9], [4.2, -3.6, 0.8], [-0.9, -0.1, 0.6],
  ];
  treeSpots.forEach(([x, z, s]) => {
    const t = new THREE.Group();
    t.position.set(x, 0, z);
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.3 * s, 8), trunk);
    tr.position.y = 0.2 * s;
    const cr = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3 * s, 1), leaf);
    cr.position.y = 0.5 * s;
    t.add(tr, cr);
    root.add(t);
  });

  // Telemetry arcs with travelling pulses
  const arcs: { curve: THREE.CatmullRomCurve3; pulse: THREE.Mesh; speed: number; off: number }[] = [];
  const links: [number, number, Accent][] = [
    [0, 1, "electricity"], [1, 2, "electricity"], [0, 4, "electricity"],
    [3, 4, "water"], [4, 5, "waste"], [2, 7, "water"], [6, 4, "electricity"],
  ];
  links.forEach(([a, b, acc], i) => {
    const pa = roofTops[a].clone().setY(roofTops[a].y + 0.15);
    const pb = roofTops[b].clone().setY(roofTops[b].y + 0.15);
    const mid = pa.clone().add(pb).multiplyScalar(0.5);
    mid.y += 1.1 + pa.distanceTo(pb) * 0.12;
    const curve = new THREE.CatmullRomCurve3([pa, mid, pb]);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 40, 0.012, 6),
      new THREE.MeshBasicMaterial({ color: COLORS[acc], transparent: true, opacity: 0.35 }),
    );
    root.add(tube);
    const pulse = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 14, 14),
      new THREE.MeshBasicMaterial({ color: COLORS[acc] }),
    );
    root.add(pulse);
    arcs.push({ curve, pulse, speed: 0.12 + (i % 3) * 0.04, off: i * 0.17 });
  });

  // The anomaly: Academic Block A glows red, ringed and labelled.
  const hot = roofTops[0];
  const ringMat = new THREE.MeshBasicMaterial({ color: COLORS.red, transparent: true, opacity: 0.8 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.025, 8, 64), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.copy(hot).setY(hot.y + 0.05);
  const ring2 = ring.clone();
  ring2.material = ringMat.clone();
  root.add(ring, ring2);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8),
    new THREE.MeshBasicMaterial({ color: COLORS.red, transparent: true, opacity: 0.6 }),
  );
  beam.position.copy(hot).setY(hot.y + 0.7);
  root.add(beam);
  const hotMat = accentMats[0];

  const label = makeLabel("Hall A-204 · 3.4 kW after hours", COLORS.red, { scale: 4.6 });
  label.sprite.position.copy(hot).setY(hot.y + 1.75);
  root.add(label.sprite);
  const okLabel = makeLabel("Verified · 67 kWh saved", COLORS.green, { scale: 3.8 });
  okLabel.sprite.position.set(3.0, 2.5, 1.6);
  root.add(okLabel.sprite);

  root.rotation.y = -0.5;
  const tmp = new THREE.Vector3();

  return {
    update(t, _dt, pointer) {
      const spin = reducedMotion ? 0 : t * 0.06;
      root.rotation.y = -0.5 + spin + pointer.x * 0.22;
      root.rotation.x = pointer.y * 0.05;
      camera.position.set(0, 8.4, 13.2);
      camera.lookAt(0, 0.9, 0.3);

      arcs.forEach((a) => {
        const u = (t * a.speed + a.off) % 1;
        a.curve.getPoint(u, tmp);
        a.pulse.position.copy(tmp);
      });
      const k = (t * 0.9) % 1;
      ring.scale.setScalar(1 + k * 0.9);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - k);
      const k2 = (t * 0.9 + 0.5) % 1;
      ring2.scale.setScalar(1 + k2 * 0.9);
      (ring2.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - k2);
      hotMat.emissive.copy(COLORS.red).lerp(COLORS.electricity, 0.5 + 0.5 * Math.sin(t * 3));
      label.sprite.position.y = hot.y + 1.75 + Math.sin(t * 1.4) * 0.06;
      okLabel.sprite.position.y = 2.5 + Math.sin(t * 1.2 + 1) * 0.06;
    },
    dispose() {
      label.dispose();
      okLabel.dispose();
      disposeTree(root);
    },
  };
};
