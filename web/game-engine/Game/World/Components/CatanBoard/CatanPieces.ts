import * as THREE from 'three';

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Darken a hex colour by factor f (0..1).
 * dk('#aabbcc', 0.3) darkens each channel by 30 %.
 */
function dk(hex: string, f: number): string {
  const h = hex.replace('#', '');
  return (
    '#' +
    [0, 2, 4]
      .map((i) =>
        Math.round(parseInt(h.slice(i, i + 2), 16) * (1 - f))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// 1. createSettlement3D
// ─────────────────────────────────────────────────────────────────────────────────

export function createSettlement3D(color: string = '#DC2626', scale: number | number[] = 1): THREE.Group {
  const group = new THREE.Group();

  // Colours
  const C_STONE   = '#a8b4c4';
  const C_STONE_D = '#78899a';
  const C_DARK    = '#1c1917';

  // Materials
  const stoneMat   = new THREE.MeshStandardMaterial({ color: C_STONE,   roughness: 0.88 });
  const stoneDkMat = new THREE.MeshStandardMaterial({ color: C_STONE_D, roughness: 0.92 });
  const colorMat   = new THREE.MeshStandardMaterial({ color,            roughness: 0.65 });
  const darkMat    = new THREE.MeshStandardMaterial({ color: C_DARK,    roughness: 0.90 });

  // Constants
  const BASE_H  = 0.10;
  const BASE_RO = 0.58;
  const BASE_RI = 0.52;

  const TWR_RB  = 0.44;
  const TWR_RT  = 0.34;
  const TWR_H   = 1.15;
  const TWR_SEG = 10;

  const BATT_H  = 0.20;
  const BATT_RO = TWR_RT + 0.08;

  const MERLON_N = 6;
  const MERLON_R = TWR_RT + 0.05;
  const MERLON_H = 0.18;
  const MERLON_W = 0.11;

  const CONE_R = 0.30;
  const CONE_H = 0.58;

  const TWRT_Y = BASE_H + TWR_H;
  const BATT_Y = TWRT_Y + BATT_H;
  const DOOR_Z = TWR_RB + 0.012;

  // ── Foundation ring ──
  const foundation = new THREE.Mesh(
    new THREE.CylinderGeometry(BASE_RI, BASE_RO, BASE_H, 12),
    stoneDkMat,
  );
  foundation.position.set(0, BASE_H / 2, 0);
  foundation.castShadow = true;
  foundation.receiveShadow = true;
  group.add(foundation);

  // ── Main tower body ──
  const towerBody = new THREE.Mesh(
    new THREE.CylinderGeometry(TWR_RT, TWR_RB, TWR_H, TWR_SEG),
    stoneMat,
  );
  towerBody.position.set(0, BASE_H + TWR_H / 2, 0);
  towerBody.castShadow = true;
  towerBody.receiveShadow = true;
  group.add(towerBody);

  // ── Horizontal stone band (mid tower) ──
  const midBand = new THREE.Mesh(
    new THREE.CylinderGeometry(TWR_RB * 0.78 + 0.02, TWR_RB * 0.78, 0.06, TWR_SEG),
    stoneDkMat,
  );
  midBand.position.set(0, BASE_H + TWR_H * 0.55, 0);
  group.add(midBand);

  // ── Battlement ring ──
  const battlement = new THREE.Mesh(
    new THREE.CylinderGeometry(BATT_RO, TWR_RT, BATT_H, TWR_SEG),
    stoneDkMat,
  );
  battlement.position.set(0, TWRT_Y + BATT_H / 2, 0);
  battlement.castShadow = true;
  group.add(battlement);

  // ── Merlons ──
  const merlonGeo = new THREE.BoxGeometry(MERLON_W, MERLON_H, MERLON_W);
  for (let i = 0; i < MERLON_N; i++) {
    const a = (i / MERLON_N) * Math.PI * 2;
    const m = new THREE.Mesh(merlonGeo, colorMat);
    m.position.set(Math.sin(a) * MERLON_R, BATT_Y + MERLON_H / 2, Math.cos(a) * MERLON_R);
    m.castShadow = true;
    group.add(m);
  }

  // ── Conical roof ──
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(CONE_R, CONE_H, TWR_SEG),
    colorMat,
  );
  roof.position.set(0, BATT_Y + CONE_H / 2, 0);
  roof.castShadow = true;
  group.add(roof);

  // ── Door frame ──
  const doorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.40, 0.045),
    colorMat,
  );
  doorFrame.position.set(0, BASE_H + 0.28, DOOR_Z);
  group.add(doorFrame);

  // ── Door opening ──
  const doorOpen = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.30, 0.045),
    darkMat,
  );
  doorOpen.position.set(0, BASE_H + 0.22, DOOR_Z + 0.02);
  group.add(doorOpen);

  // ── Arrow slits ──
  const slitGeo = new THREE.BoxGeometry(0.07, 0.22, 0.045);
  const slit1 = new THREE.Mesh(slitGeo, darkMat);
  slit1.position.set(0.16, BASE_H + TWR_H * 0.68, TWR_RT + 0.012);
  group.add(slit1);

  const slit2 = new THREE.Mesh(slitGeo, darkMat);
  slit2.position.set(-0.16, BASE_H + TWR_H * 0.68, TWR_RT + 0.012);
  group.add(slit2);

  // ── Flag pennant ──
  const flag = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.10, 0.015),
    colorMat,
  );
  flag.position.set(0.06, BATT_Y + CONE_H + 0.14, 0.04);
  group.add(flag);

  // Apply scale
  if (typeof scale === 'number') {
    group.scale.set(scale, scale, scale);
  } else {
    group.scale.set(scale[0], scale[1], scale[2]);
  }

  return group;
}

