import * as THREE from 'three';

/**
 * BoardArt — from-scratch board visual kit.
 * Faceted low-poly terrain, 3D number tokens, glow placement markers.
 * All builders are deterministic via seeded RNG so the board never flickers
 * between rebuilds.
 */

// ─── Seeded RNG (mulberry32) ────────────────────────────────────────────────
export function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Palette — warm storybook island ────────────────────────────────────────
export const ART = {
  sandTop: 0xead7a6, sandSide: 0xc4a570,
  forest: 0x55a05e, forestSide: 0x3d7a46,
  pasture: 0x8fca66, pastureSide: 0x6ca649,
  fields: 0xe7bd55, fieldsSide: 0xc59a38,
  hills: 0xcc7448, hillsSide: 0xa25731,
  mountains: 0x97a3b0, mountainsSide: 0x74818f,
  desert: 0xe6d3a0, desertSide: 0xc2ac79,

  pineDark: 0x2f7e44, pine: 0x429c58, pineLight: 0x5cb970,
  trunk: 0x7a5433, trunkDark: 0x5c3e24,
  rock: 0x8a99a8, rockDark: 0x67788a, snow: 0xf5f8fc,
  wheat: 0xf5da79, wheatDark: 0xd9b44a, hay: 0xe3c25e,
  brick: 0xc2522e, brickLight: 0xda6f48, clay: 0xb2603a, emberGlow: 0xff7733,
  wool: 0xf8f4ed, sheepFace: 0x453629,
  fence: 0x9b7449,
  cactus: 0x5c9e50, cactusDark: 0x487f3e,
  bone: 0xf2ead6,
  flowerA: 0xffffff, flowerB: 0xffd94a, flowerC: 0xff8fb1,

  tokenFace: 0xf7efdc, tokenSide: 0xd9c9a3, tokenHot: 0xd43c2e, tokenInk: 0x2b2015,
  markerGold: 0xffd76a, markerRed: 0xff5544,
};

function m(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness: 0.85, metalness: 0, flatShading: true, ...opts,
  });
}

// Shared materials (module-level, reused across all hexes)
const MAT = {
  trunk: m(ART.trunk), trunkDark: m(ART.trunkDark),
  pineDark: m(ART.pineDark), pine: m(ART.pine), pineLight: m(ART.pineLight),
  rock: m(ART.rock), rockDark: m(ART.rockDark),
  snow: m(ART.snow, { roughness: 0.55 }),
  wheat: m(ART.wheat, { roughness: 0.7 }), wheatDark: m(ART.wheatDark, { roughness: 0.72 }),
  hay: m(ART.hay, { roughness: 0.75 }),
  brick: m(ART.brick, { roughness: 0.7 }), brickLight: m(ART.brickLight, { roughness: 0.72 }),
  clay: m(ART.clay),
  ember: m(0x331507, { emissive: ART.emberGlow, emissiveIntensity: 1.4, roughness: 0.6 }),
  wool: m(ART.wool, { roughness: 0.95 }), sheepFace: m(ART.sheepFace),
  fence: m(ART.fence),
  cactus: m(ART.cactus), cactusDark: m(ART.cactusDark),
  bone: m(ART.bone, { roughness: 0.6 }),
  sandDune: m(ART.desert, { roughness: 0.9 }),
  knoll: m(0x9ed474, { roughness: 0.9 }),
  flowerStem: m(0x4d8a3c),
};

function place(g: THREE.Group, mesh: THREE.Mesh, x: number, y: number, z: number, ry = 0, shadow = true) {
  mesh.position.set(x, y, z);
  if (ry) mesh.rotation.y = ry;
  if (shadow) mesh.castShadow = true;
  g.add(mesh);
  return mesh;
}

