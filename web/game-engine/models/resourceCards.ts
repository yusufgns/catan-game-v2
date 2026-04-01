/**
 * Catan Resource Card tokens — hex-shaped collectible game tokens.
 * 5 resource types per Catan rules: Lumber, Brick, Wool, Grain, Ore.
 * Each ~15-20 meshes, lightweight for game board instancing.
 */
import * as THREE from 'three';
import { mat, palette, addOutline } from './materials';
import { hexShape, createHexPlate } from './hexBase';

// ─── Shared card base builder ────────────────────────────────────────────────

function createCardBase(groundColor, innerColor, frameColor) {
  const group = new THREE.Group();

  // 1. Hex plate base
  const baseShape = hexShape(0.50);
  const baseGeo = new THREE.ExtrudeGeometry(baseShape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 2,
  });
  const baseMesh = new THREE.Mesh(baseGeo, mat(groundColor));
  baseMesh.rotation.x = -Math.PI / 2;
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // 2. Gold hex frame border (flush with base — no underside protrusion)
  const frameShape = hexShape(0.52);
  const innerFrame = hexShape(0.47);
  frameShape.holes.push(innerFrame);
  const frameGeo = new THREE.ExtrudeGeometry(frameShape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.010,
    bevelSize: 0.010,
    bevelSegments: 1,
  });
  const frameMesh = new THREE.Mesh(frameGeo, mat(frameColor));
  frameMesh.rotation.x = -Math.PI / 2;
  frameMesh.castShadow = true;
  group.add(frameMesh);

  // 3. Inner decorative disc (lighter shade for icon area)
  const innerDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.30, 24),
    mat(innerColor)
  );
  innerDisc.rotation.x = -Math.PI / 2;
  innerDisc.position.y = 0.065;
  innerDisc.receiveShadow = true;
  group.add(innerDisc);

  // 4. Decorative ring around icon area
  const ringGeo = new THREE.TorusGeometry(0.31, 0.012, 6, 24);
  const ring = new THREE.Mesh(ringGeo, mat(frameColor));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.065;
  group.add(ring);

  // 5. Corner gem dots (at hex vertices)
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = Math.cos(angle) * 0.42;
    const z = Math.sin(angle) * 0.42;
    const gem = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 6, 5),
      mat(frameColor, { emissive: frameColor, emissiveIntensity: 0.2 })
    );
    gem.position.set(x, 0.065, -z);
    gem.scale.y = 0.5;
    group.add(gem);
  }

  return group;
}

// ─── LUMBER (Kereste) — Forest → Lumber ──────────────────────────────────────

export function createResourceLumber() {
  const P = {
    ground: palette('hexForestGround'),
    inner:  0x3a9a4a,
    frame:  palette('hexFrame'),
    bark:   palette('woodBark'),
    ring:   palette('woodRing'),
    leaf:   palette('woodLeaf'),
  };

  const group = createCardBase(P.ground, P.inner, P.frame);

  const barkMat = mat(P.bark);
  const ringMat = mat(P.ring);
  const leafMat = mat(P.leaf);

  // Crossed logs icon
  const logGeo = new THREE.CylinderGeometry(0.05, 0.055, 0.35, 8);
  const endGeo = new THREE.CircleGeometry(0.05, 12);

  // Log 1 (diagonal /)
  const log1 = new THREE.Mesh(logGeo, barkMat);
  log1.position.set(0, 0.12, 0);
  log1.rotation.z = Math.PI / 4;
  log1.castShadow = true;
  group.add(log1);

  // Log 1 end caps
  const end1a = new THREE.Mesh(endGeo, ringMat);
  end1a.position.set(-0.124, 0.245, 0);
  end1a.rotation.y = Math.PI / 2 + Math.PI / 4;
  end1a.rotation.order = 'YXZ';
  end1a.lookAt(-0.124 - 0.5, 0.245 + 0.5, 0);
  group.add(end1a);

  const end1b = new THREE.Mesh(endGeo, ringMat);
  end1b.position.set(0.124, -0.005, 0);
  end1b.lookAt(0.124 + 0.5, -0.005 - 0.5, 0);
  group.add(end1b);

  // Log 2 (diagonal \)
  const log2 = new THREE.Mesh(logGeo, barkMat);
  log2.position.set(0, 0.12, 0);
  log2.rotation.z = -Math.PI / 4;
  log2.castShadow = true;
  group.add(log2);

  // Small leaf sprigs around logs
  const sprigGeo = new THREE.ConeGeometry(0.04, 0.08, 5);
  [
    [0.18, 0.10, 0.08],
    [-0.16, 0.10, -0.06],
    [0.05, 0.10, -0.14],
  ].forEach(([x, y, z]) => {
    const sprig = new THREE.Mesh(sprigGeo, leafMat);
    sprig.position.set(x, y, z);
    sprig.castShadow = true;
    group.add(sprig);
  });

  // Tiny axe silhouette
  const axeHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.010, 0.14, 4),
    mat(P.bark)
  );
  axeHandle.position.set(0, 0.24, 0.10);
  axeHandle.rotation.z = 0.4;
  group.add(axeHandle);

  const axeBlade = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.035, 0.01),
    mat(0xaaaaaa)
  );
  axeBlade.position.set(0.04, 0.28, 0.10);
  axeBlade.rotation.z = 0.4;
  group.add(axeBlade);

  addOutline(group);
  return group;
}

