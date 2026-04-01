/**
 * Mountains hex terrain tile — produces Ore.
 * Gray rocky base with jagged peaks, snow caps, crystal formations, and debris.
 * Kept lightweight (~25 meshes) for instancing across the board.
 */
import * as THREE from 'three';
import { mat, palette } from './materials';
import { createHexPlate } from './hexBase';

export function createHexMountains() {
  const group = new THREE.Group();

  // ── Palette ─────────────────────────────────────────────────────────────────
  const P = {
    ground:  palette('hexMountainsGround'),
    rock:    palette('hexMountainsRock'),
    peak:    palette('hexMountainsPeak'),
    crystal: palette('oreCrystal'),
  };

  // ── Materials ───────────────────────────────────────────────────────────────
  const groundMat  = mat(P.ground);
  const rockMat    = mat(P.rock);
  const peakMat    = mat(P.peak);
  const crystalMat = mat(P.crystal, { emissive: P.crystal, emissiveIntensity: 0.4 });

  // ── 1. HEX BASE PLATE ──────────────────────────────────────────────────────
  const plate = createHexPlate(0.95, 0.08, groundMat);
  group.add(plate);

  // ── 2. CENTRAL MOUNTAIN PEAK (tall dodecahedron + snow cap) ─────────────────
  const mainPeak = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.22, 1),
    rockMat
  );
  mainPeak.position.set(0, 0.08 + 0.18, 0);
  mainPeak.scale.set(0.8, 1.6, 0.8);
  mainPeak.rotation.y = 0.3;
  mainPeak.castShadow = true;
  mainPeak.receiveShadow = true;
  group.add(mainPeak);

  // Snow cap on central peak (small flattened sphere at top)
  const snowCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.10, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    peakMat
  );
  snowCap.position.set(0, 0.08 + 0.38, 0);
  snowCap.scale.set(1.0, 0.35, 1.0);
  snowCap.castShadow = true;
  group.add(snowCap);

  // ── 3. SECONDARY PEAKS (2 smaller dodecahedrons) ───────────────────────────
  const sidePeaks = [
    { x: -0.32, z: -0.15, r: 0.15, sy: 1.3, ry: 0.8 },
    { x:  0.28, z:  0.22, r: 0.13, sy: 1.1, ry: -0.5 },
  ];
  sidePeaks.forEach(({ x, z, r, sy, ry }) => {
    const peak = new THREE.Mesh(
      new THREE.DodecahedronGeometry(r, 1),
      rockMat
    );
    peak.position.set(x, 0.08 + r * sy * 0.7, z);
    peak.scale.set(0.85, sy, 0.85);
    peak.rotation.y = ry;
    peak.castShadow = true;
    peak.receiveShadow = true;
    group.add(peak);

    // Small snow patch on each side peak
    const snow = new THREE.Mesh(
      new THREE.SphereGeometry(r * 0.5, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2),
      peakMat
    );
    snow.position.set(x, 0.08 + r * sy * 1.2, z);
    snow.scale.set(1.0, 0.3, 1.0);
    group.add(snow);
  });

  // ── 4. CRYSTAL FORMATIONS (2 emissive cones) ───────────────────────────────
  const crystals = [
    { x:  0.15, z: -0.30, h: 0.08, r: 0.02, ry: 0.4,  rz: 0.15 },
    { x: -0.18, z:  0.28, h: 0.06, r: 0.015, ry: -0.6, rz: -0.20 },
  ];
  crystals.forEach(({ x, z, h, r, ry, rz }) => {
    const crystal = new THREE.Mesh(
      new THREE.ConeGeometry(r, h, 5),
      crystalMat
    );
    crystal.position.set(x, 0.08 + h / 2, z);
    crystal.rotation.y = ry;
    crystal.rotation.z = rz;
    crystal.castShadow = true;
    group.add(crystal);
  });

  // ── 5. ROCKY DEBRIS at base (8 small irregular rocks) ──────────────────────
  const debris = [
    { x: -0.45, z:  0.10, r: 0.030 },
    { x:  0.42, z: -0.15, r: 0.025 },
    { x: -0.10, z: -0.45, r: 0.035 },
    { x:  0.35, z:  0.35, r: 0.020 },
    { x: -0.38, z: -0.30, r: 0.028 },
    { x:  0.08, z:  0.45, r: 0.022 },
    { x:  0.48, z:  0.05, r: 0.018 },
    { x: -0.25, z:  0.40, r: 0.024 },
  ];
  debris.forEach(({ x, z, r }) => {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(r, 0),
      rockMat
    );
    rock.position.set(x, 0.08 + r * 0.6, z);
    rock.scale.y = 0.5 + Math.random() * 0.3;
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);
  });

  // ── 6. ROCKY RIDGE connecting peaks (elongated box) ─────────────────────────
  const ridge = new THREE.Mesh(
    new THREE.BoxGeometry(0.50, 0.06, 0.10),
    rockMat
  );
  ridge.position.set(-0.05, 0.08 + 0.04, 0.02);
  ridge.rotation.y = 0.4;
  ridge.receiveShadow = true;
  group.add(ridge);

  return group;
}

export const hexMountainsMeta = {
  id: 'hexMountains',
  name: 'Dağlar',
  category: 'Arazi',
  description: 'Cevher üreten dağlık arazi. Karlı zirveler, kristal oluşumları ve kaya döküntüleri içerir.',
  type: 'Hex Tile',
  materials: 4,
  geo: 'Prosedürel',
};