// ─── FOREST — dense two-tone pine cluster ───────────────────────────────────
export function buildForest(g: THREE.Group, y: number, s: number, seed: number) {
  const rnd = makeRng(seed);
  const pineMats = [MAT.pineDark, MAT.pine, MAT.pineLight];

  // Ring + center layout, biased away from token zone (+z edge)
  const spots: [number, number][] = [
    [0, -0.12], [-0.38, 0.1], [0.36, 0.06], [-0.2, -0.42], [0.22, -0.4],
    [-0.48, -0.22], [0.5, -0.24], [0.04, 0.34], [-0.3, 0.38],
  ];
  spots.forEach(([dx, dz], i) => {
    const px = dx * s * 0.82 + (rnd() - 0.5) * 0.06 * s;
    const pz = dz * s * 0.82 + (rnd() - 0.5) * 0.06 * s;
    const h = (0.55 + rnd() * 0.5) * s;      // tree height
    const rw = h * 0.34;                      // canopy radius
    const mat = pineMats[i % 3];

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * s, 0.05 * s, h * 0.3, 5), MAT.trunk);
    place(g, trunk, px, y + h * 0.15, pz);

    // 3 stacked cones, each smaller — classic stylized pine
    let cy = y + h * 0.28;
    for (let t = 0; t < 3; t++) {
      const cr = rw * (1 - t * 0.28);
      const ch = h * (0.36 - t * 0.05);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(cr, ch, 6), mat);
      place(g, cone, px, cy + ch * 0.42, pz, rnd() * Math.PI);
      cy += ch * 0.55;
    }
  });

  // Mushrooms
  for (let i = 0; i < 2; i++) {
    const mx = (rnd() - 0.5) * s * 0.8, mz = (rnd() * 0.5 + 0.1) * s * 0.7;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015 * s, 0.02 * s, 0.05 * s, 5), MAT.wool);
    place(g, stem, mx, y + 0.025 * s, mz, 0, false);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.035 * s, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), MAT.brickLight);
    place(g, cap, mx, y + 0.05 * s, mz, 0, false);
  }
}

// ─── PASTURE — rolling knolls, sheep, flowers ───────────────────────────────
export function buildPasture(g: THREE.Group, y: number, s: number, seed: number) {
  const rnd = makeRng(seed);

  // Soft knolls
  [[-0.3, -0.2, 0.34], [0.34, 0.05, 0.28], [0.02, -0.48, 0.24]].forEach(([dx, dz, r]) => {
    const knoll = new THREE.Mesh(new THREE.SphereGeometry(r * s, 7, 5), MAT.knoll);
    knoll.scale.set(1.25, 0.32, 1.1);
    place(g, knoll, dx * s * 0.8, y, dz * s * 0.8, rnd() * Math.PI, false);
    knoll.receiveShadow = true;
  });

  // Sheep — chunky & cute
  const sheepAt = (px: number, pz: number, ry: number, sc = 1) => {
    const grp = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.11 * s * sc, 7, 5), MAT.wool);
    body.scale.set(1.3, 1.0, 1.05);
    place(grp, body, 0, 0.12 * s * sc, 0);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.055 * s * sc, 6, 5), MAT.sheepFace);
    place(grp, head, 0.13 * s * sc, 0.14 * s * sc, 0);
    // Ears
    [-1, 1].forEach(side => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.02 * s * sc, 4, 3), MAT.sheepFace);
      ear.scale.set(1.6, 0.6, 0.8);
      place(grp, ear, 0.13 * s * sc, 0.18 * s * sc, side * 0.045 * s * sc, 0, false);
    });
    // Legs
    [[-0.05, 0.04], [-0.05, -0.04], [0.06, 0.04], [0.06, -0.04]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.014 * s * sc, 0.014 * s * sc, 0.08 * s * sc, 4), MAT.sheepFace);
      place(grp, leg, lx * s * sc, 0.04 * s * sc, lz * s * sc, 0, false);
    });
    grp.position.set(px, y, pz);
    grp.rotation.y = ry;
    g.add(grp);
  };
  sheepAt(-0.1 * s, 0.12 * s, rnd() * Math.PI * 2);
  sheepAt(0.3 * s, -0.3 * s, rnd() * Math.PI * 2, 0.85);
  sheepAt(-0.42 * s, -0.35 * s, rnd() * Math.PI * 2, 0.75);

  // Flowers
  const petals = [MAT.wool, m(ART.flowerB), m(ART.flowerC)];
  for (let i = 0; i < 6; i++) {
    const fx = (rnd() - 0.5) * s * 1.1, fz = (rnd() - 0.5) * s * 1.0;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.006 * s, 0.006 * s, 0.06 * s, 4), MAT.flowerStem);
    place(g, stem, fx, y + 0.03 * s, fz, 0, false);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.018 * s, 5, 4), petals[i % 3]);
    place(g, head, fx, y + 0.065 * s, fz, 0, false);
  }
}