export const resourceLumberMeta = {
  id: 'resource-lumber',
  name: 'Kereste',
  category: 'Kaynak Kartı',
  description: 'Orman arazisinden üretilen kereste kaynağı. İnşaat ve yol yapımında kullanılır.',
  type: 'Resource Card',
  materials: 6,
  geo: 'Prosedürel',
};

// ─── BRICK (Tuğla) — Hills → Brick ──────────────────────────────────────────

export function createResourceBrick() {
  const P = {
    ground: palette('hexHillsGround'),
    inner:  0xc86830,
    frame:  palette('hexFrame'),
    brick:  palette('brickMain'),
    mortar: palette('brickMortar'),
  };

  const group = createCardBase(P.ground, P.inner, P.frame);

  const brickMat = mat(P.brick);
  const mortarMat = mat(P.mortar);

  // Mini brick wall icon (3 rows, running bond)
  const bw = 0.08, bh = 0.04, bd = 0.06, mg = 0.008;

  for (let row = 0; row < 3; row++) {
    const y = 0.09 + row * (bh + mg);
    const offset = (row % 2 === 0) ? 0 : bw / 2 + mg / 2;
    const cols = (row % 2 === 0) ? 3 : 2;

    for (let col = 0; col < cols; col++) {
      const x = (col - (cols - 1) / 2) * (bw + mg) + offset - (row % 2 !== 0 ? bw / 4 : 0);
      const brick = new THREE.Mesh(
        new THREE.BoxGeometry(bw, bh, bd),
        brickMat
      );
      brick.position.set(x, y, 0);
      brick.castShadow = true;
      brick.receiveShadow = true;
      group.add(brick);
    }

    // Mortar line
    if (row > 0) {
      const mortarLine = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, mg * 0.5, bd + 0.01),
        mortarMat
      );
      mortarLine.position.set(0, y - bh / 2 - mg / 2, 0);
      group.add(mortarLine);
    }
  }

  // Small trowel
  const trowelHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.010, 0.10, 4),
    mat(palette('woodBark'))
  );
  trowelHandle.position.set(0.16, 0.10, 0.08);
  trowelHandle.rotation.z = -0.6;
  group.add(trowelHandle);

  const trowelBlade = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.003, 0.035),
    mat(0xaaaaaa)
  );
  trowelBlade.position.set(0.20, 0.07, 0.08);
  trowelBlade.rotation.z = -0.6;
  group.add(trowelBlade);

  // Loose bricks around
  [
    [-0.14, 0.075, 0.12, 0.3],
    [0.12, 0.075, -0.10, -0.5],
  ].forEach(([x, y, z, ry]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.8, bh * 0.8, bd * 0.8), brickMat);
    b.position.set(x, y, z);
    b.rotation.y = ry;
    b.castShadow = true;
    group.add(b);
  });

  addOutline(group);
  return group;
}

export const resourceBrickMeta = {
  id: 'resource-brick',
  name: 'Tuğla',
  category: 'Kaynak Kartı',
  description: 'Tepeli araziden üretilen tuğla kaynağı. İnşaat için temel malzeme.',
  type: 'Resource Card',
  materials: 5,
  geo: 'Prosedürel',
};

