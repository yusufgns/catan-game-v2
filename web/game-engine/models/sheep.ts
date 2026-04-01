import * as THREE from 'three';
import { mat, palette, addOutline } from './materials';

export function createSheep() {
  const group = new THREE.Group();

  // ── Palette ─────────────────────────────────────────────────────────────────
  const P = {
    wool:    palette('sheepWool'),
    skin:    palette('sheepSkin'),
    dark:    palette('sheepDark'),
    eye:     palette('sheepEye'),
    grass:   palette('grassGreen'),
    pink:    palette('flowerPink'),
    bell:    palette('flowerYellow'),
  };

  // ── Materials ───────────────────────────────────────────────────────────────
  const woolMat  = mat(P.wool);
  const skinMat  = mat(P.skin);
  const darkMat  = mat(P.dark);
  const eyeMat   = mat(P.eye);
  const grassMat = mat(P.grass);
  const pinkMat  = mat(P.pink);
  const bellMat  = mat(P.bell);
  const whiteMat = mat(0xffffff);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 1. BODY (fluffy cloud-like wool — many overlapping spheres) ────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const bodyCore = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10), woolMat);
  bodyCore.scale.set(1.25, 0.88, 1.0);
  bodyCore.position.y = 0.44;
  bodyCore.castShadow = true;
  bodyCore.receiveShadow = true;
  group.add(bodyCore);

  // Wool bumps — organic cloud clusters (14 bumps around the body)
  const woolBumps = [
    // Top row (larger)
    { pos: [0.00, 0.72, 0.00], r: 0.16 },
    { pos: [0.18, 0.70, 0.12], r: 0.14 },
    { pos: [-0.16, 0.71, 0.10], r: 0.15 },
    { pos: [0.10, 0.70, -0.14], r: 0.13 },
    { pos: [-0.12, 0.69, -0.12], r: 0.14 },
    // Mid ring (main volume)
    { pos: [0.30, 0.52, 0.18], r: 0.15 },
    { pos: [-0.28, 0.54, 0.20], r: 0.16 },
    { pos: [0.32, 0.50, -0.16], r: 0.14 },
    { pos: [-0.30, 0.52, -0.18], r: 0.15 },
    { pos: [0.00, 0.50, 0.28], r: 0.14 },
    { pos: [0.00, 0.50, -0.26], r: 0.13 },
    // Bottom ring (slightly smaller)
    { pos: [0.22, 0.36, 0.22], r: 0.12 },
    { pos: [-0.20, 0.38, 0.22], r: 0.13 },
    { pos: [-0.24, 0.36, -0.20], r: 0.12 },
    // Rear bump
    { pos: [-0.36, 0.48, 0.00], r: 0.14 },
  ];
  woolBumps.forEach(({ pos, r }) => {
    const bump = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), woolMat);
    bump.position.set(pos[0], pos[1], pos[2]);
    bump.castShadow = true;
    group.add(bump);
  });

  // ── Wool curls on top (small torus shapes) ────────────────────────────────
  const curlGeo = new THREE.TorusGeometry(0.04, 0.015, 6, 8);
  [
    [0.06, 0.78, 0.04, 0.4, 0.2],
    [-0.08, 0.77, -0.02, -0.3, 0.5],
    [0.00, 0.79, -0.06, 0.1, -0.3],
    [0.12, 0.76, -0.04, 0.6, 0.1],
  ].forEach(([x, y, z, rx, rz]) => {
    const curl = new THREE.Mesh(curlGeo, woolMat);
    curl.position.set(x, y, z);
    curl.rotation.x = rx;
    curl.rotation.z = rz;
    group.add(curl);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 2. HEAD (slightly larger, cute proportions) ────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), skinMat);
  head.position.set(0.46, 0.54, 0);
  head.castShadow = true;
  group.add(head);

  // Fluffy wool tuft on forehead
  const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 6), woolMat);
  tuft.position.set(0.38, 0.70, 0);
  tuft.scale.set(1.0, 0.8, 1.2);
  group.add(tuft);
  const tuft2 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 7, 5), woolMat);
  tuft2.position.set(0.42, 0.73, 0.05);
  group.add(tuft2);
  const tuft3 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 7, 5), woolMat);
  tuft3.position.set(0.42, 0.72, -0.06);
  group.add(tuft3);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 3. EYES (white sclera + dark pupil, nested spheres) ───────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  [0.13, -0.13].forEach((zOff) => {
    // Sclera (white outer)
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.050, 8, 6), whiteMat);
    sclera.position.set(0.60, 0.60, zOff);
    group.add(sclera);

    // Pupil (dark inner, offset forward)
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.030, 8, 6), eyeMat);
    pupil.position.set(0.64, 0.60, zOff);
    group.add(pupil);

    // Eyelid (curved mesh above eye)
    const lidGeo = new THREE.SphereGeometry(0.054, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.35);
    const lid = new THREE.Mesh(lidGeo, skinMat);
    lid.position.set(0.60, 0.62, zOff);
    lid.rotation.x = zOff > 0 ? -0.1 : 0.1;
    lid.rotation.z = -0.2;
    group.add(lid);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 4. EARS (with pink inner ear) ─────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  [1, -1].forEach((side) => {
    // Outer ear
    const earOuter = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 6),
      skinMat
    );
    earOuter.scale.set(1.0, 0.45, 1.5);
    earOuter.position.set(0.38, 0.64, side * 0.22);
    earOuter.rotation.x = side * -0.3;
    earOuter.rotation.z = side * 0.4;
    group.add(earOuter);

    // Inner ear (pink)
    const earInner = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 6),
      pinkMat
    );
    earInner.scale.set(0.8, 0.35, 1.3);
    earInner.position.set(0.39, 0.64, side * 0.23);
    earInner.rotation.x = side * -0.3;
    earInner.rotation.z = side * 0.4;
    group.add(earInner);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 5. SNOUT (with nostrils & smile) ──────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const snout = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.13, 0.10, 12),
    skinMat
  );
  snout.position.set(0.65, 0.47, 0);
  snout.rotation.z = Math.PI / 2;
  snout.castShadow = true;
  group.add(snout);

  // Nostrils
  const nostrilGeo = new THREE.SphereGeometry(0.022, 6, 4);
  const nL = new THREE.Mesh(nostrilGeo, darkMat);
  nL.position.set(0.74, 0.49, 0.045);
  const nR = new THREE.Mesh(nostrilGeo, darkMat);
  nR.position.set(0.74, 0.49, -0.045);
  group.add(nL, nR);

  // Smile curve (thin torus arc under nostrils)
  const smileGeo = new THREE.TorusGeometry(0.04, 0.006, 6, 12, Math.PI * 0.7);
  const smile = new THREE.Mesh(smileGeo, darkMat);
  smile.position.set(0.73, 0.44, 0);
  smile.rotation.y = Math.PI / 2;
  smile.rotation.x = Math.PI;
  group.add(smile);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 6. BELL & COLLAR ──────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  // Collar (thin torus around neck)
  const collarGeo = new THREE.TorusGeometry(0.12, 0.015, 8, 16);
  const collar = new THREE.Mesh(collarGeo, darkMat);
  collar.position.set(0.34, 0.42, 0);
  collar.rotation.y = Math.PI / 2;
  collar.rotation.x = Math.PI / 2;
  group.add(collar);

  // Bell (golden sphere)
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), bellMat);
  bell.position.set(0.34, 0.28, 0);
  bell.castShadow = true;
  group.add(bell);

  // Bell ring (tiny torus on top of bell)
  const bellRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.015, 0.005, 6, 8),
    bellMat
  );
  bellRing.position.set(0.34, 0.32, 0);
  group.add(bellRing);

  // Bell slit (dark line at bottom)
  const bellSlit = new THREE.Mesh(
    new THREE.BoxGeometry(0.002, 0.025, 0.05),
    darkMat
  );
  bellSlit.position.set(0.34, 0.26, 0);
  group.add(bellSlit);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 7. LEGS (two-segment with knee bend) ──────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const legPositions = [
    { x:  0.22, z:  0.18, rot: 0.08 },  // front-left
    { x:  0.22, z: -0.18, rot: 0.08 },  // front-right
    { x: -0.24, z:  0.18, rot: -0.06 }, // back-left
    { x: -0.24, z: -0.18, rot: -0.06 }, // back-right
  ];

  const upperLegGeo = new THREE.CylinderGeometry(0.050, 0.042, 0.18, 8);
  const lowerLegGeo = new THREE.CylinderGeometry(0.042, 0.035, 0.16, 8);
  const kneeGeo     = new THREE.SphereGeometry(0.044, 6, 5);

  legPositions.forEach(({ x, z, rot }) => {
    // Upper leg
    const upper = new THREE.Mesh(upperLegGeo, darkMat);
    upper.position.set(x, 0.30, z);
    upper.rotation.z = rot;
    upper.castShadow = true;
    group.add(upper);

    // Knee joint
    const knee = new THREE.Mesh(kneeGeo, darkMat);
    knee.position.set(x + rot * 0.3, 0.21, z);
    group.add(knee);

    // Lower leg (slightly angled back)
    const lower = new THREE.Mesh(lowerLegGeo, darkMat);
    lower.position.set(x + rot * 0.15, 0.12, z);
    lower.rotation.z = -rot * 0.5;
    lower.castShadow = true;
    group.add(lower);
  });

  // ── Cloven hooves (split at bottom) ───────────────────────────────────────
  const hoofHalfGeo = new THREE.BoxGeometry(0.04, 0.05, 0.04);
  legPositions.forEach(({ x, z, rot }) => {
    const hx = x + rot * 0.15;
    // Left half of hoof
    const hoofL = new THREE.Mesh(hoofHalfGeo, darkMat);
    hoofL.position.set(hx, 0.025, z + 0.022);
    hoofL.castShadow = true;
    group.add(hoofL);
    // Right half of hoof
    const hoofR = new THREE.Mesh(hoofHalfGeo, darkMat);
    hoofR.position.set(hx, 0.025, z - 0.022);
    hoofR.castShadow = true;
    group.add(hoofR);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 8. FLUFFY TAIL (cluster of small spheres) ─────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const tailBumps = [
    [-0.46, 0.52, 0.00, 0.07],
    [-0.50, 0.55, 0.03, 0.06],
    [-0.48, 0.56, -0.03, 0.05],
    [-0.52, 0.52, 0.00, 0.05],
    [-0.49, 0.50, 0.02, 0.04],
  ];
  tailBumps.forEach(([x, y, z, r]) => {
    const tb = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 5), woolMat);
    tb.position.set(x, y, z);
    group.add(tb);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 9. GRASS PATCH (flat disc with grass blades) ──────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  // Ground disc
  const groundDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.52, 0.52, 0.02, 20),
    grassMat
  );
  groundDisc.position.y = 0.01;
  groundDisc.receiveShadow = true;
  group.add(groundDisc);

  // Grass blades around the disc
  const bladeGeo = new THREE.ConeGeometry(0.010, 0.06, 3);
  const bladePositions = [
    [-0.40, 0.30], [0.38, 0.28], [-0.34, -0.32],
    [0.36, -0.28], [-0.28, 0.38], [0.30, -0.36],
    [0.42, 0.08], [-0.42, -0.08], [0.10, 0.44],
    [-0.15, -0.42], [0.44, -0.12], [-0.38, 0.20],
  ];
  bladePositions.forEach(([bx, bz]) => {
    for (let g = 0; g < 3; g++) {
      const blade = new THREE.Mesh(bladeGeo, grassMat);
      blade.position.set(
        bx + (Math.random() - 0.5) * 0.05,
        0.04,
        bz + (Math.random() - 0.5) * 0.05
      );
      blade.rotation.z = (Math.random() - 0.5) * 0.3;
      blade.rotation.x = (Math.random() - 0.5) * 0.2;
      group.add(blade);
    }
  });

  // ── Assemble ──────────────────────────────────────────────────────────────
  addOutline(group);
  return group;
}

export const sheepMeta = {
  id: 'sheep',
  name: 'Sheep',
  category: 'Kaynak',
  description: 'Yün kaynağını temsil eden sevimli, tüylü karikatür koyun. Detaylı yün dokusu, çan, çatal tırnak ve çimen zemin.',
  type: 'Kaynak Token',
  materials: 8,
  geo: 'Prosedürel',
};