// ─── FIELDS — golden crop strips ────────────────────────────────────────────
export function buildFields(g: THREE.Group, y: number, s: number, seed: number) {
  const rnd = makeRng(seed);
  const rowRot = rnd() * Math.PI;
  const rows = new THREE.Group();
  rows.rotation.y = rowRot;
  rows.position.y = y;
  g.add(rows);

  // Crop strips — long low windrows with furrow gaps between them
  const rowZ = [-0.48, -0.24, 0, 0.24, 0.48];
  rowZ.forEach((rz, ri) => {
    const rowLen = Math.sqrt(Math.max(0, 1 - (rz / 0.78) ** 2)) * 1.2; // fit in hex
    const segs = Math.max(2, Math.round(rowLen * 3));
    for (let i = 0; i < segs; i++) {
      const t = (i + 0.5) / segs - 0.5;
      const bx = t * rowLen * s;
      const h = (0.07 + rnd() * 0.05) * s;
      const segW = rowLen * s / segs * 0.9;
      const crop = new THREE.Mesh(
        new THREE.BoxGeometry(segW, h, 0.13 * s),
        (ri + i) % 2 === 0 ? MAT.wheat : MAT.wheatDark,
      );
      place(rows, crop, bx, h / 2 + 0.005 * s, rz * s * 0.92, 0);
      // Wheat tips — tiny cones on top for texture
      if (i % 2 === ri % 2) {
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.025 * s, 0.06 * s, 5), MAT.hay);
        place(rows, tip, bx + (rnd() - 0.5) * segW * 0.5, h + 0.03 * s, rz * s * 0.92, 0, false);
      }
    }
  });

  // Hay bales
  for (let i = 0; i < 2; i++) {
    const bale = new THREE.Mesh(new THREE.CylinderGeometry(0.075 * s, 0.075 * s, 0.11 * s, 9), MAT.hay);
    bale.rotation.z = Math.PI / 2;
    bale.rotation.y = rnd() * Math.PI;
    bale.position.set((rnd() - 0.5) * s * 0.4, y + 0.075 * s, (rnd() - 0.5) * s * 0.3);
    bale.castShadow = true;
    g.add(bale);
  }
}

