import * as THREE from 'three';
import { mat, palette, addOutline, canvasTex } from './materials';

export function createSettlement() {
  const group = new THREE.Group();

  // ── Palette ─────────────────────────────────────────────────────────────────
  const P = {
    wall:    palette('settlementWall'),
    roof:    palette('settlementRoof'),
    door:    palette('settlementDoor'),
    timber:  palette('settlementTimber'),
    stone:   palette('settlementStone'),
    window:  palette('settlementWindow'),
    grass:   palette('grassGreen'),
    flowerP: palette('flowerPink'),
    flowerY: palette('flowerYellow'),
  };

  // ── Procedural textures ─────────────────────────────────────────────────────
  const stoneTex = canvasTex(128, (ctx, s) => {
    ctx.fillStyle = '#706860';
    ctx.fillRect(0, 0, s, s);
    const cols = ['#8a8070', '#9a9080', '#7a7068', '#958d80', '#847a6e'];
    for (let row = 0; row < 8; row++) {
      let x = (row % 2) * 10;
      const y = row * (s / 8);
      const h = s / 8 - 2;
      while (x < s) {
        const w = 12 + Math.random() * 10;
        ctx.fillStyle = cols[Math.floor(Math.random() * cols.length)];
        ctx.fillRect(x + 1, y + 1, Math.min(w - 2, s - x - 1), h);
        x += w;
      }
    }
  });
  stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping;

  const woodTex = canvasTex(64, (ctx, s) => {
    const r = (P.door >> 16) & 0xff, g = (P.door >> 8) & 0xff, b = P.door & 0xff;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y++) {
      ctx.fillStyle = `rgba(0,0,0,${0.02 + Math.random() * 0.04})`;
      ctx.fillRect(0, y, s, 1);
    }
    ctx.beginPath();
    ctx.arc(s * 0.3, s * 0.6, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fill();
  });

  // ── Materials ───────────────────────────────────────────────────────────────
  const wallMat   = mat(P.wall);
  const roofMat   = mat(P.roof);
  const doorMat   = mat(P.door, { map: woodTex });
  const timberMat = mat(P.timber);
  const stoneMat  = mat(P.stone, { map: stoneTex });
  const windowMat = mat(P.window, { emissive: P.window, emissiveIntensity: 0.6 });
  const grassMat  = mat(P.grass);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 1. FOUNDATION (stone base, slightly wider than walls) ───────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const foundation = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.10, 0.72), stoneMat);
  foundation.position.y = 0.05;
  foundation.castShadow = true;
  foundation.receiveShadow = true;

  // Decorative stones around base
  [[-0.32, 0.02, 0.38], [0.10, 0.02, 0.39], [0.34, 0.02, 0.36],
   [-0.38, 0.02, -0.15], [0.38, 0.02, 0.10], [-0.35, 0.02, 0.22],
   [0.30, 0.02, -0.37], [-0.10, 0.02, -0.38]].forEach(([x, y, z]) => {
    const s = new THREE.Mesh(
      new THREE.BoxGeometry(0.09 + Math.random() * 0.06, 0.05, 0.07 + Math.random() * 0.04),
      stoneMat
    );
    s.position.set(x, y, z);
    s.rotation.y = Math.random() * 0.6;
    s.castShadow = true;
    group.add(s);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 2. WALLS (plaster body) ─────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const walls = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.48, 0.58), wallMat);
  walls.position.y = 0.34;
  walls.castShadow = true;
  walls.receiveShadow = true;

  // ── 3. TIMBER FRAMING (Fachwerk / half-timbered) ────────────────────────────
  const TB = 0.035; // timber beam thickness

  // Corner vertical beams
  const vBeam = new THREE.BoxGeometry(TB, 0.48, TB);
  [[-0.29, 0.34, 0.29], [0.29, 0.34, 0.29],
   [-0.29, 0.34, -0.29], [0.29, 0.34, -0.29]].forEach(([x, y, z]) => {
    const b = new THREE.Mesh(vBeam, timberMat);
    b.position.set(x, y, z);
    b.castShadow = true;
    group.add(b);
  });

  // Center vertical beam (front gable only)
  const cvBeam = new THREE.Mesh(new THREE.BoxGeometry(TB, 0.20, TB), timberMat);
  cvBeam.position.set(0, 0.48, 0.29);
  group.add(cvBeam);

  // Horizontal beams — top & mid (front + back)
  [0.57, 0.34].forEach((yy) => {
    [0.29, -0.29].forEach((zz) => {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.62, TB, TB), timberMat);
      h.position.set(0, yy, zz);
      h.castShadow = true;
      group.add(h);
    });
  });

  // Horizontal beams — top & mid (sides)
  [0.57, 0.34].forEach((yy) => {
    [0.29, -0.29].forEach((xx) => {
      const h = new THREE.Mesh(new THREE.BoxGeometry(TB, TB, 0.58), timberMat);
      h.position.set(xx, yy, 0);
      h.castShadow = true;
      group.add(h);
    });
  });

  // Diagonal cross beams (side walls, X pattern)
  [[-0.29, 0], [0.29, 0]].forEach(([xx, zz]) => {
    const diag = new THREE.Mesh(new THREE.BoxGeometry(TB * 0.7, 0.32, TB * 0.7), timberMat);
    diag.position.set(xx, 0.42, zz);
    diag.rotation.z = 0.65;
    group.add(diag);
    const diag2 = new THREE.Mesh(new THREE.BoxGeometry(TB * 0.7, 0.32, TB * 0.7), timberMat);
    diag2.position.set(xx, 0.42, zz);
    diag2.rotation.z = -0.65;
    group.add(diag2);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 4. ROOF (gabled with overhang) ──────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-0.44, 0);
  roofShape.lineTo(0, 0.38);
  roofShape.lineTo(0.44, 0);
  roofShape.closePath();

  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 0.74, bevelEnabled: false });
  roofGeo.translate(0, 0, -0.37); // center along Z
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 0.58;
  roof.castShadow = true;

  // Ridge cap (timber beam along the peak)
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.78), timberMat);
  ridge.position.set(0, 0.97, 0);
  ridge.castShadow = true;

  // Rafter ends (visible under overhang, front & back)
  const rafterGeo = new THREE.BoxGeometry(0.88, 0.025, 0.03);
  [0.37, -0.37].forEach((zz) => {
    const r = new THREE.Mesh(rafterGeo, timberMat);
    r.position.set(0, 0.59, zz);
    group.add(r);
  });

  // Gable triangle fill (front & back) — slightly recessed plaster
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-0.29, 0);
  gableShape.lineTo(0, 0.30);
  gableShape.lineTo(0.29, 0);
  gableShape.closePath();
  const gableGeo = new THREE.ShapeGeometry(gableShape);

  const gableFront = new THREE.Mesh(gableGeo, wallMat);
  gableFront.position.set(0, 0.58, 0.295);
  group.add(gableFront);

  const gableBack = new THREE.Mesh(gableGeo, wallMat);
  gableBack.position.set(0, 0.58, -0.295);
  gableBack.rotation.y = Math.PI;
  group.add(gableBack);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 5. DOOR (arched, with frame & step) ─────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const dw = 0.13, dh = 0.24;
  const doorShape = new THREE.Shape();
  doorShape.moveTo(-dw / 2, 0);
  doorShape.lineTo(-dw / 2, dh * 0.72);
  doorShape.quadraticCurveTo(-dw / 2, dh, 0, dh);
  doorShape.quadraticCurveTo(dw / 2, dh, dw / 2, dh * 0.72);
  doorShape.lineTo(dw / 2, 0);
  doorShape.closePath();

  const door = new THREE.Mesh(new THREE.ShapeGeometry(doorShape), doorMat);
  door.position.set(0, 0.10, 0.296);

  // Door frame (timber surround)
  const dfSide = new THREE.BoxGeometry(0.025, dh + 0.02, 0.02);
  const dfLeft = new THREE.Mesh(dfSide, timberMat);
  dfLeft.position.set(-dw / 2 - 0.01, 0.10 + dh / 2, 0.30);
  const dfRight = new THREE.Mesh(dfSide, timberMat);
  dfRight.position.set(dw / 2 + 0.01, 0.10 + dh / 2, 0.30);
  const dfTop = new THREE.Mesh(new THREE.BoxGeometry(dw + 0.07, 0.025, 0.02), timberMat);
  dfTop.position.set(0, 0.10 + dh + 0.01, 0.30);

  // Door handle (small sphere)
  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), timberMat);
  handle.position.set(0.04, 0.22, 0.305);

  // Stone step
  const step = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.035, 0.08), stoneMat);
  step.position.set(0, 0.10, 0.36);
  step.castShadow = true;

  group.add(door, dfLeft, dfRight, dfTop, handle, step);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 6. WINDOWS (warm interior glow) ─────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const wGeo = new THREE.PlaneGeometry(0.09, 0.09);

  [[-0.17, 0.43, 0.296], [0.17, 0.43, 0.296]].forEach(([wx, wy, wz]) => {
    // Glow pane
    const win = new THREE.Mesh(wGeo, windowMat);
    win.position.set(wx, wy, wz);
    group.add(win);

    // Cross frame (window pane divider)
    const fH = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.015, 0.008), timberMat);
    fH.position.set(wx, wy, wz + 0.005);
    const fV = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.09, 0.008), timberMat);
    fV.position.set(wx, wy, wz + 0.005);
    group.add(fH, fV);

    // Window frame (outer border)
    const frmW = 0.012;
    [[wx, wy + 0.05, 0.10, frmW],   // top
     [wx, wy - 0.05, 0.10, frmW],   // bottom
    ].forEach(([fx, fy, fw, fh]) => {
      const f = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.01), timberMat);
      f.position.set(fx, fy, wz + 0.005);
      group.add(f);
    });
    [[wx - 0.05, wy, frmW, 0.10 + frmW * 2],
     [wx + 0.05, wy, frmW, 0.10 + frmW * 2],
    ].forEach(([fx, fy, fw, fh]) => {
      const f = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.01), timberMat);
      f.position.set(fx, fy, wz + 0.005);
      group.add(f);
    });

    // Window sill (small ledge)
    const sill = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, 0.03), timberMat);
    sill.position.set(wx, wy - 0.05 - 0.008, wz + 0.015);
    sill.castShadow = true;
    group.add(sill);
  });

  // Side wall window (left side)
  const sideWin = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.07), windowMat);
  sideWin.position.set(-0.296, 0.43, 0);
  sideWin.rotation.y = -Math.PI / 2;
  group.add(sideWin);
  const sideWinH = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.012, 0.07), timberMat);
  sideWinH.position.set(-0.298, 0.43, 0);
  const sideWinV = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.07, 0.012), timberMat);
  sideWinV.position.set(-0.298, 0.43, 0);
  group.add(sideWinH, sideWinV);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 7. CHIMNEY ──────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.34, 0.10), stoneMat);
  chimney.position.set(0.16, 0.84, -0.12);
  chimney.castShadow = true;

  const chimneyTop = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.14), stoneMat);
  chimneyTop.position.set(0.16, 1.02, -0.12);

  // Chimney opening
  const chimneyHole = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.02, 0.06),
    mat(0x222222)
  );
  chimneyHole.position.set(0.16, 1.04, -0.12);
  group.add(chimney, chimneyTop, chimneyHole);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 8. FLOWER BOX (under right window) ──────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const fBox = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.04), timberMat);
  fBox.position.set(0.17, 0.37, 0.31);
  fBox.castShadow = true;
  group.add(fBox);

  // Flower puffs
  const fColors = [P.flowerP, P.flowerY, P.flowerP];
  fColors.forEach((c, i) => {
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.016, 5, 4), mat(c));
    petal.position.set(0.13 + i * 0.04, 0.40, 0.31);
    group.add(petal);
    // Stem
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.04, 4), grassMat);
    stem.position.set(0.13 + i * 0.04, 0.39, 0.31);
    group.add(stem);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 9. SMALL FENCE (beside the house) ───────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const postGeo = new THREE.CylinderGeometry(0.012, 0.016, 0.20, 6);
  const postTops: any[] = [];
  for (let i = 0; i < 3; i++) {
    const post = new THREE.Mesh(postGeo, timberMat);
    post.position.set(-0.48 + i * 0.10, 0.10, 0.36);
    post.castShadow = true;
    group.add(post);
    postTops.push(post.position);
  }
  // Horizontal rails
  [0.12, 0.18].forEach((ry) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.015, 0.015), timberMat);
    rail.position.set(-0.38, ry, 0.36);
    group.add(rail);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 10. GRASS & GROUND DETAIL ───────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const bladeGeo = new THREE.ConeGeometry(0.012, 0.055, 3);
  const clusterPositions = [
    [-0.40, 0.34], [0.38, 0.30], [-0.36, -0.34],
    [0.36, -0.30], [-0.30, 0.40], [0.32, -0.38],
    [0.42, 0.05], [-0.42, -0.10],
  ];
  clusterPositions.forEach(([cx, cz]) => {
    for (let g = 0; g < 4; g++) {
      const blade = new THREE.Mesh(bladeGeo, grassMat);
      blade.position.set(
        cx + (Math.random() - 0.5) * 0.06,
        0.028,
        cz + (Math.random() - 0.5) * 0.06
      );
      blade.rotation.z = (Math.random() - 0.5) * 0.35;
      blade.rotation.x = (Math.random() - 0.5) * 0.2;
      group.add(blade);
    }
  });

  // Small pebbles around foundation
  const pebbleMat = mat(0x9a9088);
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2 + Math.random() * 0.3;
    const dist = 0.38 + Math.random() * 0.06;
    const pebble = new THREE.Mesh(
      new THREE.SphereGeometry(0.012 + Math.random() * 0.008, 5, 3),
      pebbleMat
    );
    pebble.position.set(Math.cos(angle) * dist, 0.01, Math.sin(angle) * dist);
    pebble.scale.y = 0.5;
    group.add(pebble);
  }

  // ── Assemble ────────────────────────────────────────────────────────────────
  group.add(foundation, walls, roof, ridge);

  addOutline(group);
  return group;
}

export const settlementMeta = {
  id: 'settlement',
  name: 'Settlement',
  category: 'Oyun Taşı',
  description: '1 zafer puanı. Şehre yükseltilebilir. Detaylı Fachwerk evi.',
  type: 'Bina',
  materials: 8,
  geo: 'Prosedürel',
};