// ─────────────────────────────────────────────────────────────────────────────────
// 2. createCity3D
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Internal helper — builds a single tower sub-group matching the R3F <Tower> component.
 */
function _buildTower({
  ox = 0,
  oz = 0,
  baseR,
  topR,
  height,
  seg,
  battH,
  battR,
  merlonN,
  merlonSize = [0.13, 0.20, 0.13],
  coneH,
  coneR,
  doorZ,
  doorW,
  doorH,
  slits,
  playerColor,
  stoneCol,
  stoneDk,
  dark,
}: any) {
  const g = new THREE.Group();
  g.position.set(ox, 0, oz);

  const BH = 0.10;
  const twrTop = BH + height;
  const battTop = twrTop + battH;

  // Foundation ring
  const found = new THREE.Mesh(
    new THREE.CylinderGeometry(baseR * 0.92, baseR, BH, seg),
    new THREE.MeshStandardMaterial({ color: stoneDk, roughness: 0.95 }),
  );
  found.position.set(0, BH / 2, 0);
  found.castShadow = true;
  found.receiveShadow = true;
  g.add(found);

  // Tower body
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(topR, baseR, height, seg),
    new THREE.MeshStandardMaterial({ color: stoneCol, roughness: 0.88 }),
  );
  body.position.set(0, BH + height / 2, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Mid stone band 1
  const band1 = new THREE.Mesh(
    new THREE.CylinderGeometry(baseR * 0.80 + 0.02, baseR * 0.80, 0.058, seg),
    new THREE.MeshStandardMaterial({ color: stoneDk, roughness: 0.92 }),
  );
  band1.position.set(0, BH + height * 0.52, 0);
  g.add(band1);

  // Mid stone band 2
  const band2 = new THREE.Mesh(
    new THREE.CylinderGeometry(topR * 0.90 + 0.02, topR * 0.90, 0.048, seg),
    new THREE.MeshStandardMaterial({ color: stoneDk, roughness: 0.92 }),
  );
  band2.position.set(0, BH + height * 0.72, 0);
  g.add(band2);

  // Battlement ring
  const batt = new THREE.Mesh(
    new THREE.CylinderGeometry(battR, topR, battH, seg),
    new THREE.MeshStandardMaterial({ color: stoneDk, roughness: 0.90 }),
  );
  batt.position.set(0, twrTop + battH / 2, 0);
  batt.castShadow = true;
  g.add(batt);

  // Merlons
  const mGeo = new THREE.BoxGeometry(merlonSize[0], merlonSize[1], merlonSize[2]);
  const mMat = new THREE.MeshStandardMaterial({ color: playerColor, roughness: 0.68 });
  for (let i = 0; i < merlonN; i++) {
    const a = (i / merlonN) * Math.PI * 2;
    const m = new THREE.Mesh(mGeo, mMat);
    m.position.set(
      Math.sin(a) * (battR - 0.01),
      battTop + merlonSize[1] / 2,
      Math.cos(a) * (battR - 0.01),
    );
    m.castShadow = true;
    g.add(m);
  }

  // Conical roof
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(coneR, coneH, seg),
    new THREE.MeshStandardMaterial({ color: playerColor, roughness: 0.62 }),
  );
  roof.position.set(0, battTop + coneH / 2, 0);
  roof.castShadow = true;
  g.add(roof);

  // Door frame
  const dFrame = new THREE.Mesh(
    new THREE.BoxGeometry(doorW + 0.10, doorH + 0.08, 0.05),
    new THREE.MeshStandardMaterial({ color: playerColor, roughness: 0.68 }),
  );
  dFrame.position.set(0, BH + doorH / 2 + 0.04, doorZ);
  g.add(dFrame);

  // Door opening
  const dOpen = new THREE.Mesh(
    new THREE.BoxGeometry(doorW, doorH, 0.05),
    new THREE.MeshStandardMaterial({ color: dark, roughness: 0.90 }),
  );
  dOpen.position.set(0, BH + doorH / 2 + 0.04, doorZ + 0.02);
  g.add(dOpen);

  // Arrow slits
  const slitGeo = new THREE.BoxGeometry(0.07, 0.24, 0.05);
  const slitMat = new THREE.MeshStandardMaterial({ color: dark, roughness: 0.90 });
  for (const [sy, sz] of slits) {
    const s = new THREE.Mesh(slitGeo, slitMat);
    s.position.set(0, sy, sz);
    g.add(s);
  }

  return g;
}