// ─── WOOL (Yün) — Pasture → Wool ────────────────────────────────────────────
// Ref: green pasture hex, 2-3 large cute sheep, haystack, wooden fence,
// earth-brown sides. No token clearing — board places token on top.

export function createResourceWool() {
  const P = {
    grass:  0x7cc830,   // bright pasture green
    earth:  0x8a5a28,   // warm brown sides
    wool:   0xf2ede6,   // creamy white wool
    skin:   0x9a8a7a,   // grey face/legs
    dark:   0x2a1f14,   // eyes/hooves
    hay:    0xd8b040,   // golden hay
    fence:  0x8b6b3c,   // warm wood
    fenceD: 0x6a4a28,   // darker wood
    pink:   0xffaaaa,   // inner ear
  };

  const group = new THREE.Group();
  const BASE_Y = 0.10;

  const grassMat = mat(P.grass);
  const earthMat = mat(P.earth);
  const woolMat  = mat(P.wool);
  const skinMat  = mat(P.skin);
  const darkMat  = mat(P.dark);
  const hayMat   = mat(P.hay);
  const fenceMat = mat(P.fence);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 1. HEX BASE — green pasture top, earth sides ──────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const plate = createHexPlate(0.95, BASE_Y, grassMat);
  group.add(plate);

  // Earth frame ring
  const fShape = hexShape(0.96);
  const fInner = hexShape(0.90);
  fShape.holes.push(fInner);
  const fGeo = new THREE.ExtrudeGeometry(fShape, {
    depth: BASE_Y, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2,
  });
  const fMesh = new THREE.Mesh(fGeo, earthMat);
  fMesh.rotation.x = -Math.PI / 2;
  fMesh.castShadow = true;
  group.add(fMesh);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 2. ROLLING HILLS — gentle undulations on the pasture ───────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const hillGeo = new THREE.SphereGeometry(0.20, 8, 6);
  [
    [0.25, 0.20, 1.0], [-0.30, -0.15, 0.85],
    [0.00, 0.30, 0.7], [-0.20, 0.10, 0.9],
  ].forEach(([hx, hz, s]) => {
    const hill = new THREE.Mesh(hillGeo, grassMat);
    hill.position.set(hx, BASE_Y, hz);
    hill.scale.set(s, 0.15, s);
    hill.receiveShadow = true;
    group.add(hill);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 3. SHEEP — 2 large, smooth, cute sheep (premium cute style) ────────────
  // ══════════════════════════════════════════════════════════════════════════════

  function makeSheep(sx, sz, rot) {
    const S = new THREE.Group();
    S.position.set(sx, BASE_Y, sz);
    S.rotation.y = rot;

    // Smooth oval wool body — horizontal ellipsoid
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), woolMat);
    body.position.y = 0.08;
    body.scale.set(1.3, 0.85, 0.95);
    body.castShadow = true;
    S.add(body);

    // Gentle wool top (single subtle bump)
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), woolMat);
    top.position.set(0, 0.12, 0);
    top.castShadow = true;
    S.add(top);

    // Small grey head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), skinMat);
    head.position.set(0.11, 0.09, 0);
    head.castShadow = true;
    S.add(head);

    // Wool tuft on forehead
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), woolMat);
    tuft.position.set(0.08, 0.12, 0);
    S.add(tuft);

    // Tiny ears
    [1, -1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.012, 4, 3), skinMat);
      ear.position.set(0.08, 0.12, side * 0.035);
      ear.scale.set(0.5, 0.35, 0.9);
      S.add(ear);
    });

    // Eyes (small black dots)
    [0.015, -0.015].forEach((ez) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.006, 4, 3), darkMat);
      eye.position.set(0.14, 0.10, ez);
      S.add(eye);
    });

    // Nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.008, 4, 3), darkMat);
    nose.position.set(0.15, 0.08, 0);
    nose.scale.set(0.5, 0.4, 0.7);
    S.add(nose);

    // 4 tiny dark legs
    [
      [0.04, 0.025, 0.035], [0.04, 0.025, -0.035],
      [-0.05, 0.025, 0.035], [-0.05, 0.025, -0.035],
    ].forEach(([lx, ly, lz]) => {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.010, 0.05, 5),
        darkMat
      );
      leg.position.set(lx, ly, lz);
      leg.castShadow = true;
      S.add(leg);
    });

    return S;
  }

  // 2 sheep — positioned like reference: left-center and right-center, facing viewer
  group.add(makeSheep(-0.22, 0.08, 0.5));     // left sheep, angled slightly right
  group.add(makeSheep(0.22, 0.12, -0.3));     // right sheep, angled slightly left

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 4. HAYSTACK — golden cone-shaped hay pile ──────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const hayGrp = new THREE.Group();
  hayGrp.position.set(0.02, BASE_Y, -0.20);

  // Main hay body (larger cone + sphere for rounded top)
  const hayBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.14, 0.16, 8),
    hayMat
  );
  hayBody.position.y = 0.08;
  hayBody.castShadow = true;
  hayGrp.add(hayBody);

  // Rounded top
  const hayTop = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), hayMat);
  hayTop.position.y = 0.16;
  hayTop.scale.set(1.0, 0.65, 1.0);
  hayTop.castShadow = true;
  hayGrp.add(hayTop);

  // Straw texture lines
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const straw = new THREE.Mesh(
      new THREE.CylinderGeometry(0.002, 0.003, 0.10, 3),
      mat(0xc8a030)
    );
    straw.position.set(Math.cos(angle) * 0.07, 0.06, Math.sin(angle) * 0.07);
    straw.rotation.z = Math.cos(angle) * 0.3;
    straw.rotation.x = Math.sin(angle) * 0.3;
    hayGrp.add(straw);
  }

  // Loose straws poking out
  [
    [0.08, 0.10, 0.02, 0.4, 0.2],
    [-0.06, 0.08, -0.04, -0.3, -0.2],
    [0.03, 0.12, -0.05, 0.2, -0.4],
  ].forEach(([x, y, z, rz, rx]) => {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.003, 0.06, 3), mat(0xc8a030));
    s.position.set(x, y, z); s.rotation.z = rz; s.rotation.x = rx;
    hayGrp.add(s);
  });

  group.add(hayGrp);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 5. WOODEN FENCE — 2 sections along the front edge ─────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const postGeo = new THREE.CylinderGeometry(0.015, 0.020, 0.14, 5);
  const railGeo = new THREE.BoxGeometry(0.20, 0.012, 0.012);

  // Fence section 1 (left-front)
  const fence1 = new THREE.Group();
  fence1.position.set(-0.25, BASE_Y, 0.50);
  fence1.rotation.y = 0.4;

  [-0.10, 0, 0.10].forEach((fx) => {
    const post = new THREE.Mesh(postGeo, fenceMat);
    post.position.set(fx, 0.07, 0);
    post.castShadow = true;
    fence1.add(post);
    // Post top cap
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 3), fenceMat);
    cap.position.set(fx, 0.14, 0);
    cap.scale.y = 0.5;
    fence1.add(cap);
  });
  // Rails
  [0.05, 0.10].forEach((ry) => {
    const rail = new THREE.Mesh(railGeo, fenceMat);
    rail.position.set(0, ry, 0);
    fence1.add(rail);
  });
  group.add(fence1);

  // Fence section 2 (right-front)
  const fence2 = new THREE.Group();
  fence2.position.set(0.18, BASE_Y, 0.50);
  fence2.rotation.y = -0.2;

  [-0.10, 0, 0.10].forEach((fx) => {
    const post = new THREE.Mesh(postGeo, fenceMat);
    post.position.set(fx, 0.07, 0);
    post.castShadow = true;
    fence2.add(post);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 3), fenceMat);
    cap.position.set(fx, 0.14, 0);
    cap.scale.y = 0.5;
    fence2.add(cap);
  });
  [0.05, 0.10].forEach((ry) => {
    const rail = new THREE.Mesh(railGeo, fenceMat);
    rail.position.set(0, ry, 0);
    fence2.add(rail);
  });
  group.add(fence2);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 6. GRASS TUFTS — small blade clusters across the pasture ───────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const bladeGeo = new THREE.ConeGeometry(0.008, 0.04, 3);
  const grassDkMat = mat(0x5a9a28);
  [
    [-0.50, 0.30], [0.45, 0.25], [-0.40, -0.35],
    [0.40, -0.30], [-0.25, 0.50], [0.30, -0.45],
    [0.50, 0.05], [-0.50, -0.10], [0.15, 0.50],
    [-0.10, -0.50], [0.55, -0.15], [-0.45, 0.15],
    [0.20, -0.50], [-0.55, 0.00], [0.00, 0.55],
  ].forEach(([bx, bz]) => {
    for (let g = 0; g < 3; g++) {
      const blade = new THREE.Mesh(bladeGeo, grassDkMat);
      blade.position.set(
        bx + (Math.random() - 0.5) * 0.04,
        BASE_Y + 0.02,
        bz + (Math.random() - 0.5) * 0.04
      );
      blade.rotation.z = (Math.random() - 0.5) * 0.3;
      blade.rotation.x = (Math.random() - 0.5) * 0.2;
      group.add(blade);
    }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 7. SMALL FLOWERS — scattered daisies ───────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  [
    [-0.45, 0.40, 0xffffff], [0.50, -0.20, 0xffee88],
    [-0.20, -0.45, 0xffffff], [0.40, 0.35, 0xffee88],
  ].forEach(([fx, fz, fc]) => {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.03, 3), grassDkMat);
    stem.position.set(fx, BASE_Y + 0.015, fz);
    group.add(stem);
    const flower = new THREE.Mesh(new THREE.SphereGeometry(0.010, 5, 4), mat(fc));
    flower.position.set(fx, BASE_Y + 0.035, fz);
    group.add(flower);
  });

  addOutline(group);
  return group;
}

