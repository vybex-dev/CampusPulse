import * as THREE from "three";
import {
  COLORS,
  SceneFactory,
  addStudioLights,
  disposeTree,
  glow,
  makeLabel,
} from "./common";

// See → Understand → Act → Prove, laid out as a glowing ring on a dark stage.
const NODES = [
  { name: "See", color: COLORS.water },
  { name: "Understand", color: COLORS.electricity },
  { name: "Act", color: COLORS.amber },
  { name: "Prove", color: COLORS.green },
];
const R = 2.6;

export const create: SceneFactory = ({ scene, camera, reducedMotion }) => {
  addStudioLights(scene, { dark: true, key: 1.6 });
  const root = new THREE.Group();
  scene.add(root);

  // Track
  const track = new THREE.Mesh(
    new THREE.TorusGeometry(R, 0.018, 10, 160),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 }),
  );
  root.add(track);
  const track2 = new THREE.Mesh(
    new THREE.TorusGeometry(R + 0.35, 0.008, 8, 160),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1 }),
  );
  root.add(track2);

  // Centre: wireframe core + solid kernel
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.9, 1),
    new THREE.MeshBasicMaterial({ color: COLORS.brand, wireframe: true, transparent: true, opacity: 0.9 }),
  );
  const kernel = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 3), glow(COLORS.brand, 0.9));
  root.add(core, kernel);

  // Nodes, each a different solid so the four steps read at a glance.
  const geos = [
    new THREE.OctahedronGeometry(0.34, 0),
    new THREE.IcosahedronGeometry(0.34, 0),
    new THREE.BoxGeometry(0.46, 0.46, 0.46),
    new THREE.TorusKnotGeometry(0.22, 0.075, 80, 10),
  ];
  const nodes = NODES.map((n, i) => {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const mat = new THREE.MeshStandardMaterial({
      color: n.color,
      emissive: n.color,
      emissiveIntensity: 0.4,
      roughness: 0.25,
      metalness: 0.2,
    });
    const mesh = new THREE.Mesh(geos[i], mat);
    mesh.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.54, 48),
      new THREE.MeshBasicMaterial({ color: n.color, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }),
    );
    halo.position.copy(mesh.position);
    const label = makeLabel(`${i + 1}  ${n.name}`, n.color, { scale: 2.9, dark: true });
    label.sprite.position.set(mesh.position.x, mesh.position.y + (Math.sin(a) > 0 ? 1.0 : -1.0), 0);
    // Spokes to the core
    const spoke = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, R - 1.0, 6),
      new THREE.MeshBasicMaterial({ color: n.color, transparent: true, opacity: 0.25 }),
    );
    spoke.position.set(Math.cos(a) * (R / 2 + 0.5), Math.sin(a) * (R / 2 + 0.5), 0);
    spoke.rotation.z = a - Math.PI / 2;
    root.add(mesh, halo, label.sprite, spoke);
    return { mesh, halo, mat, a, label };
  });

  // Travelling pulse, which lights each node as it passes.
  const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  root.add(pulse);
  const trail = Array.from({ length: 14 }, (_, i) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.07 - i * 0.003, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 - i * 0.034 }),
    );
    root.add(m);
    return m;
  });

  // Dust
  const dustGeo = new THREE.BufferGeometry();
  const N = 140;
  const arr = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 1.2 + Math.random() * 4.2;
    const th = Math.random() * Math.PI * 2;
    arr[i * 3] = Math.cos(th) * r;
    arr[i * 3 + 1] = Math.sin(th) * r * 0.9;
    arr[i * 3 + 2] = (Math.random() - 0.5) * 3.2;
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.03, transparent: true, opacity: 0.35, depthWrite: false }),
  );
  root.add(dust);

  camera.position.set(0, 0.2, 9.0);
  const angleAt = (u: number) => Math.PI / 4 + u * Math.PI * 2;

  return {
    update(t, _dt, pointer) {
      const speed = 0.075;
      const u = (reducedMotion ? 0.3 : t * speed) % 1;
      const place = (m: THREE.Object3D, uu: number) =>
        m.position.set(Math.cos(angleAt(uu)) * R, Math.sin(angleAt(uu)) * R, 0);
      place(pulse, u);
      trail.forEach((m, i) => place(m, (u - (i + 1) * 0.008 + 1) % 1));

      nodes.forEach((n, i) => {
        // Distance (in loop fraction) between pulse and this node.
        const nodeU = i / 4;
        let d = Math.abs(((u - nodeU + 1.5) % 1) - 0.5);
        d = Math.min(d, 1 - d);
        const lit = Math.max(0, 1 - d * 7);
        n.mat.emissiveIntensity = 0.35 + lit * 1.4;
        n.mesh.scale.setScalar(1 + lit * 0.28);
        n.halo.scale.setScalar(1 + lit * 0.5);
        (n.halo.material as THREE.MeshBasicMaterial).opacity = 0.25 + lit * 0.6;
        n.mesh.rotation.y = (reducedMotion ? 0.6 : t * 0.8) + i;
        n.mesh.rotation.x = (reducedMotion ? 0.3 : t * 0.5);
      });

      core.rotation.y = t * 0.3;
      core.rotation.x = t * 0.2;
      kernel.scale.setScalar(1 + Math.sin(t * 2) * 0.05);
      dust.rotation.z = t * 0.02;

      root.rotation.y = pointer.x * 0.35;
      root.rotation.x = -pointer.y * 0.2;
      camera.lookAt(0, 0, 0);
    },
    dispose() {
      nodes.forEach((n) => n.label.dispose());
      disposeTree(root);
    },
  };
};