export function createCity3D(color: string = '#2563EB', scale: number | number[] = 1): THREE.Group {
  const group = new THREE.Group();

  const STONE   = '#a0aec0';
  const STONE_D = dk(STONE, 0.22);
  const DARK    = '#1c1917';

  const SOX    = 0.54;
  const DISC_R = 0.72;
  const DISC_X = SOX / 2;

  // Main tower dims
  const M_RB = 0.52, M_RT = 0.42, M_H = 1.62, M_SEG = 12;
  const M_BATH = 0.22, M_BATR = M_RT + 0.09;
  const M_CONH = 0.72;
  const M_BH = 0.10, M_TOP = M_BH + M_H, M_BATT = M_TOP + M_BATH;

  // Secondary turret dims
  const S_RB = 0.26, S_RT = 0.20, S_H = 1.15, S_SEG = 9;
  const S_BATH = 0.16, S_BATR = S_RT + 0.07;
  const S_CONH = 0.50;
  const S_BH = 0.10;

  // Arch
  const ARCH_Y   = M_BH + M_H * 0.36;
  const ARCH_R   = 0.11;
  const ARCH_LEN = SOX - M_RB - S_RB + 0.32;

  // ── Shared base disc ──
  const baseDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(DISC_R, DISC_R + 0.08, 0.10, 14),
    new THREE.MeshStandardMaterial({ color: STONE_D, roughness: 0.95 }),
  );
  baseDisc.position.set(DISC_X, 0.05, 0);
  baseDisc.castShadow = true;
  baseDisc.receiveShadow = true;
  group.add(baseDisc);

  // ── Main tower ──
  const mainTower = _buildTower({
    ox: 0, oz: 0,
    baseR: M_RB, topR: M_RT, height: M_H, seg: M_SEG,
    battH: M_BATH, battR: M_BATR, merlonN: 8,
    merlonSize: [0.14, 0.22, 0.14],
    coneH: M_CONH, coneR: 0.36,
    doorZ: M_RB + 0.018, doorW: 0.28, doorH: 0.46,
    slits: [
      [M_BH + M_H * 0.60,  M_RT + 0.014],
      [M_BH + M_H * 0.60, -(M_RT + 0.014)],
    ],
    playerColor: color,
    stoneCol: STONE, stoneDk: STONE_D, dark: DARK,
  });
  group.add(mainTower);

  // ── Flag on main tower ──
  const flag = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.12, 0.016),
    new THREE.MeshStandardMaterial({ color, roughness: 0.65 }),
  );
  flag.position.set(0.08, M_BATT + M_CONH + 0.16, 0.05);
  group.add(flag);

  // ── Connecting arch (upper cylinder) ──
  const archTop = new THREE.Mesh(
    new THREE.CylinderGeometry(ARCH_R, ARCH_R, ARCH_LEN, 8),
    new THREE.MeshStandardMaterial({ color: STONE_D, roughness: 0.90 }),
  );
  archTop.position.set(SOX / 2, ARCH_Y + ARCH_R * 0.75, 0);
  archTop.rotation.set(0, 0, Math.PI / 2);
  archTop.castShadow = true;
  group.add(archTop);

  // ── Connecting arch (lower cylinder) ──
  const archBot = new THREE.Mesh(
    new THREE.CylinderGeometry(ARCH_R * 0.72, ARCH_R * 0.72, ARCH_LEN, 8),
    new THREE.MeshStandardMaterial({ color: STONE_D, roughness: 0.92 }),
  );
  archBot.position.set(SOX / 2, ARCH_Y - ARCH_R * 0.75, 0);
  archBot.rotation.set(0, 0, Math.PI / 2);
  group.add(archBot);

  // ── Secondary turret ──
  const secTurret = _buildTower({
    ox: SOX, oz: 0,
    baseR: S_RB, topR: S_RT, height: S_H, seg: S_SEG,
    battH: S_BATH, battR: S_BATR, merlonN: 5,
    merlonSize: [0.11, 0.17, 0.11],
    coneH: S_CONH, coneR: 0.22,
    doorZ: S_RB + 0.014, doorW: 0.20, doorH: 0.32,
    slits: [
      [S_BH + S_H * 0.62, S_RT + 0.013],
    ],
    playerColor: color,
    stoneCol: STONE, stoneDk: STONE_D, dark: DARK,
  });
  group.add(secTurret);

  // Apply scale
  if (typeof scale === 'number') {
    group.scale.set(scale, scale, scale);
  } else {
    group.scale.set(scale[0], scale[1], scale[2]);
  }

  return group;
}