export const resourceWoolMeta = {
  id: 'resource-wool',
  name: 'Yün',
  category: 'Kaynak Kartı',
  description: 'Yeşil otlak hex — 3 sevimli koyun, saman yığını, ahşap çit. Catan Pasture terrain tile.',
  type: 'Terrain Hex',
  materials: 8,
  geo: 'Prosedürel',
};

// ─── Shared terrain hex base (earth sides, no gold frame) ────────────────────

function createTerrainBase(topColor, sideColor) {
  const group = new THREE.Group();

  // Thick hex plate — earth-brown sides, terrain-colored top
  const shape = hexShape(0.95);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.10,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });

  // Two materials: sides = earth, top/bottom caps = terrain
  const topMat  = mat(topColor);
  const sideMat = mat(sideColor);
  // ExtrudeGeometry groups: 0 = sides, 1 = top cap, 2 = bottom cap
  const mesh = new THREE.Mesh(geo, [sideMat, topMat, sideMat]);
  mesh.rotation.x = -Math.PI / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  return group;
}

// ─── GRAIN (Tahıl) — Fields → Grain ─────────────────────────────────────────
// Ref: thick rounded earth block, entire top covered with dense golden wheat,
// small circular token clearing, farmer harvesting at edge with sickle.

export function createResourceGrain() {
  const P = {
    wheat:   0xf0c838,   // bright warm golden
    stalk:   0xd4a828,   // golden stem
    earth:   0xa06428,   // warm brown sides
    top:     0xe0b838,   // golden ground under wheat
    skin:    0xd4b896,
    cloth:   0x5a7a3a,
    hat:     0xe0c050,
    hatBand: 0x8b5e3c,
    dark:    0x2a1f14,
    token:   0xd4b060,   // warm beige token
    tokenRim:0xa07030,
    leaf:    0xb8c040,   // yellow-green
  };

  const group = new THREE.Group();
  const BASE_Y = 0.10; // thinner hex plate

  const wheatMat = mat(P.wheat);
  const stalkMat = mat(P.stalk);
  const earthMat = mat(P.earth);
  const topMat   = mat(P.top);
  const skinMat  = mat(P.skin);
  const clothMat = mat(P.cloth);
  const hatMat   = mat(P.hat);
  const darkMat  = mat(P.dark);
  const leafMat  = mat(P.leaf, { side: THREE.DoubleSide });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 1. HEX BASE — warm earth sides, golden top ────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const plate = createHexPlate(0.95, BASE_Y, topMat);
  group.add(plate);

  // Earth-brown frame ring around the hex edge
  const frameShape = hexShape(0.96);
  const innerFrame = hexShape(0.90);
  frameShape.holes.push(innerFrame);
  const frameGeo = new THREE.ExtrudeGeometry(frameShape, {
    depth: BASE_Y,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  const frameMesh = new THREE.Mesh(frameGeo, earthMat);
  frameMesh.rotation.x = -Math.PI / 2;
  frameMesh.castShadow = true;
  group.add(frameMesh);

  // Number token is placed by the board (CatanBoard._makeToken), NOT by the model.
  // So no clearing or disc needed here — wheat covers the entire surface.

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 3. ULTRA-DENSE WHEAT — covers entire top surface ──────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const stemGeo  = new THREE.CylinderGeometry(0.003, 0.005, 0.10, 4);
  const headGeo  = new THREE.ConeGeometry(0.012, 0.05, 5);
  const kernGeo  = new THREE.SphereGeometry(0.005, 4, 3);
  const barbGeo  = new THREE.CylinderGeometry(0.001, 0.0005, 0.03, 3);
  const lW = 0.015, lH = 0.05;
  const lShape = new THREE.Shape();
  lShape.moveTo(0, 0);
  lShape.quadraticCurveTo(lW, lH * 0.35, lW * 0.3, lH * 0.7);
  lShape.quadraticCurveTo(0, lH, 0, lH);
  lShape.quadraticCurveTo(-lW * 0.15, lH * 0.5, 0, 0);
  const lGeo = new THREE.ShapeGeometry(lShape);

  function makeW(ox, oz, h, lz, lx) {
    const g = new THREE.Group();
    g.position.set(ox, BASE_Y, oz);
    g.rotation.z = lz;
    g.rotation.x = lx;

    // Stem
    const s = new THREE.Mesh(stemGeo, stalkMat);
    s.position.y = h * 0.5;
    s.scale.y = h / 0.10;
    s.castShadow = true;
    g.add(s);

    // Node
    const n = new THREE.Mesh(kernGeo, stalkMat);
    n.position.y = h * 0.45;
    n.scale.set(1.2, 0.4, 1.2);
    g.add(n);

    // Head
    const hd = new THREE.Mesh(headGeo, wheatMat);
    hd.position.y = h + 0.025;
    hd.castShadow = true;
    g.add(hd);

    // Kernels (6)
    for (let k = 0; k < 6; k++) {
      const ky = h + 0.008 + (k / 6) * 0.035;
      const ka = (k / 6) * Math.PI * 3;
      const kr = 0.010 - (k / 6) * 0.004;
      const kn = new THREE.Mesh(kernGeo, wheatMat);
      kn.position.set(Math.cos(ka) * kr, ky, Math.sin(ka) * kr);
      kn.scale.set(0.6, 1.0, 0.6);
      g.add(kn);
    }

    // Barbs (3)
    for (let b = 0; b < 3; b++) {
      const ba = (b / 3) * Math.PI * 2 + 0.5;
      const bb = new THREE.Mesh(barbGeo, wheatMat);
      bb.position.set(Math.cos(ba) * 0.008, h + 0.04 + b * 0.008, Math.sin(ba) * 0.008);
      bb.rotation.z = Math.cos(ba) * 0.6;
      bb.rotation.x = Math.sin(ba) * 0.6;
      g.add(bb);
    }

    // Leaf
    const lf = new THREE.Mesh(lGeo, leafMat);
    lf.position.y = h * 0.3;
    lf.rotation.y = Math.random() * Math.PI * 2;
    lf.rotation.z = 0.35 + Math.random() * 0.3;
    g.add(lf);

    return g;
  }

  // Dense placement — 0.06 spacing, fills entire hex surface
  const hexR = 0.84;
  const fX = 0.50, fZ = -0.15, fClear = 0.14;

  for (let gx = -0.82; gx <= 0.82; gx += 0.06) {
    for (let gz = -0.82; gz <= 0.82; gz += 0.06) {
      // Hex boundary check (pointy-top)
      const ax = Math.abs(gx), az = Math.abs(gz);
      if (Math.max(ax * 2 / Math.sqrt(3), ax / Math.sqrt(3) + az) > hexR) continue;

      // Only skip farmer area
      const dfx = gx - fX, dfz = gz - fZ;
      if (Math.sqrt(dfx * dfx + dfz * dfz) < fClear) continue;

      const ox = gx + (Math.random() - 0.5) * 0.03;
      const oz = gz + (Math.random() - 0.5) * 0.03;
      const h = 0.08 + Math.random() * 0.06;
      const lz = (Math.random() - 0.5) * 0.18;
      const lx = (Math.random() - 0.5) * 0.10;
      group.add(makeW(ox, oz, h, lz, lx));
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 4. FARMER — chibi harvester at right edge ─────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const F = new THREE.Group();
  F.position.set(fX, BASE_Y + 0.005, fZ);
  F.rotation.y = -0.6;

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.07, 0.04), clothMat);
  torso.position.set(0, 0.09, 0); torso.castShadow = true;
  F.add(torso);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), skinMat);
  head.position.set(0, 0.155, 0); head.castShadow = true;
  F.add(head);

  // Hat brim + crown
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.050, 0.055, 0.007, 10), hatMat);
  brim.position.set(0, 0.18, 0); brim.castShadow = true;
  F.add(brim);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.032, 0.025, 8), hatMat);
  crown.position.set(0, 0.195, 0);
  F.add(crown);

  // Hat band
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.004, 4, 10), mat(P.hatBand));
  band.position.y = 0.185; band.rotation.x = Math.PI / 2;
  F.add(band);

  // Eyes
  [0.010, -0.010].forEach((ez) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.004, 4, 3), darkMat);
    eye.position.set(0.028, 0.16, ez);
    F.add(eye);
  });

  // Legs + boots
  [0.012, -0.012].forEach((lz) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.010, 0.055, 5), darkMat);
    leg.position.set(0, 0.028, lz); leg.castShadow = true;
    F.add(leg);
  });

  // Right arm + sickle
  const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.010, 0.06, 5), skinMat);
  rArm.position.set(0.025, 0.10, -0.025);
  rArm.rotation.set(-0.3, 0, -0.8); rArm.castShadow = true;
  F.add(rArm);

  const sH = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.006, 0.04, 4), mat(P.hatBand));
  sH.position.set(0.05, 0.07, -0.03); sH.rotation.z = -0.5;
  F.add(sH);

  const sB = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.003, 4, 8, Math.PI), mat(0xaaaaaa));
  sB.position.set(0.06, 0.09, -0.03);
  sB.rotation.z = Math.PI / 2; sB.rotation.y = Math.PI / 2;
  F.add(sB);

  // Left arm + wheat bundle
  const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.010, 0.06, 5), skinMat);
  lArm.position.set(0.015, 0.10, 0.025);
  lArm.rotation.set(0.4, 0, -0.4); lArm.castShadow = true;
  F.add(lArm);

  // Bundle (5 simple stalks)
  const bun = new THREE.Group();
  bun.position.set(0.03, 0.06, 0.035);
  bun.rotation.set(0.3, 0, -0.3);
  for (let i = 0; i < 5; i++) {
    const sx = (i - 2) * 0.006;
    const bs = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.003, 0.08, 3), stalkMat);
    bs.position.set(sx, 0.04, 0); bs.rotation.z = (i - 2) * 0.05;
    bun.add(bs);
    const bh = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.03, 4), wheatMat);
    bh.position.set(sx + (i - 2) * 0.003, 0.09, 0); bh.rotation.z = (i - 2) * 0.05;
    bun.add(bh);
  }
  const bTie = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.003, 4, 8), mat(P.hatBand));
  bTie.position.set(0, 0.02, 0); bTie.rotation.x = Math.PI / 2;
  bun.add(bTie);
  F.add(bun);

  // Cut stubble around farmer
  const stubGeo = new THREE.CylinderGeometry(0.003, 0.005, 0.02, 3);
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = 0.03 + Math.random() * 0.08;
    const st = new THREE.Mesh(stubGeo, stalkMat);
    st.position.set(fX + Math.cos(a) * d, BASE_Y + 0.01, fZ + Math.sin(a) * d);
    st.rotation.z = (Math.random() - 0.5) * 0.3;
    group.add(st);
  }

  group.add(F);

  addOutline(group);
  return group;
}

