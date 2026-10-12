import * as THREE from "three";
import {
  COLORS,
  SceneFactory,
  addStudioLights,
  clamp01,
  contactShadow,
  disposeTree,
  glossy,
  makeLabel,
  matte,
  rounded,
} from "./common";

const FLOORS = 5;
const ROOMS = 4;
const FLOOR_H = 0.56;
const DAY_SECONDS = 16;

// Smooth 0..1 "scheduled occupancy" curve: classes 9:00-17:00 with a lunch dip.
function expected(hour: number) {
  const on = clamp01((hour - 8.5) / 1) * clamp01((17.5 - hour) / 1);
  const lunch = hour > 13 && hour < 14 ? 0.35 : 0;
  return 0.12 + 0.88 * on - lunch * on;
}

export const create: SceneFactory = ({ scene, camera, reducedMotion }) => {
  addStudioLights(scene);
  const root = new THREE.Group();
  scene.add(root);

  const plinth = new THREE.Mesh(rounded(7.2, 0.3, 5.4, 0.15), matte(0xffffff, 0.7));
  plinth.position.set(0, -0.15, 0.9);
  root.add(plinth);
  const shadow = contactShadow(11, 0.18);
  shadow.position.set(0, -0.32, 0.7);
  root.add(shadow);

  // Building cutaway
  const slabMat = glossy(0xffffff);
  const wallMat = matte(0xeceef2, 0.7);
  const back = new THREE.Mesh(rounded(4.3, FLOORS * FLOOR_H + 0.1, 0.1, 0.04), wallMat);
  back.position.set(0, (FLOORS * FLOOR_H) / 2, -0.7);
  root.add(back);
  for (const sx of [-1, 1]) {
    const side = new THREE.Mesh(rounded(0.1, FLOORS * FLOOR_H + 0.1, 1.5, 0.04), wallMat);
    side.position.set(sx * 2.15, (FLOORS * FLOOR_H) / 2, 0);
    root.add(side);
  }
  for (let f = 0; f <= FLOORS; f++) {
    const slab = new THREE.Mesh(rounded(4.4, 0.08, 1.6, 0.03), slabMat);
    slab.position.set(0, f * FLOOR_H, 0);
    root.add(slab);
  }

  interface Room {
    mat: THREE.MeshStandardMaterial;
    seed: number;
    anomaly: boolean;
  }
  const rooms: Room[] = [];
  const roomW = 0.9;
  for (let f = 0; f < FLOORS; f++) {
    for (let r = 0; r < ROOMS; r++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xf4f5f7,
        emissive: COLORS.electricity,
        emissiveIntensity: 0,
        roughness: 0.5,
      });
      const m = new THREE.Mesh(rounded(roomW, FLOOR_H - 0.2, 1.1, 0.05), mat);
      m.position.set(-1.65 + r * 1.1, f * FLOOR_H + FLOOR_H / 2 + 0.02, 0.05);
      root.add(m);
      const seed = ((f * 7 + r * 13) % 10) / 10;
      rooms.push({ mat, seed, anomaly: f === 2 && r === 3 });
    }
  }

  // Hourly bar chart in front: ghost = expected band, solid = actual
  const bars: { solid: THREE.Mesh; ghost: THREE.Mesh; hour: number; exp: number; act: number }[] = [];
  const BAR_MAX = 1.15;
  for (let h = 0; h < 24; h++) {
    const e = expected(h + 0.5);
    const afterHours = h >= 19 && h <= 22;
    const a = afterHours ? 0.62 : e * (0.96 + ((h * 37) % 7) / 100);
    const x = -2.3 + h * (4.6 / 23);
    const ghost = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 1, 0.14),
      new THREE.MeshBasicMaterial({
        color: COLORS.electricity,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      }),
    );
    ghost.scale.y = Math.max(0.03, e * 1.12 * BAR_MAX);
    ghost.position.set(x, ghost.scale.y / 2, 2.6);
    const solid = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 1, 0.1),
      new THREE.MeshStandardMaterial({
        color: afterHours ? COLORS.red : COLORS.electricity,
        emissive: afterHours ? COLORS.red : COLORS.electricity,
        emissiveIntensity: 0.15,
        roughness: 0.35,
      }),
    );
    solid.scale.y = Math.max(0.03, a * BAR_MAX);
    solid.position.set(x, solid.scale.y / 2, 2.6);
    root.add(ghost, solid);
    bars.push({ solid, ghost, hour: h, exp: e, act: a });
  }

  const cursor = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.02, 0.5),
    new THREE.MeshBasicMaterial({ color: COLORS.ink }),
  );
  root.add(cursor);

  const label = makeLabel("14:00 · within schedule", COLORS.green, { scale: 3.0 });
  label.sprite.position.set(0, 3.35, 0.4);
  root.add(label.sprite);
  let lastLabel = "";

  camera.position.set(0, 3.7, 9.2);

  return {
    update(t, _dt, pointer) {
      const clock = reducedMotion ? 20 : (t % DAY_SECONDS) / DAY_SECONDS * 24;
      const hour = Math.floor(clock);
      const occ = expected(clock);
      const after = clock >= 19 && clock < 23;

      rooms.forEach((r) => {
        const on = occ > 0.3 + r.seed * 0.5 ? 1 : 0.0;
        let target = on * (0.5 + r.seed * 0.4);
        r.mat.emissive.copy(COLORS.electricity);
        if (r.anomaly) {
          // Room 204 never switches off after hours.
          if (after || (clock >= 17 && clock < 23)) {
            target = 1.1 + Math.sin(t * 6) * 0.25;
            r.mat.emissive.copy(COLORS.red);
          }
        }
        r.mat.emissiveIntensity += (target - r.mat.emissiveIntensity) * 0.12;
      });

      bars.forEach((b) => {
        const m = b.solid.material as THREE.MeshStandardMaterial;
        const near = Math.abs(b.hour + 0.5 - clock);
        m.emissiveIntensity = 0.15 + Math.max(0, 1 - near) * 0.9;
      });
      cursor.position.set(-2.3 + (clock - 0.5) * (4.6 / 23), 0.01, 2.6);

      const text = `${String(hour).padStart(2, "0")}:00 · ${
        after ? "after-hours spike" : occ > 0.5 ? "in timetable" : "standby"
      }`;
      if (text !== lastLabel) {
        label.setText(text, after ? COLORS.red : occ > 0.5 ? COLORS.electricity : COLORS.green);
        lastLabel = text;
      }

      root.rotation.y = -0.38 + pointer.x * 0.25;
      root.rotation.x = pointer.y * 0.04;
      camera.lookAt(0, 1.35, 0.9);
    },
    dispose() {
      label.dispose();
      disposeTree(root);
    },
  };
};
