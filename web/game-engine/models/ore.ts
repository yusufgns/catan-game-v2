import * as THREE from 'three';
import { mat, palette, addOutline } from './materials';

export function createOre() {
  const group = new THREE.Group();

  // ── Palette ─────────────────────────────────────────────────────────────────
  const P = {
    rock:    palette('oreRock'),
    vein:    palette('oreVein'),
    crystal: palette('oreCrystal'),
    stone:   palette('settlementStone'),
    glow:    palette('settlementWindow'),
    handle:  palette('robberStaff'),
  };

  // ── Materials ───────────────────────────────────────────────────────────────
  const rockMat     = mat(P.rock);
  const darkRockMat = mat(P.rock * 0.6 | 0);
  const veinMat     = mat(P.vein, { metalness: 0.7, roughness: 0.3 });
  const crystalMat  = mat(P.crystal, { emissive: P.crystal, emissiveIntensity: 0.35, transparent: true, opacity: 0.85 });
  const shardMat    = mat(P.crystal, { emissive: P.crystal, emissiveIntensity: 0.25 });
  const metalMat    = mat(0xccccdd, { metalness: 0.9, roughness: 0.15 });
  const handleMat   = mat(P.handle);
  const stoneMat    = mat(P.stone);
  const glowMat     = mat(P.glow, { emissive: P.glow, emissiveIntensity: 0.7 });
  const caveMat     = mat(0x111118);
  const gravelMat   = mat(P.rock * 0.8 | 0);
  const dustMat     = mat(0x9a9088, { transparent: true, opacity: 0.5 });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 1. MAIN ROCK BASE (large irregular boulder) ───────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const baseRock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 1), rockMat);
  baseRock.scale.set(1.05, 0.65, 0.95);
  baseRock.position.y = 0.22;
  baseRock.rotation.set(0.1, 0.4, 0.05);
  baseRock.castShadow = true;
  baseRock.receiveShadow = true;

  // Upper rock mass (slightly different detail level for variety)
  const upperRock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), rockMat);
  upperRock.scale.set(0.9, 0.55, 0.85);
  upperRock.position.set(0.02, 0.38, -0.02);
  upperRock.rotation.set(0.3, 0.8, -0.1);
  upperRock.castShadow = true;
  upperRock.receiveShadow = true;

  group.add(baseRock, upperRock);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 2. SECONDARY & TERTIARY ROCK CHUNKS ───────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const secondaryRocks = [
    { pos: [0.30, 0.16, 0.18], scale: [0.75, 0.55, 0.80], rot: [0.2, -0.5, 0.1], size: 0.22 },
    { pos: [-0.28, 0.14, -0.12], scale: [0.85, 0.50, 0.70], rot: [-0.1, 1.2, 0.3], size: 0.20 },
    { pos: [0.08, 0.14, -0.30], scale: [0.70, 0.45, 0.90], rot: [0.4, 0.3, -0.2], size: 0.18 },
    { pos: [-0.20, 0.12, 0.26], scale: [0.65, 0.50, 0.75], rot: [0.5, -0.8, 0.15], size: 0.22 },
  ];
  secondaryRocks.forEach(({ pos, scale, rot, size }: any) => {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), rockMat);
    r.scale.set(...scale as [number, number, number]);
    r.position.set(...pos as [number, number, number]);
    r.rotation.set(...rot as [number, number, number]);
    r.castShadow = true;
    r.receiveShadow = true;
    group.add(r);
  });

  // Tertiary tiny rock chunks
  const tertiaryRocks = [
    [0.35, 0.06, 0.30], [-0.34, 0.06, 0.22], [0.22, 0.06, -0.34],
    [-0.30, 0.06, -0.28], [0.38, 0.06, -0.08], [-0.12, 0.06, 0.36],
  ];
  tertiaryRocks.forEach(([x, y, z]) => {
    const r = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.08 + Math.random() * 0.04, 0),
      rockMat
    );
    r.position.set(x, y, z);
    r.scale.set(0.6 + Math.random() * 0.4, 0.4 + Math.random() * 0.3, 0.6 + Math.random() * 0.4);
    r.rotation.set(Math.random() * 2, Math.random() * 2, Math.random());
    r.castShadow = true;
    group.add(r);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 3. ORE VEINS (thin elongated metallic streaks) ────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const veins = [
    { pos: [0.12, 0.30, 0.22], rot: [0, 0, 0.7], len: 0.22, w: 0.025 },
    { pos: [-0.10, 0.34, -0.18], rot: [0.3, 0, -0.5], len: 0.18, w: 0.020 },
    { pos: [0.20, 0.26, -0.08], rot: [-0.2, 0.4, 0.4], len: 0.20, w: 0.022 },
    { pos: [-0.08, 0.22, 0.24], rot: [0.1, -0.3, -0.6], len: 0.16, w: 0.018 },
    { pos: [0.05, 0.42, 0.10], rot: [0, 0.2, 0.8], len: 0.14, w: 0.020 },
    { pos: [-0.16, 0.28, 0.05], rot: [0.5, 0, -0.3], len: 0.12, w: 0.016 },
  ];
  veins.forEach(({ pos, rot, len, w }: any) => {
    const v = new THREE.Mesh(new THREE.BoxGeometry(w, w * 0.5, len), veinMat);
    v.position.set(...pos as [number, number, number]);
    v.rotation.set(...rot as [number, number, number]);
    group.add(v);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 4. CRYSTAL CLUSTER (5-7 crystals on top) ─────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const crystals = [
    { pos: [0.02, 0.58, 0.02], h: 0.30, r: 0.045, rx: 0, rz: 0 },
    { pos: [-0.08, 0.54, 0.08], h: 0.22, r: 0.038, rx: 0.2, rz: 0.15 },
    { pos: [0.10, 0.52, -0.04], h: 0.24, r: 0.040, rx: -0.15, rz: -0.2 },
    { pos: [-0.02, 0.56, -0.08], h: 0.18, r: 0.032, rx: -0.25, rz: 0.1 },
    { pos: [0.06, 0.50, 0.10], h: 0.20, r: 0.035, rx: 0.18, rz: -0.12 },
    { pos: [-0.10, 0.50, -0.03], h: 0.16, r: 0.028, rx: -0.1, rz: 0.3 },
    { pos: [0.12, 0.48, 0.06], h: 0.14, r: 0.025, rx: 0.12, rz: -0.25 },
  ];
  crystals.forEach(({ pos, h, r, rx, rz }: any) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0, r, h, 6), crystalMat);
    c.position.set(...pos as [number, number, number]);
    c.rotation.set(rx, 0, rz);
    c.castShadow = true;
    group.add(c);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 5. SMALL CRYSTAL SHARDS (scattered around base) ───────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const shardPositions = [
    [0.22, 0.08, 0.28], [-0.26, 0.07, 0.18], [0.30, 0.06, -0.20],
    [-0.18, 0.07, -0.30], [0.35, 0.05, 0.05], [-0.32, 0.06, -0.05],
    [0.05, 0.06, 0.34], [-0.08, 0.05, -0.35], [0.28, 0.06, 0.22],
    [-0.24, 0.07, 0.30], [0.15, 0.05, -0.32],
  ];
  shardPositions.forEach(([x, y, z]) => {
    const s = new THREE.Mesh(
      new THREE.CylinderGeometry(0, 0.012 + Math.random() * 0.008, 0.04 + Math.random() * 0.03, 4),
      shardMat
    );
    s.position.set(x, y, z);
    s.rotation.set(
      (Math.random() - 0.5) * 0.6,
      Math.random() * Math.PI,
      (Math.random() - 0.5) * 0.8
    );
    group.add(s);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 6. ROCK SURFACE CRACKS / FISSURES ─────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const cracks = [
    { pos: [0.15, 0.28, 0.26], rot: [0, 0, 0.5], len: 0.16 },
    { pos: [-0.12, 0.24, -0.24], rot: [0.3, 0, -0.4], len: 0.14 },
    { pos: [0.22, 0.20, 0.02], rot: [0, 0.5, 0.7], len: 0.12 },
    { pos: [-0.06, 0.32, 0.18], rot: [0.1, -0.2, -0.6], len: 0.10 },
    { pos: [0.08, 0.18, -0.22], rot: [-0.2, 0.3, 0.3], len: 0.13 },
    { pos: [-0.20, 0.20, 0.12], rot: [0.4, 0, -0.2], len: 0.11 },
    { pos: [0.18, 0.35, -0.12], rot: [0, 0.6, 0.4], len: 0.09 },
  ];
  cracks.forEach(({ pos, rot, len }: any) => {
    const cr = new THREE.Mesh(
      new THREE.BoxGeometry(len, 0.005, 0.005),
      darkRockMat
    );
    cr.position.set(...pos as [number, number, number]);
    cr.rotation.set(...rot as [number, number, number]);
    group.add(cr);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 7. CAVE / OPENING IN ROCK ─────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  // Dark recessed area simulating a small mine opening
  const caveOuter = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.10, 0.04),
    caveMat
  );
  caveOuter.position.set(0.20, 0.16, 0.30);
  group.add(caveOuter);

  // Frame the cave opening with small rock pieces
  const caveFrameTop = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 0.04), rockMat);
  caveFrameTop.position.set(0.20, 0.22, 0.31);
  const caveFrameL = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.10, 0.04), rockMat);
  caveFrameL.position.set(0.135, 0.16, 0.31);
  const caveFrameR = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.10, 0.04), rockMat);
  caveFrameR.position.set(0.265, 0.16, 0.31);
  group.add(caveFrameTop, caveFrameL, caveFrameR);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 8. PICKAXE (leaning against the rock) ─────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const pickaxeGroup = new THREE.Group();

  // Handle (long wooden shaft)
  const pickHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.014, 0.50, 6),
    handleMat
  );
  pickHandle.position.set(0, 0.25, 0);
  pickHandle.castShadow = true;
  pickaxeGroup.add(pickHandle);

  // Head — horizontal blade (wedge shape)
  const pickBlade = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.035, 0.025),
    metalMat
  );
  pickBlade.position.set(0, 0.48, 0);
  pickBlade.castShadow = true;
  pickaxeGroup.add(pickBlade);

  // Pointed tip on one side
  const pickTip = new THREE.Mesh(
    new THREE.CylinderGeometry(0, 0.018, 0.06, 4),
    metalMat
  );
  pickTip.position.set(0.13, 0.48, 0);
  pickTip.rotation.z = -Math.PI / 2;
  pickaxeGroup.add(pickTip);

  // Flat chisel end on the other side
  const pickChisel = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.05, 0.025),
    metalMat
  );
  pickChisel.position.set(-0.12, 0.48, 0);
  pickaxeGroup.add(pickChisel);

  // Position the whole pickaxe, leaning against the rock
  pickaxeGroup.position.set(-0.36, 0, 0.20);
  pickaxeGroup.rotation.z = 0.25;
  pickaxeGroup.rotation.y = 0.3;
  group.add(pickaxeGroup);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 9. MINING LANTERN ─────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const lanternGroup = new THREE.Group();

  // Body (small box frame)
  const lanternBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.07, 0.05),
    metalMat
  );
  lanternBody.position.y = 0.035;
  lanternBody.castShadow = true;
  lanternGroup.add(lanternBody);

  // Glass / glow pane (warm emissive center)
  const lanternGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 0.045, 0.035),
    glowMat
  );
  lanternGlow.position.y = 0.038;
  lanternGroup.add(lanternGlow);

  // Top cap
  const lanternCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.028, 0.015, 6),
    metalMat
  );
  lanternCap.position.y = 0.075;
  lanternGroup.add(lanternCap);

  // Handle loop
  const lanternHandle = new THREE.Mesh(
    new THREE.TorusGeometry(0.016, 0.004, 4, 8, Math.PI),
    metalMat
  );
  lanternHandle.position.y = 0.082;
  lanternHandle.rotation.x = Math.PI;
  lanternGroup.add(lanternHandle);

  // Base plate
  const lanternBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.008, 0.06),
    metalMat
  );
  lanternBase.position.y = 0;
  lanternGroup.add(lanternBase);

  lanternGroup.position.set(-0.30, 0.02, -0.26);
  group.add(lanternGroup);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 10. METALLIC GLINT SPOTS ──────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const glintPositions = [
    [0.18, 0.32, 0.18], [-0.14, 0.28, -0.16], [0.08, 0.36, -0.12],
    [-0.22, 0.20, 0.14], [0.26, 0.22, 0.06], [-0.06, 0.40, 0.08],
    [0.14, 0.18, -0.24], [-0.18, 0.24, -0.08], [0.22, 0.30, 0.14],
    [-0.10, 0.16, 0.22], [0.04, 0.26, -0.20], [0.16, 0.38, 0.04],
  ];
  glintPositions.forEach(([x, y, z]) => {
    const g = new THREE.Mesh(
      new THREE.SphereGeometry(0.010 + Math.random() * 0.006, 4, 3),
      metalMat
    );
    g.position.set(x, y, z);
    group.add(g);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 11. GRAVEL / CRUSHED ROCK (around base) ──────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  for (let i = 0; i < 28; i++) {
    const angle = (i / 28) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 0.32 + Math.random() * 0.14;
    const gravel = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.012 + Math.random() * 0.012, 0),
      gravelMat
    );
    gravel.position.set(
      Math.cos(angle) * dist,
      0.01 + Math.random() * 0.01,
      Math.sin(angle) * dist
    );
    gravel.scale.set(
      0.6 + Math.random() * 0.8,
      0.3 + Math.random() * 0.4,
      0.6 + Math.random() * 0.8
    );
    gravel.rotation.set(Math.random() * 2, Math.random() * 2, Math.random());
    group.add(gravel);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 12. DUST / DEBRIS PARTICLES ───────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  for (let i = 0; i < 18; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 0.10 + Math.random() * 0.35;
    const dust = new THREE.Mesh(
      new THREE.SphereGeometry(0.005 + Math.random() * 0.005, 3, 2),
      dustMat
    );
    dust.position.set(
      Math.cos(angle) * dist,
      0.005 + Math.random() * 0.015,
      Math.sin(angle) * dist
    );
    group.add(dust);
  }

  // ── Assemble & finish ─────────────────────────────────────────────────────
  addOutline(group);
  return group;
}

export const oreMeta = {
  id: 'ore',
  name: 'Ore',
  category: 'Kaynak',
  description: 'Dağ/maden kaynağını temsil eden detaylı kaya kütlesi, kristal oluşumları, maden damarları, kazma ve fener.',
  type: 'Kaynak Token',
  materials: 12,
  geo: 'Prosedürel',
};
