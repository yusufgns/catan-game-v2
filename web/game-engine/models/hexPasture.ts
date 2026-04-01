/**
 * Pasture hex terrain tile — produces wool.
 * Rolling hillocks, fence sections, tiny sheep, and small flowers.
 * Kept lightweight (~28 meshes) for instancing across the board.
 */
import * as THREE from 'three';
import { mat, palette } from './materials';
import { createHexPlate } from './hexBase';

export function createHexPasture() {
  const group = new THREE.Group();

  // ── Palette ─────────────────────────────────────────────────────────────────
  const P = {
    ground: palette('hexPastureGround'),
    fence:  palette('hexPastureFence'),
    wool:   palette('sheepWool'),
    dark:   palette('sheepDark'),
    flower: palette('flowerPink'),
  };

  // ── Materials ─────────────────────────────────────────────────────────────
  const groundMat = mat(P.ground);
  const fenceMat  = mat(P.fence);
  const woolMat   = mat(P.wool);
  const darkMat   = mat(P.dark);
  const flowerMat = mat(P.flower);
  const grassMat  = mat(0x5aaa30);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 1. HEX BASE PLATE ────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const plate = createHexPlate(0.95, 0.08, groundMat);
  group.add(plate);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 2. ROLLING HILLOCKS (4 flattened spheres) ─────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const hillGeo = new THREE.SphereGeometry(0.18, 7, 5);

  [
    [ 0.25,  0.20, 1.0],
    [-0.30, -0.15, 0.8],
    [ 0.00,  0.35, 0.7],
    [-0.15,  0.05, 0.9],
  ].forEach(([hx, hz, s]) => {
    const hill = new THREE.Mesh(hillGeo, groundMat);
    hill.position.set(hx, 0.08, hz);
    hill.scale.set(s, 0.25, s);
    hill.receiveShadow = true;
    group.add(hill);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 3. FENCE SECTIONS (2 L-shaped sections) ──────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const postGeo = new THREE.CylinderGeometry(0.012, 0.016, 0.16, 5);
  const railGeo = new THREE.BoxGeometry(0.20, 0.012, 0.012);

  // Fence section 1 (3 posts + 2 rails)
  const fencePositions1 = [[-0.50, 0.30], [-0.40, 0.30], [-0.30, 0.30]];
  fencePositions1.forEach(([fx, fz]) => {
    const post = new THREE.Mesh(postGeo, fenceMat);
    post.position.set(fx, 0.16, fz);
    post.castShadow = true;
    group.add(post);
  });
  [0.14, 0.20].forEach((ry) => {
    const rail = new THREE.Mesh(railGeo, fenceMat);
    rail.position.set(-0.40, ry, 0.30);
    group.add(rail);
  });

  // Fence section 2 (3 posts + 2 rails)
  const fencePositions2 = [[0.20, -0.35], [0.30, -0.35], [0.40, -0.35]];
  fencePositions2.forEach(([fx, fz]) => {
    const post = new THREE.Mesh(postGeo, fenceMat);
    post.position.set(fx, 0.16, fz);
    post.castShadow = true;
    group.add(post);
  });
  [0.14, 0.20].forEach((ry) => {
    const rail = new THREE.Mesh(railGeo, fenceMat);
    rail.position.set(0.30, ry, -0.35);
    group.add(rail);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 4. SHEEP (2 tiny figures) ─────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const bodyGeo = new THREE.SphereGeometry(0.055, 6, 5);
  const headGeo = new THREE.SphereGeometry(0.025, 5, 4);
  const legGeo  = new THREE.CylinderGeometry(0.008, 0.008, 0.05, 4);

  [[0.15, 0.15, 0.3], [-0.10, -0.20, -0.5]].forEach(([sx, sz, rot]) => {
    const sheepGroup = new THREE.Group();
    sheepGroup.position.set(sx, 0.08, sz);
    sheepGroup.rotation.y = rot;

    // Wool body
    const body = new THREE.Mesh(bodyGeo, woolMat);
    body.position.y = 0.06;
    body.scale.set(1.1, 0.85, 0.8);
    body.castShadow = true;
    sheepGroup.add(body);

    // Head
    const head = new THREE.Mesh(headGeo, darkMat);
    head.position.set(0.06, 0.07, 0);
    sheepGroup.add(head);

    // Four legs
    [[-0.03, 0, 0.025], [-0.03, 0, -0.025],
     [ 0.03, 0, 0.025], [ 0.03, 0, -0.025]].forEach(([lx, ly, lz]) => {
      const leg = new THREE.Mesh(legGeo, darkMat);
      leg.position.set(lx, 0.025, lz);
      sheepGroup.add(leg);
    });

    group.add(sheepGroup);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 5. SMALL FLOWERS (5 scattered) ────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const petalGeo = new THREE.SphereGeometry(0.015, 5, 4);
  const stemGeo  = new THREE.CylinderGeometry(0.003, 0.003, 0.04, 4);

  [
    [0.40, 0.10], [-0.20, 0.40], [0.35, -0.10],
    [-0.40, -0.25], [0.05, -0.40],
  ].forEach(([fx, fz]) => {
    const stem = new THREE.Mesh(stemGeo, grassMat);
    stem.position.set(fx, 0.10, fz);
    group.add(stem);

    const petal = new THREE.Mesh(petalGeo, flowerMat);
    petal.position.set(fx, 0.13, fz);
    group.add(petal);
  });

  return group;
}

export const hexPastureMeta = {
  id: 'hexPasture',
  name: 'Otlak',
  category: 'Arazi',
  description: 'Yün üretir. Çitler, koyunlar ve çiçeklerle kaplı yeşil mera.',
  type: 'Hex Tile',
  materials: 6,
  geo: 'Prosedürel',
};
