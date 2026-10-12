import * as THREE from "three";
import {
  COLORS,
  SceneFactory,
  addStudioLights,
  clamp01,
  contactShadow,
  disposeTree,
  easeInOut,
  glossy,
  glow,
  makeLabel,
  matte,
  rounded,
} from "./common";

const CYCLE = 4.4;
const BIN_X = [-2.7, -0.9, 0.9, 2.7];
const BINS = [
  { color: COLORS.green, cat: "wet_biodegradable · 95%", dot: COLORS.green },
  { color: new THREE.Color(0x2563eb), cat: "plastic · 96%", dot: new THREE.Color(0x2563eb) },
  { color: COLORS.red, cat: "e_waste · 91%", dot: COLORS.red },
  { color: new THREE.Color(0x2b2b30), cat: "other_residual · 88%", dot: new THREE.Color(0x6e6e73) },
];

function buildItems() {
  const apple = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 24), glossy(0xd7263d));
  core.scale.set(1, 1.05, 1);
  const bite = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 20), matte(0xf4e4b8, 0.9));
  bite.position.set(0.2, 0.08, 0.14);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 8), matte(0x6b4f2a));
  stem.position.y = 0.34;
  apple.add(core, bite, stem);

  const bottle = new THREE.Group();
  const bb = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.62, 28),
    new THREE.MeshPhysicalMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.7, roughness: 0.1, clearcoat: 1 }),
  );
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.17, 0.2, 24), bb.material);
  neck.position.y = 0.4;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 16), matte(0x2563eb));
  cap.position.y = 0.54;
  bottle.add(bb, neck, cap);

  const battery = new THREE.Group();
  const bat = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.55, 28), matte(0x2b2b30, 0.4));
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.2, 28), glow(COLORS.amber, 0.4));
  band.position.y = 0.05;
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.07, 16), matte(0xc9ced6, 0.3));
  tip.position.y = 0.3;
  battery.add(bat, band, tip);

  const tissue = new THREE.Group();
  const tis = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 1), matte(0xece6dc, 0.95));
  tis.scale.set(1.1, 0.8, 0.9);
  tissue.add(tis);

  return [apple, bottle, battery, tissue];
}

