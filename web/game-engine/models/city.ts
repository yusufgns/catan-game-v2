import * as THREE from 'three';
import { mat, palette, addOutline, canvasTex } from './materials';

export function createCity() {
  const group = new THREE.Group();

  // ── Palette ─────────────────────────────────────────────────────────────────
  const P = {
    wall:    palette('cityWall'),
    roof:    palette('cityRoof'),
    stone:   palette('cityStone'),
    timber:  palette('settlementTimber'),
    window:  palette('settlementWindow'),
    sstone:  palette('settlementStone'),
    grass:   palette('grassGreen'),
    flag:    palette('shipFlag'),
  };

  // ── Procedural textures ─────────────────────────────────────────────────────
  const stoneTex = canvasTex(128, (ctx, s) => {
    ctx.fillStyle = '#807870';
    ctx.fillRect(0, 0, s, s);
    const cols = ['#9a9080', '#8a8070', '#a09888', '#7a7268', '#948c80'];
    for (let row = 0; row < 10; row++) {
      let x = (row % 2) * 8;
      const y = row * (s / 10);
      const h = s / 10 - 2;
      while (x < s) {
        const w = 10 + Math.random() * 8;
        ctx.fillStyle = cols[Math.floor(Math.random() * cols.length)];
        ctx.fillRect(x + 1, y + 1, Math.min(w - 2, s - x - 1), h);
        x += w;
      }
    }
  });
  stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping;

  const timberTex = canvasTex(64, (ctx, s) => {
    const r = (P.timber >> 16) & 0xff, g = (P.timber >> 8) & 0xff, b = P.timber & 0xff;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y++) {
      ctx.fillStyle = `rgba(0,0,0,${0.02 + Math.random() * 0.04})`;
      ctx.fillRect(0, y, s, 1);
    }
  });

  // ── Materials ───────────────────────────────────────────────────────────────
  const wallMat    = mat(P.wall);
  const roofMat    = mat(P.roof);
  const stoneMat   = mat(P.stone, { map: stoneTex });
  const timberMat  = mat(P.timber, { map: timberTex });
  const windowMat  = mat(P.window, { emissive: P.window, emissiveIntensity: 0.6 });
  const grassMat   = mat(P.grass);
  const flagMat    = mat(P.flag);
  const darkMat    = mat(0x222222);
  const slitMat    = mat(P.window, { emissive: P.window, emissiveIntensity: 0.35 });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 1. FOUNDATION / PLATFORM (stone, wider than buildings) ─────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const foundation = new THREE.Mesh(new THREE.BoxGeometry(1.10, 0.10, 0.90), stoneMat);
  foundation.position.y = 0.05;
  foundation.castShadow = true;
  foundation.receiveShadow = true;

  // Stepped platform edges
  const stepGeo = new THREE.BoxGeometry(1.16, 0.04, 0.96);
  const foundStep = new THREE.Mesh(stepGeo, stoneMat);
  foundStep.position.y = 0.02;
  foundStep.castShadow = true;
  group.add(foundStep);

  // Decorative stones around base
  [[-0.52, 0.02, 0.48], [0.15, 0.02, 0.49], [0.50, 0.02, 0.44],
   [-0.55, 0.02, -0.20], [0.54, 0.02, 0.15], [-0.50, 0.02, 0.30],
   [0.45, 0.02, -0.44], [-0.18, 0.02, -0.48], [0.30, 0.02, 0.47],
   [-0.48, 0.02, -0.42]].forEach(([x, y, z]) => {
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
  // ── 2. FORTIFICATION WALLS (stone perimeter) ──────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const wallH = 0.28, wallT = 0.07;

  // Front wall (with gate opening)
  const fwLeft = new THREE.Mesh(new THREE.BoxGeometry(0.30, wallH, wallT), stoneMat);
  fwLeft.position.set(-0.37, 0.10 + wallH / 2, 0.40);
  fwLeft.castShadow = true;
  fwLeft.receiveShadow = true;
  group.add(fwLeft);

  const fwRight = new THREE.Mesh(new THREE.BoxGeometry(0.30, wallH, wallT), stoneMat);
  fwRight.position.set(0.37, 0.10 + wallH / 2, 0.40);
  fwRight.castShadow = true;
  fwRight.receiveShadow = true;
  group.add(fwRight);

  // Gate arch above opening
  const gateArchShape = new THREE.Shape();
  gateArchShape.moveTo(-0.11, 0);
  gateArchShape.lineTo(-0.11, 0.10);
  gateArchShape.quadraticCurveTo(-0.11, 0.18, 0, 0.18);
  gateArchShape.quadraticCurveTo(0.11, 0.18, 0.11, 0.10);
  gateArchShape.lineTo(0.11, 0);
  gateArchShape.lineTo(0.09, 0);
  gateArchShape.lineTo(0.09, 0.09);
  gateArchShape.quadraticCurveTo(0.09, 0.16, 0, 0.16);
  gateArchShape.quadraticCurveTo(-0.09, 0.16, -0.09, 0.09);
  gateArchShape.lineTo(-0.09, 0);
  gateArchShape.closePath();

  const gateArch = new THREE.Mesh(new THREE.ShapeGeometry(gateArchShape), stoneMat);
  gateArch.position.set(0, 0.10, 0.405);
  group.add(gateArch);

  // Gate dark opening
  const gateDoorShape = new THREE.Shape();
  gateDoorShape.moveTo(-0.08, 0);
  gateDoorShape.lineTo(-0.08, 0.08);
  gateDoorShape.quadraticCurveTo(-0.08, 0.15, 0, 0.15);
  gateDoorShape.quadraticCurveTo(0.08, 0.15, 0.08, 0.08);
  gateDoorShape.lineTo(0.08, 0);
  gateDoorShape.closePath();
  const gateDoor = new THREE.Mesh(new THREE.ShapeGeometry(gateDoorShape), darkMat);
  gateDoor.position.set(0, 0.10, 0.403);
  group.add(gateDoor);

  // Back wall
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(1.00, wallH, wallT), stoneMat);
  backWall.position.set(0, 0.10 + wallH / 2, -0.40);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  group.add(backWall);

  // Side walls
  const sideWallGeo = new THREE.BoxGeometry(wallT, wallH, 0.74);
  const leftWall = new THREE.Mesh(sideWallGeo, stoneMat);
  leftWall.position.set(-0.50, 0.10 + wallH / 2, 0);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;
  group.add(leftWall);

  const rightWall = new THREE.Mesh(sideWallGeo, stoneMat);
  rightWall.position.set(0.50, 0.10 + wallH / 2, 0);
  rightWall.castShadow = true;
  rightWall.receiveShadow = true;
  group.add(rightWall);

  // Wall crenellations (on top of walls)
  const crenGeo = new THREE.BoxGeometry(0.06, 0.06, wallT + 0.01);
  for (let i = 0; i < 7; i++) {
    // front left segment
    if (i < 2) {
      const c = new THREE.Mesh(crenGeo, stoneMat);
      c.position.set(-0.48 + i * 0.10, 0.10 + wallH + 0.03, 0.40);
      group.add(c);
    }
    // front right segment
    if (i >= 5) {
      const c = new THREE.Mesh(crenGeo, stoneMat);
      c.position.set(-0.48 + i * 0.10, 0.10 + wallH + 0.03, 0.40);
      group.add(c);
    }
  }
  // Back wall crenellations
  for (let i = 0; i < 8; i++) {
    if (i % 2 === 0) {
      const c = new THREE.Mesh(crenGeo, stoneMat);
      c.position.set(-0.42 + i * 0.12, 0.10 + wallH + 0.03, -0.40);
      group.add(c);
    }
  }

  // Side wall crenellations
  const crenSideGeo = new THREE.BoxGeometry(wallT + 0.01, 0.06, 0.06);
  for (let i = 0; i < 5; i++) {
    if (i % 2 === 0) {
      const cl = new THREE.Mesh(crenSideGeo, stoneMat);
      cl.position.set(-0.50, 0.10 + wallH + 0.03, -0.28 + i * 0.14);
      group.add(cl);
      const cr = new THREE.Mesh(crenSideGeo, stoneMat);
      cr.position.set(0.50, 0.10 + wallH + 0.03, -0.28 + i * 0.14);
      group.add(cr);
    }
  }

  // ── Corner turrets ────────────────────────────────────────────────────────
  const turretPositions = [
    [-0.50, 0.40], [0.50, 0.40], [-0.50, -0.40], [0.50, -0.40],
  ];
  turretPositions.forEach(([tx, tz]) => {
    const turret = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, wallH + 0.10, 6),
      stoneMat
    );
    turret.position.set(tx, 0.10 + (wallH + 0.10) / 2, tz);
    turret.castShadow = true;
    group.add(turret);

    // Turret cap
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.10, 6), roofMat);
    cap.position.set(tx, 0.10 + wallH + 0.10 + 0.05, tz);
    cap.castShadow = true;
    group.add(cap);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 3. MAIN HALL / KEEP (half-timbered building) ──────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const hallW = 0.52, hallH = 0.55, hallD = 0.48;
  const hallBody = new THREE.Mesh(new THREE.BoxGeometry(hallW, hallH, hallD), wallMat);
  hallBody.position.set(-0.12, 0.10 + hallH / 2, -0.05);
  hallBody.castShadow = true;
  hallBody.receiveShadow = true;

  // ── Timber framing on main hall ───────────────────────────────────────────
  const TB = 0.03;
  const hallLeft = -0.12 - hallW / 2;
  const hallRight = -0.12 + hallW / 2;
  const hallFront = -0.05 + hallD / 2;
  const hallBack = -0.05 - hallD / 2;
  const hallBottom = 0.10;
  const hallTop = 0.10 + hallH;

  // Corner vertical beams
  const vBeamGeo = new THREE.BoxGeometry(TB, hallH, TB);
  [[hallLeft, hallFront], [hallRight, hallFront],
   [hallLeft, hallBack], [hallRight, hallBack]].forEach(([x, z]) => {
    const b = new THREE.Mesh(vBeamGeo, timberMat);
    b.position.set(x, hallBottom + hallH / 2, z);
    b.castShadow = true;
    group.add(b);
  });

  // Center vertical beam (front face)
  const cvBeam = new THREE.Mesh(new THREE.BoxGeometry(TB, hallH * 0.4, TB), timberMat);
  cvBeam.position.set(-0.12, hallTop - hallH * 0.2, hallFront);
  group.add(cvBeam);

  // Horizontal beams (front & back)
  [hallTop, hallBottom + hallH * 0.45].forEach((yy) => {
    [hallFront, hallBack].forEach((zz) => {
      const h = new THREE.Mesh(new THREE.BoxGeometry(hallW + 0.04, TB, TB), timberMat);
      h.position.set(-0.12, yy, zz);
      h.castShadow = true;
      group.add(h);
    });
  });

  // Horizontal beams (sides)
  [hallTop, hallBottom + hallH * 0.45].forEach((yy) => {
    [hallLeft, hallRight].forEach((xx) => {
      const h = new THREE.Mesh(new THREE.BoxGeometry(TB, TB, hallD), timberMat);
      h.position.set(xx, yy, -0.05);
      h.castShadow = true;
      group.add(h);
    });
  });

  // Diagonal cross beams (side walls, X pattern)
  [hallLeft, hallRight].forEach((xx) => {
    const diag1 = new THREE.Mesh(new THREE.BoxGeometry(TB * 0.7, 0.36, TB * 0.7), timberMat);
    diag1.position.set(xx, hallBottom + hallH * 0.55, -0.05);
    diag1.rotation.z = 0.58;
    group.add(diag1);
    const diag2 = new THREE.Mesh(new THREE.BoxGeometry(TB * 0.7, 0.36, TB * 0.7), timberMat);
    diag2.position.set(xx, hallBottom + hallH * 0.55, -0.05);
    diag2.rotation.z = -0.58;
    group.add(diag2);
  });

  // ── Main hall roof (gabled with ExtrudeGeometry) ──────────────────────────
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-0.38, 0);
  roofShape.lineTo(0, 0.32);
  roofShape.lineTo(0.38, 0);
  roofShape.closePath();

  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: hallD + 0.12, bevelEnabled: false });
  roofGeo.translate(0, 0, -(hallD + 0.12) / 2);
  const hallRoof = new THREE.Mesh(roofGeo, roofMat);
  hallRoof.position.set(-0.12, hallTop, -0.05);
  hallRoof.castShadow = true;

  // Ridge cap
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.035, hallD + 0.16), timberMat);
  ridge.position.set(-0.12, hallTop + 0.32, -0.05);
  ridge.castShadow = true;

  // Rafter ends
  const rafterGeo = new THREE.BoxGeometry(0.76, 0.02, 0.025);
  [hallFront + 0.06, hallBack - 0.06].forEach((zz) => {
    const r = new THREE.Mesh(rafterGeo, timberMat);
    r.position.set(-0.12, hallTop + 0.01, zz);
    group.add(r);
  });

  // Gable fill (front & back)
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-hallW / 2, 0);
  gableShape.lineTo(0, 0.28);
  gableShape.lineTo(hallW / 2, 0);
  gableShape.closePath();
  const gableGeo = new THREE.ShapeGeometry(gableShape);

  const gableFront = new THREE.Mesh(gableGeo, wallMat);
  gableFront.position.set(-0.12, hallTop, hallFront + 0.001);
  group.add(gableFront);

  const gableBack = new THREE.Mesh(gableGeo, wallMat);
  gableBack.position.set(-0.12, hallTop, hallBack - 0.001);
  gableBack.rotation.y = Math.PI;
  group.add(gableBack);

  // ── Main hall windows (warm glow + cross frame) ───────────────────────────
  const winGeo = new THREE.PlaneGeometry(0.09, 0.09);

  // Front windows
  [[-0.30, hallBottom + hallH * 0.65, hallFront + 0.005],
   [0.06, hallBottom + hallH * 0.65, hallFront + 0.005]].forEach(([wx, wy, wz]) => {
    const win = new THREE.Mesh(winGeo, windowMat);
    win.position.set(wx, wy, wz);
    group.add(win);

    // Cross frame dividers
    const fH = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.012, 0.006), timberMat);
    fH.position.set(wx, wy, wz + 0.004);
    const fV = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.09, 0.006), timberMat);
    fV.position.set(wx, wy, wz + 0.004);
    group.add(fH, fV);

    // Window frame border
    const frmW = 0.010;
    [[wx, wy + 0.05, 0.10, frmW],
     [wx, wy - 0.05, 0.10, frmW]].forEach(([fx, fy, fw, fh]) => {
      const f = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.008), timberMat);
      f.position.set(fx, fy, wz + 0.004);
      group.add(f);
    });
    [[wx - 0.05, wy, frmW, 0.10 + frmW * 2],
     [wx + 0.05, wy, frmW, 0.10 + frmW * 2]].forEach(([fx, fy, fw, fh]) => {
      const f = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.008), timberMat);
      f.position.set(fx, fy, wz + 0.004);
      group.add(f);
    });

    // Window sill
    const sill = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.012, 0.025), timberMat);
    sill.position.set(wx, wy - 0.05 - 0.006, wz + 0.012);
    sill.castShadow = true;
    group.add(sill);
  });

  // Side window (left wall of hall)
  const sideWinPos = [hallLeft - 0.005, hallBottom + hallH * 0.65, -0.05];
  const sideWin = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.07), windowMat);
  sideWin.position.set(...sideWinPos as [number, number, number]);
  sideWin.rotation.y = -Math.PI / 2;
  group.add(sideWin);
  const swH = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.010, 0.07), timberMat);
  swH.position.set(sideWinPos[0] - 0.002, sideWinPos[1], sideWinPos[2]);
  const swV = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.07, 0.010), timberMat);
  swV.position.set(sideWinPos[0] - 0.002, sideWinPos[1], sideWinPos[2]);
  group.add(swH, swV);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 4. ROUND TOWER ────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const towerR = 0.16, towerH = 0.85;
  const towerX = 0.28, towerZ = 0.0;

  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(towerR - 0.01, towerR, towerH, 10),
    stoneMat
  );
  tower.position.set(towerX, 0.10 + towerH / 2, towerZ);
  tower.castShadow = true;
  tower.receiveShadow = true;

  // ── Tower battlements (crenellations ring) ────────────────────────────────
  const battleCount = 8;
  for (let i = 0; i < battleCount; i++) {
    const angle = (i / battleCount) * Math.PI * 2;
    if (i % 2 === 0) {
      const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.07, 0.04), stoneMat);
      merlon.position.set(
        towerX + Math.cos(angle) * (towerR - 0.01),
        0.10 + towerH + 0.035,
        towerZ + Math.sin(angle) * (towerR - 0.01)
      );
      merlon.rotation.y = -angle;
      merlon.castShadow = true;
      group.add(merlon);
    }
  }

  // ── Tower cone top ────────────────────────────────────────────────────────
  const towerCone = new THREE.Mesh(
    new THREE.ConeGeometry(towerR + 0.04, 0.28, 10),
    roofMat
  );
  towerCone.position.set(towerX, 0.10 + towerH + 0.07 + 0.14, towerZ);
  towerCone.castShadow = true;

  // ── Arrow slit windows on tower (narrow vertical with glow) ───────────────
  const slitGeo = new THREE.PlaneGeometry(0.018, 0.08);
  const slitAngles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
  slitAngles.forEach((angle) => {
    const slit = new THREE.Mesh(slitGeo, slitMat);
    const sr = towerR + 0.002;
    slit.position.set(
      towerX + Math.cos(angle) * sr,
      0.10 + towerH * 0.5,
      towerZ + Math.sin(angle) * sr
    );
    slit.rotation.y = -angle + Math.PI / 2;
    group.add(slit);

    // Upper slit
    const slit2 = new THREE.Mesh(slitGeo, slitMat);
    slit2.position.set(
      towerX + Math.cos(angle) * sr,
      0.10 + towerH * 0.75,
      towerZ + Math.sin(angle) * sr
    );
    slit2.rotation.y = -angle + Math.PI / 2;
    group.add(slit2);
  });

  // ── Tower banner / flag ───────────────────────────────────────────────────
  // Flagpole
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.22, 4),
    timberMat
  );
  pole.position.set(towerX, 0.10 + towerH + 0.07 + 0.28 + 0.11, towerZ);
  group.add(pole);

  // Flag (small triangular banner)
  const flagShape = new THREE.Shape();
  flagShape.moveTo(0, 0);
  flagShape.lineTo(0.12, 0.03);
  flagShape.lineTo(0, 0.08);
  flagShape.closePath();
  const flagGeo = new THREE.ShapeGeometry(flagShape);
  const flag = new THREE.Mesh(flagGeo, flagMat);
  flag.position.set(towerX + 0.008, 0.10 + towerH + 0.07 + 0.28 + 0.12, towerZ);
  flag.rotation.y = -Math.PI / 4;
  group.add(flag);

  // Second decorative pennant on opposite side
  const flag2 = new THREE.Mesh(flagGeo, flagMat);
  flag2.position.set(towerX + 0.008, 0.10 + towerH + 0.07 + 0.28 + 0.04, towerZ);
  flag2.rotation.y = Math.PI * 0.75;
  group.add(flag2);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 5. CONNECTING WALL / BRIDGE between hall and tower ────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const bridgeW = hallRight - (towerX - towerR) + 0.04;
  const bridge = new THREE.Mesh(
    new THREE.BoxGeometry(Math.abs(bridgeW) + 0.02, 0.32, 0.22),
    stoneMat
  );
  bridge.position.set(
    (hallRight + (towerX - towerR)) / 2,
    0.10 + 0.16,
    towerZ
  );
  bridge.castShadow = true;
  bridge.receiveShadow = true;

  // Bridge walkway top
  const walkway = new THREE.Mesh(
    new THREE.BoxGeometry(Math.abs(bridgeW) + 0.06, 0.03, 0.26),
    stoneMat
  );
  walkway.position.set(
    (hallRight + (towerX - towerR)) / 2,
    0.10 + 0.33,
    towerZ
  );
  group.add(walkway);

  // Small crenellations on the bridge
  for (let i = 0; i < 2; i++) {
    const bc = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.04), stoneMat);
    bc.position.set(
      (hallRight + (towerX - towerR)) / 2 - 0.06 + i * 0.12,
      0.10 + 0.33 + 0.04,
      towerZ + 0.11
    );
    group.add(bc);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 6. ARCHED GATE / ENTRANCE on front face of main hall ──────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const gw = 0.11, gh = 0.22;
  const doorShape = new THREE.Shape();
  doorShape.moveTo(-gw / 2, 0);
  doorShape.lineTo(-gw / 2, gh * 0.70);
  doorShape.quadraticCurveTo(-gw / 2, gh, 0, gh);
  doorShape.quadraticCurveTo(gw / 2, gh, gw / 2, gh * 0.70);
  doorShape.lineTo(gw / 2, 0);
  doorShape.closePath();

  const hallDoor = new THREE.Mesh(new THREE.ShapeGeometry(doorShape), darkMat);
  hallDoor.position.set(-0.12, hallBottom, hallFront + 0.005);
  group.add(hallDoor);

  // Door frame (timber surround)
  const dfSide = new THREE.BoxGeometry(0.022, gh + 0.02, 0.018);
  const dfLeft = new THREE.Mesh(dfSide, timberMat);
  dfLeft.position.set(-0.12 - gw / 2 - 0.008, hallBottom + gh / 2, hallFront + 0.008);
  const dfRight = new THREE.Mesh(dfSide, timberMat);
  dfRight.position.set(-0.12 + gw / 2 + 0.008, hallBottom + gh / 2, hallFront + 0.008);
  const dfTopBeam = new THREE.Mesh(new THREE.BoxGeometry(gw + 0.05, 0.022, 0.018), timberMat);
  dfTopBeam.position.set(-0.12, hallBottom + gh + 0.01, hallFront + 0.008);
  group.add(dfLeft, dfRight, dfTopBeam);

  // Stone step
  const doorStep = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.06), stoneMat);
  doorStep.position.set(-0.12, hallBottom, hallFront + 0.04);
  doorStep.castShadow = true;
  group.add(doorStep);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 7. CHIMNEY (on main hall roof) ────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.28, 0.09), stoneMat);
  chimney.position.set(-0.26, hallTop + 0.14, -0.15);
  chimney.castShadow = true;

  const chimneyTop = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.12), stoneMat);
  chimneyTop.position.set(-0.26, hallTop + 0.29, -0.15);

  const chimneyHole = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.015, 0.05), darkMat);
  chimneyHole.position.set(-0.26, hallTop + 0.305, -0.15);
  group.add(chimney, chimneyTop, chimneyHole);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 8. GRASS TUFTS ────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const bladeGeo = new THREE.ConeGeometry(0.012, 0.055, 3);
  const clusterPositions = [
    [-0.55, 0.46], [0.52, 0.44], [-0.50, -0.44],
    [0.50, -0.42], [-0.45, 0.48], [0.48, -0.46],
    [0.56, 0.10], [-0.56, -0.15], [0.00, 0.50],
    [-0.30, 0.50], [0.35, 0.50],
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

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 9. PEBBLES around foundation ──────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const pebbleMat = mat(0x9a9088);
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.3;
    const dist = 0.55 + Math.random() * 0.08;
    const pebble = new THREE.Mesh(
      new THREE.SphereGeometry(0.012 + Math.random() * 0.008, 5, 3),
      pebbleMat
    );
    pebble.position.set(Math.cos(angle) * dist, 0.01, Math.sin(angle) * dist);
    pebble.scale.y = 0.5;
    group.add(pebble);
  }

  // ── Assemble main pieces ──────────────────────────────────────────────────
  group.add(foundation, hallBody, hallRoof, ridge, tower, towerCone, bridge);

  addOutline(group);
  return group;
}

export const cityMeta = {
  id: 'city',
  name: 'City',
  category: 'Oyun Taşı',
  description: '2 zafer puanı. Her zarda 2 kaynak üretir. Surlu ortaçağ kasabası.',
  type: 'Bina',
  materials: 10,
  geo: 'Prosedürel',
};
