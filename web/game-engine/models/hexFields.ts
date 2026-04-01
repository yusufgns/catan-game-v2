/**
 * Fields hex terrain tile — produces grain.
 * Dense wheat stalks in cultivated rows with a small path through the field.
 * Kept lightweight (~25 meshes) for instancing across the board.
 */
import * as THREE from 'three';
import { mat, palette } from './materials';
import { createHexPlate } from './hexBase';

export function createHexFields() {
  const group = new THREE.Group();

  // ── Palette ─────────────────────────────────────────────────────────────────
  const P = {
    ground: palette('hexFieldsGround'),
    wheat:  palette('hexFieldsWheat'),
    tie:    palette('wheatTie'),
  };

  // ── Materials ─────────────────────────────────────────────────────────────
  const groundMat = mat(P.ground);
  const wheatMat  = mat(P.wheat);
  const tieMat    = mat(P.tie);
  const pathMat   = mat(0xb89050);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 1. HEX BASE PLATE ────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const plate = createHexPlate(0.95, 0.08, groundMat);
  group.add(plate);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 2. DIRT PATH (curved through the field) ───────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  // Three overlapping flat boxes to form a winding path
  const pathGeo1 = new THREE.BoxGeometry(0.12, 0.005, 0.70);
  const path1 = new THREE.Mesh(pathGeo1, pathMat);
  path1.position.set(0, 0.085, 0.05);
  path1.rotation.y = 0.15;
  path1.receiveShadow = true;
  group.add(path1);

  const pathGeo2 = new THREE.BoxGeometry(0.12, 0.005, 0.30);
  const path2 = new THREE.Mesh(pathGeo2, pathMat);
  path2.position.set(0.05, 0.085, -0.40);
  path2.rotation.y = -0.25;
  path2.receiveShadow = true;
  group.add(path2);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 3. WHEAT STALKS (grouped in rows, left & right of path) ───────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  // Shared geometries
  const stalkGeo = new THREE.CylinderGeometry(0.006, 0.008, 0.20, 4);
  const headGeo  = new THREE.ConeGeometry(0.015, 0.05, 5);

  // Row definitions: [xCenter, zStart, zEnd, count]
  // Left side of path
  const rowsLeft = [
    [-0.25,  -0.45, 0.50, 4],
    [-0.38,  -0.30, 0.40, 3],
    [-0.52,  -0.10, 0.20, 2],
  ];
  // Right side of path
  const rowsRight = [
    [0.25,  -0.45, 0.50, 4],
    [0.38,  -0.30, 0.40, 3],
    [0.52,  -0.10, 0.20, 2],
  ];

  const allRows = [...rowsLeft, ...rowsRight];

  allRows.forEach(([rx, zStart, zEnd, count]) => {
    const span = zEnd - zStart;
    for (let i = 0; i < count; i++) {
      const z = zStart + (span / (count + 1)) * (i + 1);
      const xOff = (Math.random() - 0.5) * 0.04;

      // Stalk
      const stalk = new THREE.Mesh(stalkGeo, wheatMat);
      stalk.position.set(rx + xOff, 0.18, z);
      stalk.rotation.z = (Math.random() - 0.5) * 0.12;
      stalk.castShadow = true;
      group.add(stalk);

      // Wheat head (cone)
      const head = new THREE.Mesh(headGeo, wheatMat);
      head.position.set(rx + xOff, 0.30, z);
      head.rotation.z = stalk.rotation.z;
      head.castShadow = true;
      group.add(head);
    }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 4. WHEAT BUNDLES (tied sheaves for decoration, 2 bundles) ─────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const bundleStalkGeo = new THREE.CylinderGeometry(0.008, 0.010, 0.16, 4);
  const bundleTieGeo   = new THREE.TorusGeometry(0.025, 0.005, 4, 8);

  [[-0.15, 0.20], [0.18, -0.25]].forEach(([bx, bz]) => {
    // 3 stalks leaning together
    for (let s = 0; s < 3; s++) {
      const lean = (s - 1) * 0.15;
      const bs = new THREE.Mesh(bundleStalkGeo, wheatMat);
      bs.position.set(bx + (s - 1) * 0.015, 0.16, bz);
      bs.rotation.z = lean;
      bs.castShadow = true;
      group.add(bs);
    }

    // Tie ring
    const tie = new THREE.Mesh(bundleTieGeo, tieMat);
    tie.position.set(bx, 0.16, bz);
    tie.rotation.x = Math.PI / 2;
    group.add(tie);
  });

  return group;
}

export const hexFieldsMeta = {
  id: 'hexFields',
  name: 'Tarlalar',
  category: 'Arazi',
  description: 'Tahıl üretir. Sıralar halinde buğday tarlası ve patika.',
  type: 'Hex Tile',
  materials: 4,
  geo: 'Prosedürel',
};
