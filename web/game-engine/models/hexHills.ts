/**
 * Hills hex terrain tile — produces Brick.
 * Red-brown base with rolling mounds, a brick kiln, and scattered bricks.
 * Kept lightweight (~25 meshes) for instancing across the board.
 */
import * as THREE from 'three';
import { mat, palette } from './materials';
import { createHexPlate } from './hexBase';

export function createHexHills() {
  const group = new THREE.Group();

  // ── Palette ─────────────────────────────────────────────────────────────────
  const P = {
    ground: palette('hexHillsGround'),
    clay:   palette('hexHillsClay'),
    brick:  palette('brickMain'),
    mortar: palette('brickMortar'),
  };

  // ── Materials ───────────────────────────────────────────────────────────────
  const groundMat = mat(P.ground);
  const clayMat   = mat(P.clay);
  const brickMat  = mat(P.brick);
  const mortarMat = mat(P.mortar);

  // ── 1. HEX BASE PLATE ──────────────────────────────────────────────────────
  const plate = createHexPlate(0.95, 0.08, groundMat);
  group.add(plate);

  // ── 2. ROLLING HILLS / MOUNDS (3 flattened spheres) ─────────────────────────
  const mounds = [
    { x: -0.30, z: -0.20, r: 0.28, sy: 0.30 },
    { x:  0.25, z:  0.15, r: 0.24, sy: 0.25 },
    { x: -0.05, z:  0.30, r: 0.20, sy: 0.22 },
  ];
  mounds.forEach(({ x, z, r, sy }) => {
    const hill = new THREE.Mesh(
      new THREE.SphereGeometry(r, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      clayMat
    );
    hill.position.set(x, 0.08, z);
    hill.scale.y = sy;
    hill.castShadow = true;
    hill.receiveShadow = true;
    group.add(hill);
  });

  // ── 3. BRICK KILN (simple box stack with dome top) ──────────────────────────
  const kilnX = 0.30, kilnZ = -0.25;

  // Kiln base (box)
  const kilnBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.10, 0.12),
    brickMat
  );
  kilnBase.position.set(kilnX, 0.08 + 0.05, kilnZ);
  kilnBase.castShadow = true;
  kilnBase.receiveShadow = true;
  group.add(kilnBase);

  // Kiln dome top (hemisphere)
  const kilnDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    brickMat
  );
  kilnDome.position.set(kilnX, 0.08 + 0.10, kilnZ);
  kilnDome.castShadow = true;
  group.add(kilnDome);

  // Kiln chimney
  const chimney = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.025, 0.08, 6),
    brickMat
  );
  chimney.position.set(kilnX, 0.08 + 0.10 + 0.08 + 0.02, kilnZ);
  chimney.castShadow = true;
  group.add(chimney);

  // Kiln opening (dark front face)
  const opening = new THREE.Mesh(
    new THREE.PlaneGeometry(0.06, 0.06),
    mat(0x1a1210)
  );
  opening.position.set(kilnX, 0.08 + 0.04, kilnZ + 0.061);
  group.add(opening);

  // ── 4. CLAY PIT (shallow depression — flattened cylinder) ───────────────────
  const pitX = -0.35, pitZ = 0.10;
  const pit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.14, 0.03, 10),
    mat(P.clay, { side: THREE.DoubleSide })
  );
  pit.position.set(pitX, 0.08 + 0.015, pitZ);
  pit.receiveShadow = true;
  group.add(pit);

  // Wet clay surface inside pit
  const claySurface = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.10, 0.005, 10),
    mat(0x7a3a18)
  );
  claySurface.position.set(pitX, 0.08 + 0.025, pitZ);
  claySurface.receiveShadow = true;
  group.add(claySurface);

  // ── 5. SCATTERED LOOSE BRICKS (6 small boxes) ──────────────────────────────
  const bricks = [
    { x: -0.15, z: -0.35, ry: 0.4 },
    { x:  0.10, z:  0.40, ry: -0.8 },
    { x:  0.45, z:  0.05, ry: 1.2 },
    { x: -0.40, z: -0.20, ry: 0.7 },
    { x:  0.05, z: -0.40, ry: -0.3 },
    { x: -0.20, z:  0.42, ry: 0.9 },
  ];
  bricks.forEach(({ x, z, ry }) => {
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.035, 0.04),
      brickMat
    );
    b.position.set(x, 0.08 + 0.018, z);
    b.rotation.y = ry;
    b.castShadow = true;
    b.receiveShadow = true;
    group.add(b);
  });

  // ── 6. MORTAR PATCH near kiln (small flat slab) ─────────────────────────────
  const mortarPatch = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.07, 0.008, 8),
    mortarMat
  );
  mortarPatch.position.set(kilnX - 0.16, 0.08 + 0.004, kilnZ + 0.05);
  mortarPatch.receiveShadow = true;
  group.add(mortarPatch);

  // ── 7. SMALL STONES (3 pebbles for ground detail) ──────────────────────────
  const pebbles = [
    { x: 0.40, z: 0.30 },
    { x: -0.10, z: -0.50 },
    { x: 0.50, z: -0.10 },
  ];
  pebbles.forEach(({ x, z }) => {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.015, 5, 3),
      mat(P.mortar)
    );
    p.position.set(x, 0.08 + 0.008, z);
    p.scale.y = 0.5;
    p.receiveShadow = true;
    group.add(p);
  });

  return group;
}

export const hexHillsMeta = {
  id: 'hexHills',
  name: 'Tepeler',
  category: 'Arazi',
  description: 'Tuğla üreten tepeli arazi. Yuvarlak tepeler, tuğla fırını, kil çukuru ve dağınık tuğlalar içerir.',
  type: 'Hex Tile',
  materials: 7,
  geo: 'Prosedürel',
};