export const resourceGrainMeta = {
  id: 'resource-grain',
  name: 'Tahıl',
  category: 'Kaynak Kartı',
  description: 'Yoğun buğday tarlası, ortada zar token alanı, köşede oraklı çiftçi. Catan Fields terrain tile.',
  type: 'Terrain Hex',
  materials: 8,
  geo: 'Prosedürel',
};

// ─── ORE (Cevher) — Mountains → Ore ─────────────────────────────────────────

export function createResourceOre() {
  const P = {
    ground:  palette('hexMountainsGround'),
    inner:   0x607888,
    frame:   palette('hexFrame'),
    rock:    palette('hexMountainsRock'),
    crystal: palette('oreCrystal'),
    peak:    palette('hexMountainsPeak'),
    vein:    palette('oreVein'),
  };

  const group = createCardBase(P.ground, P.inner, P.frame);

  const rockMat    = mat(P.rock);
  const crystalMat = mat(P.crystal, { emissive: P.crystal, emissiveIntensity: 0.4 });
  const peakMat    = mat(P.peak);
  const veinMat    = mat(P.vein);

  // Rock base mound
  const rockBase = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.14, 1),
    rockMat
  );
  rockBase.position.set(0, 0.10, 0);
  rockBase.scale.set(1.2, 0.6, 1.0);
  rockBase.castShadow = true;
  rockBase.receiveShadow = true;
  group.add(rockBase);

  // Crystal cluster (5 crystals pointing upward)
  const crystals = [
    { x:  0.00, z:  0.00, h: 0.20, r: 0.035, rz: 0 },
    { x: -0.05, z:  0.04, h: 0.15, r: 0.028, rz: 0.15 },
    { x:  0.06, z: -0.03, h: 0.16, r: 0.030, rz: -0.12 },
    { x: -0.03, z: -0.05, h: 0.12, r: 0.022, rz: -0.2 },
    { x:  0.04, z:  0.05, h: 0.13, r: 0.025, rz: 0.18 },
  ];
  crystals.forEach(({ x, z, h, r, rz }) => {
    const crystal = new THREE.Mesh(
      new THREE.CylinderGeometry(0, r, h, 6),
      crystalMat
    );
    crystal.position.set(x, 0.16 + h / 2, z);
    crystal.rotation.z = rz;
    crystal.castShadow = true;
    group.add(crystal);
  });

  // Snow/peak caps on larger crystals
  [
    [0.00, 0.36, 0.00],
    [-0.05, 0.31, 0.04],
    [0.06, 0.32, -0.03],
  ].forEach(([x, y, z]) => {
    const snow = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 5, 4, 0, Math.PI * 2, 0, Math.PI / 2),
      peakMat
    );
    snow.position.set(x, y, z);
    snow.scale.set(1, 0.4, 1);
    group.add(snow);
  });

  // Ore vein streaks on rock base
  [
    { pos: [0.08, 0.10, 0.10], rot: [0, 0, 0.6], len: 0.10 },
    { pos: [-0.06, 0.12, -0.08], rot: [0.3, 0, -0.4], len: 0.08 },
    { pos: [0.10, 0.08, -0.06], rot: [0, 0.4, 0.3], len: 0.07 },
  ].forEach(({ pos, rot, len }: any) => {
    const v = new THREE.Mesh(
      new THREE.BoxGeometry(len, 0.008, 0.008),
      veinMat
    );
    v.position.set(...pos as [number, number, number]);
    v.rotation.set(...rot as [number, number, number]);
    group.add(v);
  });

  // Small crystal shards scattered
  [
    [0.16, 0.075, 0.10], [-0.14, 0.075, 0.12],
    [0.12, 0.075, -0.14], [-0.16, 0.075, -0.08],
  ].forEach(([x, y, z]) => {
    const shard = new THREE.Mesh(
      new THREE.CylinderGeometry(0, 0.010, 0.03, 4),
      crystalMat
    );
    shard.position.set(x, y, z);
    shard.rotation.z = (Math.random() - 0.5) * 0.6;
    group.add(shard);
  });

  // Tiny pickaxe
  const pickHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.008, 0.12, 4),
    mat(palette('woodBark'))
  );
  pickHandle.position.set(-0.18, 0.12, -0.10);
  pickHandle.rotation.z = 0.4;
  group.add(pickHandle);

  const pickHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.015, 0.012),
    mat(0xaaaaaa)
  );
  pickHead.position.set(-0.16, 0.18, -0.10);
  pickHead.rotation.z = 0.4;
  group.add(pickHead);

  addOutline(group);
  return group;
}

export const resourceOreMeta = {
  id: 'resource-ore',
  name: 'Cevher',
  category: 'Kaynak Kartı',
  description: 'Dağ arazisinden üretilen cevher kaynağı. City yükseltmesi için gerekli.',
  type: 'Resource Card',
  materials: 7,
  geo: 'Prosedürel',
};