// ─── HILLS — terraced clay mounds, kiln with ember glow ─────────────────────
export function buildHills(g: THREE.Group, y: number, s: number, seed: number) {
  const rnd = makeRng(seed);

  // Terraced clay quarry — crisp angular tiers (6-sided, aligned facets)
  const moundAt = (px: number, pz: number, baseR: number, tiers: number, rot: number) => {
    let r = baseR, ty = y;
    for (let t = 0; t < tiers; t++) {
      const h = 0.065 * s;
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(r * 0.9, r, h, 6),
        t % 2 === 0 ? MAT.clay : MAT.brickLight,
      );
      place(g, disc, px, ty + h / 2, pz, rot);
      ty += h;
      r *= 0.68;
    }
    // Crown block
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r * 0.95, 0.05 * s, 6), MAT.brick);
    place(g, crown, px, ty + 0.025 * s, pz, rot);
  };
  moundAt(-0.28 * s, -0.18 * s, 0.36 * s, 3, rnd() * Math.PI);
  moundAt(0.32 * s, 0.08 * s, 0.27 * s, 2, rnd() * Math.PI);
  moundAt(0.02 * s, -0.48 * s, 0.2 * s, 2, rnd() * Math.PI);

  // Kiln — dome with glowing mouth
  const kiln = new THREE.Mesh(new THREE.SphereGeometry(0.16 * s, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), MAT.brick);
  place(g, kiln, 0.02 * s, y, 0.34 * s);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.07 * s, 0.06 * s, 0.03 * s), MAT.ember);
  place(g, mouth, 0.02 * s, y + 0.035 * s, 0.34 * s + 0.15 * s, 0, false);
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.028 * s, 0.038 * s, 0.1 * s, 6), MAT.brick);
  place(g, chimney, 0.02 * s, y + 0.18 * s, 0.34 * s);

  // Brick stacks
  const brickGeo = new THREE.BoxGeometry(0.09 * s, 0.032 * s, 0.045 * s);
  [[-0.5, 0.28], [0.46, -0.32]].forEach(([bx, bz]) => {
    for (let i = 0; i < 5; i++) {
      const brick = new THREE.Mesh(brickGeo, i % 2 === 0 ? MAT.brick : MAT.brickLight);
      place(g, brick,
        bx * s + (i % 2) * 0.03 * s,
        y + 0.016 * s + Math.floor(i / 2) * 0.034 * s,
        bz * s + (rnd() - 0.5) * 0.02 * s,
        (i % 2) * 0.4);
    }
  });
}

// ─── MOUNTAINS — bold faceted massif with snow caps ─────────────────────────
export function buildMountains(g: THREE.Group, y: number, s: number, seed: number) {
  const rnd = makeRng(seed);

  const peaks: [number, number, number, number][] = [
    // [dx, dz, radius, height]
    [0, -0.05, 0.34, 0.72],
    [-0.32, 0.16, 0.26, 0.5],
    [0.3, 0.2, 0.24, 0.44],
    [-0.16, -0.38, 0.2, 0.38],
    [0.24, -0.32, 0.18, 0.3],
  ];
  peaks.forEach(([dx, dz, r, h], i) => {
    const px = dx * s, pz = dz * s;
    const ry = rnd() * Math.PI;
    const peak = new THREE.Mesh(new THREE.ConeGeometry(r * s, h * s, 5), i % 2 === 0 ? MAT.rock : MAT.rockDark);
    place(g, peak, px, y + h * s * 0.5, pz, ry);

    // Snow cap on the taller peaks — same rotation so facets align
    if (h >= 0.44) {
      const capH = h * 0.3, capR = r * (capH / h) * 1.02;
      const cap = new THREE.Mesh(new THREE.ConeGeometry(capR * s, capH * s, 5), MAT.snow);
      place(g, cap, px, y + (h - capH * 0.5) * s + 0.002 * s, pz, ry, false);
    }
  });

  // Scree boulders
  for (let i = 0; i < 5; i++) {
    const a = rnd() * Math.PI * 2, d = (0.5 + rnd() * 0.16) * s;
    const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry((0.04 + rnd() * 0.03) * s, 0), MAT.rockDark);
    boulder.scale.y = 0.7;
    place(g, boulder, Math.cos(a) * d, y + 0.02 * s, Math.sin(a) * d, rnd() * Math.PI, false);
  }
}