export const create: SceneFactory = ({ scene, camera, reducedMotion }) => {
  addStudioLights(scene);
  const root = new THREE.Group();
  scene.add(root);

  const plinth = new THREE.Mesh(rounded(8.6, 0.3, 4.2, 0.15), matte(0xffffff, 0.7));
  plinth.position.y = -0.15;
  root.add(plinth);
  const shadow = contactShadow(12, 0.18);
  shadow.position.y = -0.32;
  root.add(shadow);

  const lids: THREE.Group[] = [];
  BINS.forEach((b, i) => {
    const bin = new THREE.Group();
    bin.position.set(BIN_X[i], 0, 0);
    const body = new THREE.Mesh(rounded(1.3, 1.35, 1.1, 0.12), glossy(b.color));
    body.position.y = 0.675;
    const stripe = new THREE.Mesh(rounded(0.9, 0.22, 0.04, 0.02), matte(0xffffff, 0.5));
    stripe.position.set(0, 0.8, 0.56);
    const hinge = new THREE.Group();
    hinge.position.set(0, 1.38, -0.55);
    const lid = new THREE.Mesh(rounded(1.4, 0.1, 1.2, 0.05), matte(b.color.clone().multiplyScalar(0.8), 0.45));
    lid.position.set(0, 0.04, 0.6);
    hinge.add(lid);
    bin.add(body, stripe, hinge);
    root.add(bin);
    lids.push(hinge);
  });

  // Scanner
  const scanner = new THREE.Group();
  scanner.position.set(0, 3.15, 0);
  const ringMat = new THREE.MeshStandardMaterial({
    color: COLORS.brand,
    emissive: COLORS.brand,
    emissiveIntensity: 0.9,
    roughness: 0.3,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.035, 12, 80), ringMat);
  ring.rotation.x = Math.PI / 2;
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.02, 10, 64), ringMat);
  ring2.rotation.x = Math.PI / 2;
  scanner.add(ring, ring2);
  root.add(scanner);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 0.02, 48, 1, true),
    new THREE.MeshBasicMaterial({ color: COLORS.brand, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
  );
  root.add(beam);

  const items = buildItems();
  items.forEach((it) => {
    it.visible = false;
    root.add(it);
  });

  const label = makeLabel("Scanning…", COLORS.brand, { scale: 3.2 });
  label.sprite.position.set(0, 4.35, 0);
  root.add(label.sprite);
  const pts = makeLabel("+10 pts", COLORS.green, { scale: 1.6 });
  pts.sprite.visible = false;
  root.add(pts.sprite);
  let lastKey = "";

  camera.position.set(0, 3.9, 9.6);
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();

  return {
    update(t, _dt, pointer) {
      const tt = reducedMotion ? CYCLE * 0.5 : t;
      const idx = Math.floor(tt / CYCLE) % 4;
      const p = (tt % CYCLE) / CYCLE;
      const item = items[idx];
      items.forEach((m, i) => (m.visible = i === idx));

      const scanEnd = 0.38;
      const flyEnd = 0.74;
      from.set(0, 3.15 - 0.1, 0);
      to.set(BIN_X[idx], 1.3, 0.05);

      if (p < scanEnd) {
        const u = p / scanEnd;
        item.position.set(0, 3.0 + Math.sin(u * Math.PI) * 0.05 + (1 - easeInOut(clamp01(u * 3))) * 0.6, 0);
        item.rotation.y = tt * 1.6;
        item.rotation.z = 0;
        item.scale.setScalar(1);
        beam.visible = true;
        beam.position.set(0, 3.7 - u * 1.4, 0);
        (beam.material as THREE.MeshBasicMaterial).opacity = 0.35;
      } else {
        beam.visible = false;
        const u = clamp01((p - scanEnd) / (flyEnd - scanEnd));
        const e = easeInOut(u);
        item.position.lerpVectors(from, to, e);
        item.position.y += Math.sin(e * Math.PI) * 0.7;
        item.rotation.y = tt * 1.6;
        item.rotation.z = e * 1.2;
        item.scale.setScalar(u > 0.85 ? 1 - (u - 0.85) / 0.15 * 0.9 : 1);
      }
      if (p > flyEnd) item.visible = false;

      // Lid opens as the item arrives, closes after.
      lids.forEach((l, i) => {
        let open = 0;
        if (i === idx) open = Math.sin(clamp01((p - 0.5) / 0.4) * Math.PI);
        l.rotation.x += (-open * 1.25 - l.rotation.x) * 0.25;
      });

      ring.position.y = Math.sin(tt * 2) * 0.03;
      ringMat.emissiveIntensity = p < scanEnd ? 1.3 : 0.5;
      ring2.rotation.z = tt * 1.2;

      const key = `${idx}:${p < scanEnd ? "scan" : "done"}`;
      if (key !== lastKey) {
        if (p < scanEnd) label.setText("Scanning…", COLORS.brand);
        else label.setText(BINS[idx].cat, BINS[idx].dot);
        lastKey = key;
      }
      pts.sprite.visible = p > flyEnd - 0.05 && p < 0.97;
      if (pts.sprite.visible) {
        const k = (p - (flyEnd - 0.05)) / (0.97 - (flyEnd - 0.05));
        pts.sprite.position.set(BIN_X[idx], 2.1 + k * 0.9, 0.2);
        pts.sprite.material.opacity = 1 - k;
      }

      root.rotation.y = pointer.x * 0.28;
      root.rotation.x = pointer.y * 0.04;
      camera.lookAt(0, 1.7, 0);
    },
    dispose() {
      label.dispose();
      pts.dispose();
      disposeTree(root);
    },
  };
};
