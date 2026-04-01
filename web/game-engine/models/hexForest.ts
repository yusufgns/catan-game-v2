/**
 * Forest hex terrain tile — produces lumber.
 * Pine trees, undergrowth bushes, and mushrooms on a green hex base.
 * Kept lightweight (~25 meshes) for instancing across the board.
 */
import * as THREE from 'three';
import { mat, palette } from './materials';
import { createHexPlate } from './hexBase';

export function createHexForest() {
  const group = new THREE.Group();

  // ── Palette ─────────────────────────────────────────────────────────────────
  const P = {
    ground: palette('hexForestGround'),
    tree:   palette('hexForestTree'),
    trunk:  palette('hexForestTrunk'),
    flower: palette('flowerPink'),
  };

  // ── Materials ─────────────────────────────────────────────────────────────
  const groundMat = mat(P.ground);
  const treeMat   = mat(P.tree);
  const trunkMat  = mat(P.trunk);
  const mushCapMat = mat(0xcc3322);
  const mushDotMat = mat(0xf5f0e8);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 1. HEX BASE PLATE ────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const plate = createHexPlate(0.95, 0.08, groundMat);
  group.add(plate);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 2. PINE TREES (6 trees) ───────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  // Shared geometries for reuse
  const trunkGeo  = new THREE.CylinderGeometry(0.025, 0.035, 0.22, 6);
  const coneBot   = new THREE.ConeGeometry(0.14, 0.18, 6);
  const coneMid   = new THREE.ConeGeometry(0.11, 0.16, 6);
  const coneTop   = new THREE.ConeGeometry(0.08, 0.14, 6);

  const treePositions = [
    [0.00,  0.20],
    [-0.30,  0.10],
    [ 0.32,  0.08],
    [-0.15, -0.25],
    [ 0.20, -0.30],
    [-0.38, -0.18],
  ];

  treePositions.forEach(([tx, tz]) => {
    const scale = 0.8 + Math.random() * 0.4;
    const treeGroup = new THREE.Group();
    treeGroup.position.set(tx, 0.08, tz);
    treeGroup.scale.setScalar(scale);

    // Trunk
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.11;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // Three cone tiers
    const bot = new THREE.Mesh(coneBot, treeMat);
    bot.position.y = 0.28;
    bot.castShadow = true;
    treeGroup.add(bot);

    const mid = new THREE.Mesh(coneMid, treeMat);
    mid.position.y = 0.40;
    mid.castShadow = true;
    treeGroup.add(mid);

    const top = new THREE.Mesh(coneTop, treeMat);
    top.position.y = 0.50;
    top.castShadow = true;
    treeGroup.add(top);

    group.add(treeGroup);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 3. UNDERGROWTH BUSHES (3 spheres) ─────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const bushGeo = new THREE.SphereGeometry(0.06, 6, 5);
  const bushMat = mat(0x2a8a3a);

  [[0.42, 0.25], [-0.10, 0.40], [0.10, -0.45]].forEach(([bx, bz]) => {
    const bush = new THREE.Mesh(bushGeo, bushMat);
    bush.position.set(bx, 0.11, bz);
    bush.scale.y = 0.7;
    bush.castShadow = true;
    group.add(bush);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 4. MUSHROOMS (2 small ones) ───────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const stemGeo = new THREE.CylinderGeometry(0.012, 0.015, 0.04, 5);
  const capGeo  = new THREE.SphereGeometry(0.025, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  const stemMat = mat(0xf0e8d0);

  [[-0.25, 0.38], [0.40, -0.15]].forEach(([mx, mz]) => {
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.set(mx, 0.10, mz);
    group.add(stem);

    const cap = new THREE.Mesh(capGeo, mushCapMat);
    cap.position.set(mx, 0.12, mz);
    cap.castShadow = true;
    group.add(cap);
  });

  return group;
}

export const hexForestMeta = {
  id: 'hexForest',
  name: 'Orman',
  category: 'Arazi',
  description: 'Kereste üretir. Çam ağaçları, çalılar ve mantarlar.',
  type: 'Hex Tile',
  materials: 6,
  geo: 'Prosedürel',
};