// ─── DESERT — dunes, saguaro, skull ─────────────────────────────────────────
export function buildDesert(g: THREE.Group, y: number, s: number, seed: number) {
  const rnd = makeRng(seed);

  [[-0.24, 0.14, 0.3], [0.26, -0.12, 0.24], [-0.02, -0.4, 0.2]].forEach(([dx, dz, r]) => {
    const dune = new THREE.Mesh(new THREE.SphereGeometry(r * s, 8, 5), MAT.sandDune);
    dune.scale.set(1.4, 0.22, 1.1);
    place(g, dune, dx * s * 0.8, y, dz * s * 0.8, rnd() * Math.PI, false);
    dune.receiveShadow = true;
  });

  // Agave — radiating faceted leaves, reads clearly from above
  const cx = 0.34 * s, cz = 0.3 * s;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.028 * s, 0.16 * s, 4), i % 2 ? MAT.cactus : MAT.cactusDark);
    leaf.rotation.z = Math.PI * 0.68;
    leaf.rotation.y = a;
    const lg = new THREE.Group();
    lg.add(leaf);
    leaf.position.set(0.07 * s, 0.045 * s, 0);
    lg.rotation.y = a;
    lg.position.set(cx, y, cz);
    g.add(lg);
    leaf.castShadow = true;
  }
  const agaveCore = new THREE.Mesh(new THREE.ConeGeometry(0.035 * s, 0.12 * s, 5), MAT.cactus);
  place(g, agaveCore, cx, y + 0.06 * s, cz);

  // Barrel cactus
  const barrel = new THREE.Mesh(new THREE.SphereGeometry(0.05 * s, 8, 6), MAT.cactusDark);
  barrel.scale.set(1, 1.35, 1);
  place(g, barrel, -0.15 * s, y + 0.055 * s, 0.42 * s);

  // Cow skull
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.045 * s, 6, 5), MAT.bone);
  skull.scale.set(1, 0.8, 1.15);
  place(g, skull, -0.4 * s, y + 0.03 * s, -0.1 * s, 0, false);
  [-1, 1].forEach(side => {
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.008 * s, 0.016 * s, 0.09 * s, 5), MAT.bone);
    horn.rotation.z = side * 1.35;
    place(g, horn, -0.4 * s + side * 0.06 * s, y + 0.045 * s, -0.1 * s, 0, false);
  });

  // Pebbles
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Mesh(new THREE.DodecahedronGeometry(0.02 * s, 0), MAT.rockDark);
    p.scale.y = 0.6;
    place(g, p, (rnd() - 0.5) * s, y + 0.01 * s, (rnd() - 0.5) * s * 0.9, 0, false);
  }
}

export const TERRAIN_BUILDERS: Record<string, (g: THREE.Group, y: number, s: number, seed: number) => void> = {
  forest: buildForest,
  pasture: buildPasture,
  fields: buildFields,
  hills: buildHills,
  mountains: buildMountains,
  desert: buildDesert,
};