// ─────────────────────────────────────────────────────────────────────────────────
// 3. createRoad3D
// ─────────────────────────────────────────────────────────────────────────────────

export function createRoad3D(color: string, length?: number, scale: number | number[] = 1): THREE.Group {
  const group = new THREE.Group();

  const LENGTH = length !== undefined ? length : 3.15;
  const FH     = 0.26;
  const PH     = 0.18;
  const PW     = 0.62;
  const FW     = PW + 0.08; // 0.70

  const FRAME_Y   = FH / 2;
  const FRAME_TOP = FH;
  const PLY       = FRAME_TOP + PH / 2 + 0.005;
  const PLANK_TOP = FRAME_TOP + PH + 0.005;
  const GRAIN_Y   = PLANK_TOP + 0.006;
  const DIVIDER_Y = PLANK_TOP + 0.010;
  const BOLT_Y    = FRAME_TOP + 0.035;

  const PLANK_COL   = '#e0cfa0';
  const PLANK_GRAIN = '#c8b882';
  const BOLT_COL    = '#4a5a6a';

  const FRAME_D = dk(color, 0.30);

  const colorMat    = new THREE.MeshStandardMaterial({ color,        roughness: 0.75 });
  const frameDkMat  = new THREE.MeshStandardMaterial({ color: FRAME_D, roughness: 0.82 });
  const plankMat    = new THREE.MeshStandardMaterial({ color: PLANK_COL, roughness: 0.84 });
  const grainMat    = new THREE.MeshStandardMaterial({ color: PLANK_GRAIN, roughness: 0.88 });
  const boltMat     = new THREE.MeshStandardMaterial({ color: BOLT_COL, roughness: 0.50, metalness: 0.40 });

  // ── Frame ──
  const frame = new THREE.Mesh(new THREE.BoxGeometry(LENGTH, FH, FW), colorMat);
  frame.position.set(0, FRAME_Y, 0);
  frame.castShadow = true;
  frame.receiveShadow = true;
  group.add(frame);

  // ── Bottom bevel ──
  const bevel = new THREE.Mesh(
    new THREE.BoxGeometry(LENGTH + 0.02, FH * 0.24, FW + 0.04),
    frameDkMat,
  );
  bevel.position.set(0, FH * 0.12, 0);
  group.add(bevel);

  // ── Side edge rails ──
  const railGeo = new THREE.BoxGeometry(LENGTH, FH - 0.01, 0.030);
  for (const s of [-1, 1]) {
    const rail = new THREE.Mesh(railGeo, frameDkMat);
    rail.position.set(0, FRAME_Y + 0.004, s * (FW / 2 - 0.018));
    group.add(rail);
  }

  // ── Main plank surface ──
  const plank = new THREE.Mesh(new THREE.BoxGeometry(LENGTH, PH, PW), plankMat);
  plank.position.set(0, PLY, 0);
  plank.castShadow = true;
  plank.receiveShadow = true;
  group.add(plank);

  // ── Plank grain lines ──
  const grainGeo = new THREE.BoxGeometry(LENGTH, 0.018, 0.022);
  for (const z of [-0.205, 0.205]) {
    const grain = new THREE.Mesh(grainGeo, grainMat);
    grain.position.set(0, GRAIN_Y, z);
    group.add(grain);
  }

  // ── Cross dividers ──
  const divGeo = new THREE.BoxGeometry(0.030, 0.020, PW + 0.04);
  for (const x of [-0.85, -0.28, 0.28, 0.85]) {
    const div = new THREE.Mesh(divGeo, grainMat);
    div.position.set(x, DIVIDER_Y, 0);
    group.add(div);
  }

  // ── Bolt posts ──
  const BOLT_X_POSITIONS = [-LENGTH * 0.32, 0, LENGTH * 0.32];
  const BOLT_Z_SIDES     = [-(PW / 2 + 0.03), PW / 2 + 0.03];
  const boltGeo = new THREE.CylinderGeometry(0.048, 0.048, 0.050, 7);

  for (const x of BOLT_X_POSITIONS) {
    for (const z of BOLT_Z_SIDES) {
      const bolt = new THREE.Mesh(boltGeo, boltMat);
      bolt.position.set(x, BOLT_Y, z);
      group.add(bolt);
    }
  }

  // Apply scale
  if (typeof scale === 'number') {
    group.scale.set(scale, scale, scale);
  } else {
    group.scale.set(scale[0], scale[1], scale[2]);
  }

  return group;
}

