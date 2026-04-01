/**
 * Ocean hex terrain tile for the Catan board.
 * Surrounds the island — instanced 18 times, so kept lightweight (≤15 meshes).
 */
import * as THREE from 'three';
import { mat, palette } from './materials';
import { createHexPlate } from './hexBase';

export function createHexOcean() {
  const group = new THREE.Group();

  // ── Palette ─────────────────────────────────────────────────────────────────
  const P = {
    water: palette('hexOceanWater'),
    deep:  palette('hexOceanDeep'),
  };

  // ── Materials ─────────────────────────────────────────────────────────────
  const waterMat = mat(P.water);
  const deepMat  = mat(P.deep);
  const foamMat  = mat(0xddeeff, { emissive: 0xddeeff, emissiveIntensity: 0.15 });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 1. HEX BASE PLATE (water surface) ─────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const base = createHexPlate(0.95, 0.06, waterMat);
  group.add(base);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 2. DEEP WATER DISC (darker center region for depth illusion) ──────────
  // ══════════════════════════════════════════════════════════════════════════════
  const deepDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 6),
    deepMat
  );
  deepDisc.rotation.x = -Math.PI / 2;
  deepDisc.position.y = 0.062;
  deepDisc.receiveShadow = true;
  group.add(deepDisc);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 3. WAVE RINGS (concentric torus ripples on the surface) ───────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const waveRadii = [0.28, 0.52, 0.74];
  waveRadii.forEach((r, i) => {
    const wave = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.008, 4, 24),
      deepMat
    );
    wave.rotation.x = -Math.PI / 2;
    wave.position.set(
      (i - 1) * 0.04,    // slight offset so they don't look perfectly centred
      0.065,
      (i - 1) * 0.03
    );
    wave.receiveShadow = true;
    group.add(wave);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 4. FOAM CRESTS (small flattened white spheres) ────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const foamPositions = [
    [ 0.30,  0.18],
    [-0.22, -0.35],
    [ 0.10,  0.48],
  ];
  foamPositions.forEach(([fx, fz]) => {
    const foam = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 3),
      foamMat
    );
    foam.position.set(fx, 0.065, fz);
    foam.scale.set(1.6, 0.15, 1.0);
    foam.rotation.y = Math.random() * Math.PI;
    group.add(foam);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 5. STARFISH (cute detail — 5 tiny elongated boxes in a star) ──────────
  // ══════════════════════════════════════════════════════════════════════════════
  const starGroup = new THREE.Group();
  starGroup.position.set(-0.18, 0.063, -0.12);
  starGroup.rotation.y = 0.6;

  const starMat = mat(0xdd5533);
  const armGeo = new THREE.BoxGeometry(0.015, 0.006, 0.055);
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const arm = new THREE.Mesh(armGeo, starMat);
    arm.position.set(
      Math.cos(angle) * 0.022,
      0,
      Math.sin(angle) * 0.022
    );
    arm.rotation.y = -angle + Math.PI / 2;
    // taper the arm outward by scaling
    arm.scale.set(0.7, 1, 1);
    starGroup.add(arm);
  }

  // Centre body dot
  const starCenter = new THREE.Mesh(
    new THREE.SphereGeometry(0.012, 5, 3),
    starMat
  );
  starCenter.scale.y = 0.4;
  starGroup.add(starCenter);

  group.add(starGroup);

  // ── Total mesh count: 1 (base) + 1 (deep disc) + 3 (waves) + 3 (foam)
  //    + 5 (star arms) + 1 (star centre) = 14 meshes  ✓

  return group;
}

export const hexOceanMeta = {
  id: 'hex-ocean',
  name: 'Ocean Hex',
  category: 'Arazi',
  description: 'Ada etrafını saran okyanus hex karesi — dalga halkaları, köpük ve denizyıldızı detaylarıyla.',
  type: 'Hex Tile',
  materials: 4,
  geo: 'Prosedürel',
};
