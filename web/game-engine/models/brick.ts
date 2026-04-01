import * as THREE from 'three';
import { mat, palette, addOutline, canvasTex } from './materials';

export function createBrick() {
  const group = new THREE.Group();

  // ── Palette ─────────────────────────────────────────────────────────────────
  const P = {
    brick:   palette('brickMain'),
    mortar:  palette('brickMortar'),
    kiln:    palette('brickKiln'),
    timber:  palette('settlementTimber'),
    glow:    palette('settlementWindow'),
    stone:   palette('settlementStone'),
  };

  // ── Procedural textures ─────────────────────────────────────────────────────
  const brickTex = canvasTex(128, (ctx, s) => {
    // Base brick color with subtle surface variation
    const r = (P.brick >> 16) & 0xff, g = (P.brick >> 8) & 0xff, b = P.brick & 0xff;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, s, s);
    // Rough surface noise
    for (let i = 0; i < 600; i++) {
      const px = Math.random() * s, py = Math.random() * s;
      ctx.fillStyle = `rgba(${Math.random() > 0.5 ? 0 : 255},${Math.random() > 0.5 ? 0 : 200},${Math.random() > 0.5 ? 0 : 100},${0.02 + Math.random() * 0.04})`;
      ctx.fillRect(px, py, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    // Hairline cracks
    for (let c = 0; c < 3; c++) {
      ctx.strokeStyle = `rgba(0,0,0,${0.06 + Math.random() * 0.06})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(Math.random() * s, Math.random() * s);
      ctx.lineTo(Math.random() * s, Math.random() * s);
      ctx.stroke();
    }
  });
  brickTex.wrapS = brickTex.wrapT = THREE.RepeatWrapping;

  const clayTex = canvasTex(64, (ctx, s) => {
    ctx.fillStyle = '#8a4422';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = `rgba(${80 + Math.random() * 60},${30 + Math.random() * 30},${10 + Math.random() * 20},${0.15 + Math.random() * 0.1})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 2 + Math.random() * 3, 1 + Math.random() * 2);
    }
  });

  // ── Materials ───────────────────────────────────────────────────────────────
  const brickMat   = mat(P.brick, { map: brickTex });
  const mortarMat  = mat(P.mortar);
  const kilnMat    = mat(P.kiln, { map: brickTex });
  const timberMat  = mat(P.timber);
  const glowMat    = mat(P.glow, { emissive: P.glow, emissiveIntensity: 0.8 });
  const stoneMat   = mat(P.stone);
  const darkMat    = mat(0x1a1210);
  const clayMat    = mat(0x8a4422, { map: clayTex });
  const smokeMat   = mat(0x888888, { transparent: true, opacity: 0.25 });
  const metalMat   = mat(0x3a3a3a);
  const waterMat   = mat(0x5588aa, { transparent: true, opacity: 0.6 });
  const mudMat     = mat(0x7a4020);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 1. BRICK STACK — running bond masonry pattern (5 rows) ────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const BW = 0.14;   // brick width
  const BH = 0.065;  // brick height
  const BD = 0.07;   // brick depth
  const MG = 0.012;  // mortar gap
  const stackW = BW * 3 + MG * 2;  // total stack width ~0.444

  const addBrick = (x: number, y: number, z: number, opts: any = {}) => {
    const w = opts.w || BW;
    const h = opts.h || BH;
    const d = opts.d || BD;
    const protrude = opts.protrude || 0;
    const recess   = opts.recess   || 0;

    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), brickMat);
    b.position.set(x + protrude, y, z - recess);
    if (opts.rotY) b.rotation.y = opts.rotY;
    if (opts.rotZ) b.rotation.z = opts.rotZ;
    b.castShadow = true;
    b.receiveShadow = true;
    group.add(b);
    return b;
  };

  // Mortar line (horizontal, between rows)
  const addMortarH = (y) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(stackW + 0.02, MG * 0.6, BD * 3 + 0.04),
      mortarMat
    );
    m.position.set(0, y, 0);
    m.receiveShadow = true;
    group.add(m);
  };

  // Mortar line (vertical, between bricks in a row)
  const addMortarV = (x, y) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(MG * 0.6, BH, BD * 3 + 0.02),
      mortarMat
    );
    m.position.set(x, y, 0);
    group.add(m);
  };

  // Build 5 rows with running bond offset
  for (let row = 0; row < 5; row++) {
    const y = BH / 2 + row * (BH + MG);
    const offset = (row % 2 === 0) ? 0 : BW / 2 + MG / 2;

    // Horizontal mortar below each row (except first — that sits on ground)
    if (row > 0) addMortarH(y - BH / 2 - MG / 2);

    // Place 3 bricks per row across 3 depth lanes
    for (let dz = -1; dz <= 1; dz++) {
      const z = dz * (BD + MG);

      if (row % 2 === 0) {
        // Even rows: 3 full bricks
        for (let col = -1; col <= 1; col++) {
          const x = col * (BW + MG);
          const protrude = (Math.random() > 0.7) ? (Math.random() * 0.01 - 0.005) : 0;
          const recess   = (Math.random() > 0.8) ? (Math.random() * 0.008) : 0;
          addBrick(x + offset, y, z, { protrude, recess });
        }
        // Vertical mortar lines between bricks
        addMortarV(-(BW / 2 + MG / 2) + offset, y);
        addMortarV((BW / 2 + MG / 2) + offset, y);
      } else {
        // Odd rows: offset by half-brick (running bond)
        // Start with half brick, then 2 full, then half
        addBrick(-BW - MG / 2 + offset, y, z, { w: BW * 0.5 });
        addBrick(offset, y, z);
        addBrick(BW + MG + offset, y, z, { w: BW * 0.5 });
        // Vertical mortar
        addMortarV(-BW * 0.25 - MG / 4 + offset, y);
        addMortarV(BW * 0.75 + MG * 0.75 + offset, y);
      }
    }
  }

  // Top mortar cap
  addMortarH(5 * (BH + MG));

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 2. KILN / OVEN on top (dome with chimney) ─────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const kilnBaseY = 5 * (BH + MG) + 0.01;

  // Kiln dome body (sphere hemisphere)
  const kilnDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    kilnMat
  );
  kilnDome.position.set(0, kilnBaseY, 0);
  kilnDome.castShadow = true;
  group.add(kilnDome);

  // Kiln base ring
  const kilnBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.16, 0.03, 12),
    kilnMat
  );
  kilnBase.position.set(0, kilnBaseY + 0.015, 0);
  group.add(kilnBase);

  // Chimney on top of dome
  const chimney = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.04, 0.12, 8),
    kilnMat
  );
  chimney.position.set(0, kilnBaseY + 0.14 + 0.06, 0);
  chimney.castShadow = true;
  group.add(chimney);

  // Chimney rim
  const chimneyRim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.042, 0.042, 0.02, 8),
    kilnMat
  );
  chimneyRim.position.set(0, kilnBaseY + 0.14 + 0.12 + 0.01, 0);
  group.add(chimneyRim);

  // Kiln opening (dark arch on front)
  const archShape = new THREE.Shape();
  const aw = 0.055, ah = 0.08;
  archShape.moveTo(-aw, 0);
  archShape.lineTo(-aw, ah * 0.6);
  archShape.quadraticCurveTo(-aw, ah, 0, ah);
  archShape.quadraticCurveTo(aw, ah, aw, ah * 0.6);
  archShape.lineTo(aw, 0);
  archShape.closePath();

  const archDoor = new THREE.Mesh(new THREE.ShapeGeometry(archShape), darkMat);
  archDoor.position.set(0, kilnBaseY + 0.005, 0.145);
  group.add(archDoor);

  // Warm glow inside kiln opening
  const glowPlane = new THREE.Mesh(
    new THREE.ShapeGeometry(archShape),
    glowMat
  );
  glowPlane.position.set(0, kilnBaseY + 0.005, 0.14);
  glowPlane.scale.set(0.75, 0.75, 1);
  group.add(glowPlane);

  // Glow point light (subtle warm radiance)
  // (represented as a small emissive sphere)
  const glowOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.02, 6, 4),
    mat(0xff6622, { emissive: 0xff6622, emissiveIntensity: 1.2, transparent: true, opacity: 0.5 })
  );
  glowOrb.position.set(0, kilnBaseY + 0.035, 0.11);
  group.add(glowOrb);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 3. SMOKE WISPS from chimney top ───────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const smokeBaseY = kilnBaseY + 0.14 + 0.13;
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(
      new THREE.SphereGeometry(0.012 + i * 0.004, 6, 5),
      smokeMat
    );
    s.position.set(
      (Math.random() - 0.5) * 0.02,
      smokeBaseY + i * 0.035,
      (Math.random() - 0.5) * 0.02
    );
    s.scale.y = 0.7 + Math.random() * 0.3;
    s.material = mat(0x888888, {
      transparent: true,
      opacity: 0.3 - i * 0.04,
    });
    group.add(s);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 4. LOOSE / BROKEN BRICKS scattered at base ────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const loosePositions = [
    { x: -0.34, z: -0.22, rotY: 0.4,  rotZ: 0 },
    { x:  0.30, z:  0.28, rotY: -0.6, rotZ: 0 },
    { x: -0.28, z:  0.30, rotY: 0.9,  rotZ: 0.15 },
    { x:  0.36, z: -0.18, rotY: -0.3, rotZ: -0.1 },
    { x:  0.06, z:  0.32, rotY: 1.2,  rotZ: 0 },
    { x: -0.38, z:  0.06, rotY: 0.1,  rotZ: 0.2 },
    // Half-broken bricks (smaller)
    { x:  0.26, z: -0.30, rotY: 0.7,  rotZ: 0.3, w: 0.08, h: 0.05, d: 0.06 },
    { x: -0.18, z: -0.34, rotY: -1.0, rotZ: 0.1, w: 0.06, h: 0.04, d: 0.05 },
  ];
  loosePositions.forEach((lp) => {
    addBrick(lp.x, (lp.h || BH) / 2, lp.z, {
      w: lp.w || BW * 0.85,
      h: lp.h || BH * 0.9,
      d: lp.d || BD * 0.9,
      rotY: lp.rotY,
      rotZ: lp.rotZ,
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 5. BRICK MOLD (wooden frame with wet clay) ────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const moldX = 0.38, moldZ = 0.15;

  // Outer frame sides (4 planks forming a rectangle)
  const mfW = 0.18, mfD = 0.10, mfH = 0.04, mfT = 0.012;

  // Front & back
  [mfD / 2, -mfD / 2].forEach((dz) => {
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(mfW, mfH, mfT),
      timberMat
    );
    plank.position.set(moldX, mfH / 2, moldZ + dz);
    plank.castShadow = true;
    group.add(plank);
  });
  // Left & right
  [-mfW / 2, mfW / 2].forEach((dx) => {
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(mfT, mfH, mfD - mfT * 2),
      timberMat
    );
    plank.position.set(moldX + dx, mfH / 2, moldZ);
    plank.castShadow = true;
    group.add(plank);
  });
  // Center divider
  const divider = new THREE.Mesh(
    new THREE.BoxGeometry(mfT, mfH * 0.9, mfD - mfT * 2),
    timberMat
  );
  divider.position.set(moldX, mfH / 2, moldZ);
  group.add(divider);

  // Wet clay filling inside mold (two bricks worth)
  [-mfW / 4, mfW / 4].forEach((dx) => {
    const clay = new THREE.Mesh(
      new THREE.BoxGeometry(mfW / 2 - mfT * 1.5, mfH * 0.7, mfD - mfT * 3),
      clayMat
    );
    clay.position.set(moldX + dx, mfH * 0.35, moldZ);
    clay.receiveShadow = true;
    group.add(clay);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 6. CLAY POT / VESSEL near kiln ───────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const potX = -0.30, potZ = 0.22;

  // Pot body (cylinder, slightly wider at bottom)
  const potBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.045, 0.09, 10),
    clayMat
  );
  potBody.position.set(potX, 0.045, potZ);
  potBody.castShadow = true;
  group.add(potBody);

  // Pot rim (torus at top)
  const potRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.037, 0.006, 6, 12),
    clayMat
  );
  potRim.position.set(potX, 0.09, potZ);
  potRim.rotation.x = Math.PI / 2;
  group.add(potRim);

  // Clay inside pot
  const potClay = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.032, 0.015, 8),
    mudMat
  );
  potClay.position.set(potX, 0.082, potZ);
  group.add(potClay);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 7. TONGS / TOOLS leaning against the stack ────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  // Tongs (two thin arms joined at pivot)
  const tongArmGeo = new THREE.BoxGeometry(0.008, 0.22, 0.008);

  const tongL = new THREE.Mesh(tongArmGeo, metalMat);
  tongL.position.set(-0.26, 0.10, -0.09);
  tongL.rotation.z = 0.25;
  tongL.rotation.y = 0.1;
  tongL.castShadow = true;
  group.add(tongL);

  const tongR = new THREE.Mesh(tongArmGeo, metalMat);
  tongR.position.set(-0.24, 0.10, -0.09);
  tongR.rotation.z = 0.20;
  tongR.rotation.y = 0.1;
  tongR.castShadow = true;
  group.add(tongR);

  // Pivot rivet (small sphere)
  const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.008, 5, 4), metalMat);
  rivet.position.set(-0.25, 0.16, -0.09);
  group.add(rivet);

  // Poker / fire iron (thin rod)
  const poker = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.005, 0.26, 5),
    metalMat
  );
  poker.position.set(-0.22, 0.12, -0.12);
  poker.rotation.z = 0.30;
  poker.rotation.y = -0.2;
  poker.castShadow = true;
  group.add(poker);

  // Poker handle (small wooden knob)
  const pokerHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.008, 0.03, 5),
    timberMat
  );
  pokerHandle.position.set(-0.258, 0.23, -0.14);
  pokerHandle.rotation.z = 0.30;
  group.add(pokerHandle);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 8. WATER BUCKET ───────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const bucketX = 0.32, bucketZ = -0.28;

  // Bucket body
  const bucket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.035, 0.07, 10),
    timberMat
  );
  bucket.position.set(bucketX, 0.035, bucketZ);
  bucket.castShadow = true;
  group.add(bucket);

  // Metal bands (2 rings around bucket)
  [0.015, 0.05].forEach((by) => {
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.041, 0.003, 4, 12),
      metalMat
    );
    band.position.set(bucketX, by, bucketZ);
    band.rotation.x = Math.PI / 2;
    group.add(band);
  });

  // Water surface inside
  const waterSurf = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.036, 0.005, 10),
    waterMat
  );
  waterSurf.position.set(bucketX, 0.062, bucketZ);
  group.add(waterSurf);

  // Handle arc
  const handleCurve = new THREE.TorusGeometry(0.035, 0.004, 4, 10, Math.PI);
  const bucketHandle = new THREE.Mesh(handleCurve, metalMat);
  bucketHandle.position.set(bucketX, 0.07, bucketZ);
  bucketHandle.rotation.y = Math.PI / 4;
  group.add(bucketHandle);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 9. GROUND DETAIL — clay/mud patches, stones ───────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  // Reddish-brown clay/mud patches (flat discs)
  const patchPositions = [
    [-0.15, 0.30], [0.20, -0.25], [-0.35, -0.10],
    [0.10, 0.35],  [-0.10, -0.35], [0.35, 0.05],
    [0.00, -0.30], [-0.25, 0.15],
  ];
  patchPositions.forEach(([px, pz]) => {
    const patch = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.03 + Math.random() * 0.025,
        0.035 + Math.random() * 0.03,
        0.005,
        8
      ),
      mudMat
    );
    patch.position.set(px, 0.003, pz);
    patch.rotation.y = Math.random() * Math.PI;
    patch.receiveShadow = true;
    group.add(patch);
  });

  // Small stones scattered
  const pebbleMat = mat(P.stone);
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 0.30 + Math.random() * 0.14;
    const pebble = new THREE.Mesh(
      new THREE.SphereGeometry(0.01 + Math.random() * 0.008, 5, 3),
      pebbleMat
    );
    pebble.position.set(
      Math.cos(angle) * dist,
      0.008,
      Math.sin(angle) * dist
    );
    pebble.scale.y = 0.4 + Math.random() * 0.3;
    group.add(pebble);
  }

  // Brick dust / debris (tiny reddish fragments near the stack base)
  for (let i = 0; i < 8; i++) {
    const frag = new THREE.Mesh(
      new THREE.BoxGeometry(
        0.01 + Math.random() * 0.012,
        0.005 + Math.random() * 0.005,
        0.008 + Math.random() * 0.01
      ),
      brickMat
    );
    frag.position.set(
      (Math.random() - 0.5) * 0.5,
      0.004,
      (Math.random() - 0.5) * 0.5
    );
    frag.rotation.y = Math.random() * Math.PI;
    frag.rotation.z = Math.random() * 0.3;
    group.add(frag);
  }

  // ── Assemble & finalize ───────────────────────────────────────────────────
  addOutline(group);
  return group;
}

export const brickMeta = {
  id: 'brick',
  name: 'Brick',
  category: 'Kaynak',
  description: 'Kil kaynağını temsil eden tuğla fırını ve yığını. Harç detaylı duvar örüsü, kubbe fırın, duman, kalıp ve aletler içerir.',
  type: 'Kaynak Token',
  materials: 12,
  geo: 'Prosedürel',
};