// ─────────────────────────────────────────────────────────────────────────────────
// 4. createRoadNode3D
// ─────────────────────────────────────────────────────────────────────────────────

export function createRoadNode3D(
  playerColor: string = '#EA580C',
  connectionAngles: number[] = [],
  neutral: boolean = false,
  scale: number | number[] = 1,
): THREE.Group {
  const group = new THREE.Group();

  const FH  = 0.26;
  const PH  = 0.18;
  const PW  = 0.62;
  const CW  = 0.30;
  const R   = 0.52;
  const CR  = 0.26;
  const PLY = FH + PH / 2 + 0.005;
  const BOLT_Y = FH + 0.035;
  const ARM_L  = 0.22;

  const C_PLANK  = '#e0cfa0';
  const C_STONE  = '#8a9ab0';
  const C_STONE2 = '#6a7a90';
  const C_BOLT   = '#4a5a6a';

  const baseColor = neutral ? C_STONE : playerColor;

  const frameMat   = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.75 });
  const frameDkMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(baseColor).multiplyScalar(0.70),
    roughness: 0.80,
  });
  const plankMat   = new THREE.MeshStandardMaterial({ color: C_PLANK,  roughness: 0.82 });
  const stoneMat   = new THREE.MeshStandardMaterial({ color: C_STONE,  roughness: 0.90 });
  const stoneDkMat = new THREE.MeshStandardMaterial({ color: C_STONE2, roughness: 0.92 });
  const boltMat    = new THREE.MeshStandardMaterial({ color: C_BOLT,   roughness: 0.50, metalness: 0.40 });

  // ── Bottom bevel ring ──
  const bevelRing = new THREE.Mesh(
    new THREE.CylinderGeometry(R + 0.05, R + 0.06, FH * 0.24, 10),
    frameDkMat,
  );
  bevelRing.position.set(0, FH * 0.12, 0);
  bevelRing.receiveShadow = true;
  group.add(bevelRing);

  // ── Main frame disc ──
  const frameDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R + 0.05, FH, 10),
    frameMat,
  );
  frameDisc.position.set(0, FH / 2, 0);
  frameDisc.castShadow = true;
  frameDisc.receiveShadow = true;
  group.add(frameDisc);

  // ── Plank ring ──
  const plankRing = new THREE.Mesh(
    new THREE.CylinderGeometry(R - 0.02, R - 0.02, PH, 10),
    plankMat,
  );
  plankRing.position.set(0, PLY, 0);
  plankRing.castShadow = true;
  plankRing.receiveShadow = true;
  group.add(plankRing);

  // ── Plank ring dividers ──
  const divGeo = new THREE.BoxGeometry((R - 0.02) * 2, 0.014, 0.035);
  for (const a of [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4]) {
    const div = new THREE.Mesh(divGeo, stoneDkMat);
    div.position.set(0, FH + PH + 0.008, 0);
    div.rotation.set(0, a, 0);
    group.add(div);
  }

  // ── Centre stone disc ──
  const centreStone = new THREE.Mesh(
    new THREE.CylinderGeometry(CR, CR + 0.02, PH * 0.55, 12),
    stoneDkMat,
  );
  centreStone.position.set(0, FH + PH + 0.012, 0);
  centreStone.castShadow = true;
  group.add(centreStone);

  const centreTop = new THREE.Mesh(
    new THREE.CylinderGeometry(CR, CR, 0.012, 12),
    stoneMat,
  );
  centreTop.position.set(0, FH + PH + PH * 0.28 + 0.012, 0);
  group.add(centreTop);

  // ── Bolt posts (8 around ring) ──
  const boltGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.048, 7);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const bolt = new THREE.Mesh(boltGeo, boltMat);
    bolt.position.set(
      Math.sin(a) * (R - 0.06),
      BOLT_Y,
      Math.cos(a) * (R - 0.06),
    );
    group.add(bolt);
  }

  // ── Stub arms toward each road ──
  for (const deg of connectionAngles) {
    const rad = (deg * Math.PI) / 180;
    const armGroup = new THREE.Group();
    armGroup.rotation.set(0, rad, 0);

    // Plank strip
    const armPlank = new THREE.Mesh(
      new THREE.BoxGeometry(PW, PH, ARM_L + 0.04),
      plankMat,
    );
    armPlank.position.set(0, PLY, R + ARM_L / 2);
    armPlank.castShadow = true;
    armGroup.add(armPlank);

    // Frame strip
    const armFrame = new THREE.Mesh(
      new THREE.BoxGeometry(PW + 0.08, FH, ARM_L + 0.04),
      frameMat,
    );
    armFrame.position.set(0, FH / 2, R + ARM_L / 2);
    armGroup.add(armFrame);

    // Stone cap
    const stoneCap = new THREE.Mesh(
      new THREE.BoxGeometry(PW + 0.28, FH + 0.02, CW + 0.02),
      stoneMat,
    );
    stoneCap.position.set(0, FH / 2, R + ARM_L + CW / 2);
    stoneCap.castShadow = true;
    armGroup.add(stoneCap);

    // Bolts on cap
    const capBoltGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.048, 7);
    for (const bx of [-PW / 2 + 0.14, PW / 2 - 0.14]) {
      const capBolt = new THREE.Mesh(capBoltGeo, boltMat);
      capBolt.position.set(bx, BOLT_Y, R + ARM_L + CW / 2);
      armGroup.add(capBolt);
    }

    group.add(armGroup);
  }

  // Apply scale
  if (typeof scale === 'number') {
    group.scale.set(scale, scale, scale);
  } else {
    group.scale.set(scale[0], scale[1], scale[2]);
  }

  return group;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. createRobber3D — hooded bandit figure
