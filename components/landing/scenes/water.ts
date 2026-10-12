import * as THREE from "three";
import {
  COLORS,
  SceneFactory,
  addStudioLights,
  contactShadow,
  disposeTree,
  makeLabel,
  matte,
  rounded,
} from "./common";

const TANK_R = 1.25;
const TANK_H = 3.0;
const SEG = 48;
const DROPS = 26;

export const create: SceneFactory = ({ scene, camera, reducedMotion }) => {
  addStudioLights(scene);
  const root = new THREE.Group();
  scene.add(root);

  const plinth = new THREE.Mesh(rounded(6.6, 0.3, 5.4, 0.15), matte(0xffffff, 0.7));
  plinth.position.set(0.4, -0.15, 0);
  root.add(plinth);
  const shadow = contactShadow(10, 0.18);
  shadow.position.set(0.4, -0.32, 0);
  root.add(shadow);

  // Glass tank
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(TANK_R, TANK_R, TANK_H, 64, 1, true),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.16,
      roughness: 0.05,
      clearcoat: 1,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  glass.position.set(-0.8, TANK_H / 2, 0);
  root.add(glass);
  const capMat = matte(0xe9ebef, 0.5);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(TANK_R + 0.08, TANK_R + 0.08, 0.12, 64), capMat);
  cap.position.set(-0.8, TANK_H + 0.06, 0);
  const foot = cap.clone();
  foot.position.y = 0.0;
  root.add(cap, foot);

  // Level gauge ticks
  const tickMat = new THREE.MeshBasicMaterial({ color: COLORS.ink, transparent: true, opacity: 0.35 });
  for (let i = 0; i <= 5; i++) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(i % 5 === 0 ? 0.32 : 0.2, 0.025, 0.025), tickMat);
    tick.position.set(-0.8 + TANK_R + 0.02, 0.2 + (i / 5) * (TANK_H - 0.4), 0.5);
    root.add(tick);
  }

  // Water volume
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: COLORS.water,
    transparent: true,
    opacity: 0.82,
    roughness: 0.15,
    clearcoat: 0.6,
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(TANK_R - 0.04, TANK_R - 0.04, 1, 64, 1), waterMat);
  root.add(body);
  const surfGeo = new THREE.CircleGeometry(TANK_R - 0.04, SEG);
  surfGeo.rotateX(-Math.PI / 2);
  const surfBase = Float32Array.from(surfGeo.attributes.position.array);
  const surf = new THREE.Mesh(
    surfGeo,
    new THREE.MeshPhysicalMaterial({ color: 0x7dd3fc, roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.95 }),
  );
  root.add(surf);

  // Bubbles
  const bubbleGeo = new THREE.SphereGeometry(0.05, 10, 10);
  const bubbleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
  const bubbles = Array.from({ length: 16 }, (_, i) => {
    const m = new THREE.Mesh(bubbleGeo, bubbleMat);
    root.add(m);
    return { m, a: (i * 2.4) % (Math.PI * 2), r: 0.2 + ((i * 0.37) % 0.8), sp: 0.25 + (i % 5) * 0.07, off: i / 16 };
  });

  // Leaking pipe on the right
  const pipeMat = matte(0xb7bcc6, 0.35);
  const pipeH = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.2, 20), pipeMat);
  pipeH.rotation.z = Math.PI / 2;
  pipeH.position.set(1.15, 1.4, 0);
  const pipeV = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.85, 20), pipeMat);
  pipeV.position.set(2.2, 0.32, 0);
  const joint = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 20), pipeMat);
  joint.position.set(2.2, 1.4, 0);
  root.add(pipeH, pipeV, joint);
  // Leak crack
  const crack = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.02, 8, 24), new THREE.MeshBasicMaterial({ color: COLORS.red }));
  crack.position.set(2.2, 1.0, 0);
  crack.rotation.x = Math.PI / 2;
  root.add(crack);

  const dropGeo = new THREE.SphereGeometry(0.06, 12, 12);
  dropGeo.scale(1, 1.4, 1);
  const dropMat = new THREE.MeshPhysicalMaterial({ color: COLORS.water, roughness: 0.1, clearcoat: 1 });
  const drops = Array.from({ length: DROPS }, (_, i) => {
    const m = new THREE.Mesh(dropGeo, dropMat);
    root.add(m);
    return { m, off: i / DROPS, dx: ((i * 53) % 10) / 100 - 0.05 };
  });
  const puddleMat = new THREE.MeshBasicMaterial({ color: COLORS.water, transparent: true, opacity: 0.35, depthWrite: false });
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.5, 40), puddleMat);
  puddle.rotation.x = -Math.PI / 2;
  puddle.position.set(2.35, 0.01, 0.1);
  root.add(puddle);
  const ripple = new THREE.Mesh(
    new THREE.RingGeometry(0.2, 0.23, 40),
    new THREE.MeshBasicMaterial({ color: COLORS.water, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }),
  );
  ripple.rotation.x = -Math.PI / 2;
  ripple.position.set(2.35, 0.02, 0.1);
  root.add(ripple);

  const label = makeLabel("800 L/h at 3 AM · leak flagged", COLORS.red, { scale: 3.5 });
  label.sprite.position.set(2.0, 2.3, 0.4);
  root.add(label.sprite);
  const label2 = makeLabel("153 L/resident/day · target 120", COLORS.amber, { scale: 3.5 });
  label2.sprite.position.set(-0.8, TANK_H + 0.75, 0);
  root.add(label2.sprite);

  camera.position.set(1.2, 3.4, 9.4);

  return {
    update(t, _dt, pointer) {
      // Level: slow slosh + a gentle downward drift that loops (the leak draining the tank).
      const drain = reducedMotion ? 0.25 : (t % 14) / 14;
      const level = 2.55 - drain * 1.2 + Math.sin(t * 0.7) * 0.03;
      body.scale.y = level;
      body.position.set(-0.8, level / 2, 0);
      const y = level;
      const pos = surfGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const x = surfBase[i * 3];
        const z = surfBase[i * 3 + 2];
        pos.setY(i, Math.sin(x * 2.6 + t * 1.8) * 0.035 + Math.cos(z * 3.1 + t * 1.4) * 0.03);
      }
      pos.needsUpdate = true;
      surf.geometry.computeVertexNormals();
      surf.position.set(-0.8, y, 0);

      bubbles.forEach((b) => {
        const u = (t * b.sp + b.off) % 1;
        b.m.position.set(-0.8 + Math.cos(b.a + t * 0.4) * b.r, 0.2 + u * Math.max(0.1, level - 0.3), Math.sin(b.a + t * 0.4) * b.r);
        b.m.scale.setScalar(0.5 + Math.sin(u * Math.PI) * 0.9);
      });

      drops.forEach((d) => {
        const u = (t * 0.9 + d.off) % 1;
        d.m.position.set(2.2 + 0.1 + d.dx * u + u * 0.12, Math.max(0.03, 1.0 - u * u * 0.97), 0.1 + d.dx * 2);
        d.m.scale.setScalar(1 - u * 0.25);
      });
      const rp = (t * 0.9) % 1;
      ripple.scale.setScalar(1 + rp * 2.4);
      (ripple.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - rp);
      label.sprite.position.y = 2.3 + Math.sin(t * 1.3) * 0.06;

      root.rotation.y = -0.3 + pointer.x * 0.25;
      root.rotation.x = pointer.y * 0.04;
      camera.lookAt(0.6, 1.5, 0);
    },
    dispose() {
      label.dispose();
      label2.dispose();
      disposeTree(root);
    },
  };
};