// ─── NUMBER TOKEN — real 3D disc with crisp typography ──────────────────────
export function makeToken3D(number: number): THREE.Group {
  const SIZE = 512, cx = SIZE / 2, cy = SIZE / 2;
  const isHot = number === 6 || number === 8;
  const pips = ({ 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 } as Record<number, number>)[number] || 0;

  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const ctx = c.getContext('2d')!;

  // Face — slightly darker cream so ACES tone mapping can't blow it out
  ctx.fillStyle = '#ece0c2';
  ctx.fillRect(0, 0, SIZE, SIZE);
  const grad = ctx.createRadialGradient(cx, cy, SIZE * 0.1, cx, cy, SIZE * 0.55);
  grad.addColorStop(0, 'rgba(255,250,235,0.55)');
  grad.addColorStop(1, 'rgba(140,110,60,0.35)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Ring
  ctx.strokeStyle = isHot ? '#c92f21' : '#59431f';
  ctx.lineWidth = 24;
  ctx.beginPath(); ctx.arc(cx, cy, SIZE * 0.43, 0, Math.PI * 2); ctx.stroke();

  // Number
  ctx.fillStyle = isHot ? '#c92f21' : '#1c1207';
  ctx.font = `900 ${String(number).length > 1 ? 230 : 270}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(number), cx, cy - 20);

  // Pips
  const sp = 44, startX = cx - ((pips - 1) * sp) / 2;
  for (let i = 0; i < pips; i++) {
    ctx.beginPath(); ctx.arc(startX + i * sp, cy + 132, 16, 0, Math.PI * 2); ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;

  const R = 0.34, H = 0.055;
  const group = new THREE.Group();

  const side = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R * 1.04, H, 28, 1, false),
    new THREE.MeshStandardMaterial({ color: ART.tokenSide, roughness: 0.7 }),
  );
  side.position.y = H / 2;
  side.castShadow = true;
  group.add(side);

  // Basic material + toneMapped:false → the printed face keeps exact canvas
  // contrast regardless of scene lighting/exposure. Reads like a real sticker.
  const faceMat = new THREE.MeshBasicMaterial({ map: tex });
  faceMat.toneMapped = false;
  const face = new THREE.Mesh(new THREE.CircleGeometry(R * 0.99, 28), faceMat);
  face.rotation.x = -Math.PI / 2;
  face.position.y = H + 0.002;
  group.add(face);

  return group;
}

// ─── PLACEMENT MARKERS — glow rings instead of ghost noise ──────────────────

/** Invisible-but-raycastable hit volume. Flagged so opacity sweeps skip it. */
function hitVolume(radius: number, height: number): THREE.Mesh {
  const hit = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  hit.position.y = height / 2;
  hit.userData.isHitArea = true;
  return hit;
}

/** Tag every mesh with its intended max opacity, so sweeps scale rather than clobber. */
export function tagBaseOpacity(obj: THREE.Object3D) {
  obj.traverse((child: any) => {
    if (child.isMesh && child.material && !child.userData.isHitArea) {
      child.material.transparent = true;
      child.userData.baseOpacity = child.material.opacity ?? 1;
    }
  });
}

/** Golden pulse ring for intersections — floats above tile tops so it reads
 *  from oblique camera angles instead of drowning in the sand channel. */
export function makeIntersectionRing(): THREE.Group {
  const g = new THREE.Group();

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.2, 0.035, 10, 28),
    new THREE.MeshStandardMaterial({
      color: ART.markerGold, emissive: ART.markerGold, emissiveIntensity: 1.8,
      roughness: 0.4, transparent: true, opacity: 1,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.3;
  ring.name = 'marker-ring';
  g.add(ring);

  // Soft light pillar — visible from any angle, additive so it glows
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.13, 0.55, 10, 1, true),
    new THREE.MeshBasicMaterial({
      color: ART.markerGold, transparent: true, opacity: 0.35,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }),
  );
  pillar.position.y = 0.28;
  pillar.userData.baseOpacity = 0.35;
  g.add(pillar);

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.16, 20),
    new THREE.MeshBasicMaterial({
      color: ART.markerGold, transparent: true, opacity: 0.3,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.302;
  disc.userData.baseOpacity = 0.3;
  g.add(disc);

  g.add(hitVolume(0.32, 0.7));
  return g;
}

/** Golden glow bar for edges (roads) — raised above tile tops. */
export function makeEdgeGlow(length: number): THREE.Group {
  const g = new THREE.Group();

  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(length * 0.72, 0.06, 0.16),
    new THREE.MeshStandardMaterial({
      color: ART.markerGold, emissive: ART.markerGold, emissiveIntensity: 1.6,
      roughness: 0.4, transparent: true, opacity: 1,
    }),
  );
  bar.position.y = 0.26;
  bar.name = 'marker-bar';
  g.add(bar);

  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(length * 0.8, 0.4, 0.3),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  hit.position.y = 0.2;
  hit.userData.isHitArea = true;
  g.add(hit);

  return g;
}

/** Red target ring for robber hex selection. */
export function makeHexTargetRing(): THREE.Group {
  const g = new THREE.Group();

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.035, 10, 32),
    new THREE.MeshStandardMaterial({
      color: ART.markerRed, emissive: ART.markerRed, emissiveIntensity: 1.1,
      roughness: 0.4, transparent: true, opacity: 1,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  g.add(ring);

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.26, 24),
    new THREE.MeshBasicMaterial({ color: ART.markerRed, transparent: true, opacity: 0.22, depthWrite: false }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = -0.005;
  disc.userData.baseOpacity = 0.22;
  g.add(disc);

  g.add(hitVolume(0.34, 0.5));
  return g;
}