// ─────────────────────────────────────────────────────────────────────────────

export function createRobber3D(active: boolean = false, scale: number | number[] = 1): THREE.Group {
  const group = new THREE.Group();

  const bodyCol = '#1c1917', bodyMid = '#292524', bodyLight = '#44403c';
  const eyeCol = active ? '#ef4444' : '#fbbf24';
  const skinCol = '#6b4c3b', sackCol = '#78350f', sackLight = '#92400e';
  const EMIT = active ? 0.9 : 0.5;

  // Base shadow disc
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.30, 0.32, 0.02, 16),
    new THREE.MeshStandardMaterial({ color: '#0c0a09', roughness: 0.95, transparent: true, opacity: 0.60 })
  );
  base.position.y = 0.01; base.receiveShadow = true;
  group.add(base);

  // Lower cloak
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.30, 0.76, 12),
    new THREE.MeshStandardMaterial({ color: bodyCol, roughness: 0.90 }));
  robe.position.y = 0.38; robe.castShadow = true; robe.receiveShadow = true;
  group.add(robe);

  // Hem ridge
  const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.295, 0.31, 0.03, 12),
    new THREE.MeshStandardMaterial({ color: bodyMid, roughness: 0.92 }));
  hem.position.y = 0.015; group.add(hem);

  // Fold lines
  [-0.06, 0.06].forEach(x => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.55, 0.02),
      new THREE.MeshStandardMaterial({ color: bodyLight, roughness: 0.92 }));
    f.position.set(x, 0.36, 0.21); group.add(f);
  });

  // Torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.23, 0.36, 12),
    new THREE.MeshStandardMaterial({ color: bodyCol, roughness: 0.88 }));
  torso.position.y = 0.88; torso.castShadow = true; group.add(torso);

  // Belt + buckle
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.215, 0.06, 12),
    new THREE.MeshStandardMaterial({ color: bodyMid, roughness: 0.80 }));
  belt.position.y = 0.76; group.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.02),
    new THREE.MeshStandardMaterial({ color: '#78716c', roughness: 0.40, metalness: 0.50 }));
  buckle.position.set(0, 0.76, 0.22); group.add(buckle);

  // Shoulders
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.19, 0.22, 12),
    new THREE.MeshStandardMaterial({ color: bodyCol, roughness: 0.88 }));
  sh.position.y = 1.02; sh.castShadow = true; group.add(sh);
  const shTop = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.21, 0.10, 12),
    new THREE.MeshStandardMaterial({ color: bodyLight, roughness: 0.85 }));
  shTop.position.y = 1.08; group.add(shTop);

  // Arms
  [-1, 1].forEach(side => {
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.32, 7),
      new THREE.MeshStandardMaterial({ color: bodyCol, roughness: 0.88 }));
    upper.position.set(side * 0.23, 0.96, 0.04);
    upper.rotation.set(0.25, 0, side * 0.30); upper.castShadow = true; group.add(upper);
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.28, 7),
      new THREE.MeshStandardMaterial({ color: bodyCol, roughness: 0.88 }));
    fore.position.set(side * 0.28, 0.76, 0.12);
    fore.rotation.set(0.55, 0, side * 0.15); fore.castShadow = true; group.add(fore);
  });

  // Neck + Head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.12, 8),
    new THREE.MeshStandardMaterial({ color: skinCol, roughness: 0.85 }));
  neck.position.y = 1.16; group.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.145, 10, 10),
    new THREE.MeshStandardMaterial({ color: skinCol, roughness: 0.82 }));
  head.position.set(0, 1.28, 0.01); head.castShadow = true; group.add(head);

  // Hood + brim
  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.20, 0.46, 10),
    new THREE.MeshStandardMaterial({ color: bodyCol, roughness: 0.85 }));
  hood.position.set(0, 1.30, -0.02); hood.castShadow = true; group.add(hood);
  const brim = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 7, 16),
    new THREE.MeshStandardMaterial({ color: bodyLight, roughness: 0.88 }));
  brim.position.set(0, 1.13, 0.04); brim.rotation.x = 0.18; group.add(brim);

  // Eyes (glowing)
  const eyeMat = new THREE.MeshStandardMaterial({
    color: eyeCol, emissive: eyeCol, emissiveIntensity: EMIT, roughness: 0.20 });
  [-0.055, 0.055].forEach(x => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.030, 7, 7), eyeMat);
    eye.position.set(x, 1.255, 0.136); group.add(eye);
  });

  // Sack
  const sack = new THREE.Mesh(new THREE.SphereGeometry(0.12, 9, 9),
    new THREE.MeshStandardMaterial({ color: sackCol, roughness: 0.90 }));
  sack.position.set(-0.30, 0.65, 0.14); sack.rotation.set(0.4, 0.3, 0.2);
  sack.castShadow = true; group.add(sack);
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 7, 7),
    new THREE.MeshStandardMaterial({ color: sackLight, roughness: 0.88 }));
  knot.position.set(-0.27, 0.72, 0.17); group.add(knot);

  // Active glow ring
  if (active) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.03, 8, 24),
      new THREE.MeshStandardMaterial({
        color: '#ef4444', emissive: '#ef4444', emissiveIntensity: 0.80,
        roughness: 0.30, transparent: true, opacity: 0.85 }));
    ring.position.y = 0.04; group.add(ring);
  }

  if (typeof scale === 'number') group.scale.setScalar(scale);
  else group.scale.set(scale[0], scale[1], scale[2]);

  return group;
}
