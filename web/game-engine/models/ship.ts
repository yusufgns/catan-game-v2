import * as THREE from 'three';
import { mat, palette, addOutline, canvasTex } from './materials';

export function createShip() {
  const group = new THREE.Group();

  // ── Palette ─────────────────────────────────────────────────────────────────
  const P = {
    hull:  palette('shipHull'),
    sail:  palette('shipSail'),
    mast:  palette('shipMast'),
    flag:  palette('shipFlag'),
    rope:  palette('roadDark'),
    stone: palette('settlementStone'),
  };

  // ── Procedural textures ─────────────────────────────────────────────────────
  const woodGrainTex = canvasTex(128, (ctx, s) => {
    const r = (P.hull >> 16) & 0xff, g = (P.hull >> 8) & 0xff, b = P.hull & 0xff;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, s, s);
    // Horizontal grain lines
    for (let y = 0; y < s; y++) {
      const intensity = 0.02 + Math.random() * 0.05;
      ctx.fillStyle = `rgba(0,0,0,${intensity})`;
      ctx.fillRect(0, y, s, 1);
    }
    // Knots
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, 2 + Math.random() * 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fill();
    }
  });

  const plankTex = canvasTex(128, (ctx, s) => {
    const r = (P.hull >> 16) & 0xff, g = (P.hull >> 8) & 0xff, b = P.hull & 0xff;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, s, s);
    // Horizontal plank lines (clinker seams)
    const plankH = s / 10;
    for (let i = 0; i < 10; i++) {
      const y = i * plankH;
      // Each plank slightly different shade
      const shift = (Math.random() - 0.5) * 20;
      ctx.fillStyle = `rgb(${r + shift},${g + shift},${b + shift})`;
      ctx.fillRect(0, y + 2, s, plankH - 3);
      // Shadow line at overlap
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(0, y, s, 2);
      // Highlight at top of plank
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(0, y + 2, s, 1);
    }
    // Wood grain within planks
    for (let y = 0; y < s; y += 2) {
      ctx.fillStyle = `rgba(0,0,0,${0.01 + Math.random() * 0.03})`;
      ctx.fillRect(0, y, s, 1);
    }
  });
  plankTex.wrapS = plankTex.wrapT = THREE.RepeatWrapping;

  const sailClothTex = canvasTex(128, (ctx, s) => {
    const r = (P.sail >> 16) & 0xff, g = (P.sail >> 8) & 0xff, b = P.sail & 0xff;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, s, s);
    // Woven fabric pattern
    for (let y = 0; y < s; y += 3) {
      ctx.fillStyle = `rgba(0,0,0,${0.02 + Math.random() * 0.02})`;
      ctx.fillRect(0, y, s, 1);
    }
    for (let x = 0; x < s; x += 4) {
      ctx.fillStyle = `rgba(0,0,0,${0.01 + Math.random() * 0.015})`;
      ctx.fillRect(x, 0, 1, s);
    }
    // Subtle patch / stitch marks
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s * 0.3, s * 0.5);
    ctx.lineTo(s * 0.7, s * 0.5);
    ctx.stroke();
  });

  const deckTex = canvasTex(128, (ctx, s) => {
    const r = (P.mast >> 16) & 0xff, g = (P.mast >> 8) & 0xff, b = P.mast & 0xff;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, s, s);
    // Individual deck boards
    const boardW = s / 8;
    for (let i = 0; i < 8; i++) {
      const x = i * boardW;
      const shift = (Math.random() - 0.5) * 12;
      ctx.fillStyle = `rgb(${r + shift},${g + shift},${b + shift})`;
      ctx.fillRect(x + 1, 0, boardW - 2, s);
      // Board edge shadow
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(x, 0, 1, s);
      // Grain lines
      for (let y = 0; y < s; y += 2) {
        ctx.fillStyle = `rgba(0,0,0,${0.01 + Math.random() * 0.03})`;
        ctx.fillRect(x + 1, y, boardW - 2, 1);
      }
    }
  });
  deckTex.wrapS = deckTex.wrapT = THREE.RepeatWrapping;

  // ── Materials ───────────────────────────────────────────────────────────────
  const hullMat   = mat(P.hull, { map: plankTex });
  const hullPlain = mat(P.hull, { map: woodGrainTex });
  const deckMat   = mat(P.mast, { map: deckTex });
  const sailMat   = mat(P.sail, { side: THREE.DoubleSide, map: sailClothTex });
  const mastMat   = mat(P.mast, { map: woodGrainTex });
  const flagMat   = mat(P.flag, { side: THREE.DoubleSide });
  const ropeMat   = new THREE.LineBasicMaterial({ color: P.rope });
  const stoneMat  = mat(P.stone);
  const ironMat   = mat(0x555555);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 1. HULL (clinker-built with overlapping planks) ───────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  // Main hull body — tapered box
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-0.50, -0.12);
  hullShape.lineTo(-0.50, 0.12);
  hullShape.lineTo(0.50, 0.08);
  hullShape.lineTo(0.60, 0.00);
  hullShape.lineTo(0.50, -0.08);
  hullShape.closePath();

  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 0.30,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  hullGeo.translate(0, 0, -0.15);
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.position.y = 0.08;
  hull.castShadow = true;
  hull.receiveShadow = true;

  // Individual hull planks (clinker overlap strips on sides)
  const plankCount = 6;
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < plankCount; i++) {
      const yOff = -0.10 + (i / plankCount) * 0.24;
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(0.96 - i * 0.02, 0.012, 0.018),
        hullMat
      );
      plank.position.set(0.02, 0.08 + yOff, side * (0.145 + 0.016));
      plank.castShadow = true;
      group.add(plank);
    }
  }

  // ── Hull ribs (structural frames visible inside) ──────────────────────────
  const ribCount = 7;
  for (let i = 0; i < ribCount; i++) {
    const xPos = -0.38 + i * 0.11;
    const ribWidth = 0.26 - Math.abs(xPos) * 0.12;
    const rib = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.20, ribWidth),
      mastMat
    );
    rib.position.set(xPos, 0.10, 0);
    group.add(rib);
  }

  // ── Keel (bottom spine) ───────────────────────────────────────────────────
  const keel = new THREE.Mesh(
    new THREE.BoxGeometry(1.14, 0.03, 0.04),
    hullPlain
  );
  keel.position.set(0.02, -0.02, 0);
  keel.castShadow = true;
  group.add(keel);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 2. BOW (carved pointed front with figurehead) ─────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  // Bowsprit (forward-pointing spar)
  const bowsprit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.02, 0.30, 6),
    mastMat
  );
  bowsprit.position.set(0.72, 0.18, 0);
  bowsprit.rotation.z = -Math.PI / 4;
  bowsprit.castShadow = true;
  group.add(bowsprit);

  // Bow stem piece (vertical front timber)
  const bowStem = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.28, 0.06),
    hullPlain
  );
  bowStem.position.set(0.57, 0.14, 0);
  bowStem.rotation.z = -0.25;
  bowStem.castShadow = true;
  group.add(bowStem);

  // Figurehead (dragon/serpent head shape)
  const figureGroup = new THREE.Group();

  // Neck curve
  const figNeck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.03, 0.14, 6),
    hullPlain
  );
  figNeck.rotation.z = -0.6;
  figNeck.position.set(0.04, 0.06, 0);
  figureGroup.add(figNeck);

  // Head
  const figHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 6, 5),
    hullPlain
  );
  figHead.scale.set(1.4, 1.0, 0.8);
  figHead.position.set(0.08, 0.12, 0);
  figureGroup.add(figHead);

  // Snout
  const figSnout = new THREE.Mesh(
    new THREE.ConeGeometry(0.02, 0.06, 5),
    hullPlain
  );
  figSnout.position.set(0.12, 0.13, 0);
  figSnout.rotation.z = -Math.PI / 2;
  figureGroup.add(figSnout);

  // Eyes (small dark spheres)
  [-1, 1].forEach(side => {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.008, 4, 4),
      ironMat
    );
    eye.position.set(0.09, 0.14, side * 0.025);
    figureGroup.add(eye);
  });

  figureGroup.position.set(0.64, 0.22, 0);
  group.add(figureGroup);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 3. STERN CASTLE (raised rear section with railing) ────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  // Raised stern platform
  const sternPlatform = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.06, 0.30),
    deckMat
  );
  sternPlatform.position.set(-0.42, 0.28, 0);
  sternPlatform.castShadow = true;
  sternPlatform.receiveShadow = true;
  group.add(sternPlatform);

  // Stern wall (back face)
  const sternWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.22, 0.32),
    hullMat
  );
  sternWall.position.set(-0.56, 0.24, 0);
  sternWall.castShadow = true;
  group.add(sternWall);

  // Stern side walls
  [-1, 1].forEach(side => {
    const sideW = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.16, 0.03),
      hullMat
    );
    sideW.position.set(-0.42, 0.28, side * 0.155);
    sideW.castShadow = true;
    group.add(sideW);
  });

  // Stern railing posts
  for (let i = 0; i < 4; i++) {
    const x = -0.54 + i * 0.08;
    [-1, 1].forEach(side => {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.010, 0.14, 5),
        mastMat
      );
      post.position.set(x, 0.38, side * 0.155);
      post.castShadow = true;
      group.add(post);
    });
  }

  // Stern railing rails (horizontal)
  [-1, 1].forEach(side => {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.012, 0.012),
      mastMat
    );
    rail.position.set(-0.42, 0.44, side * 0.155);
    group.add(rail);

    const railLow = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.012, 0.012),
      mastMat
    );
    railLow.position.set(-0.42, 0.38, side * 0.155);
    group.add(railLow);
  });

  // Back railing
  const backRail = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.012, 0.30),
    mastMat
  );
  backRail.position.set(-0.55, 0.44, 0);
  group.add(backRail);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 4. DECK PLANKING ──────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  // Main deck surface
  const mainDeck = new THREE.Mesh(
    new THREE.BoxGeometry(0.74, 0.04, 0.26),
    deckMat
  );
  mainDeck.position.set(-0.02, 0.22, 0);
  mainDeck.castShadow = true;
  mainDeck.receiveShadow = true;
  group.add(mainDeck);

  // Individual plank lines scored into deck (thin dark strips)
  for (let i = 0; i < 6; i++) {
    const z = -0.10 + i * 0.04;
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.005, 0.004),
      ironMat
    );
    strip.position.set(-0.02, 0.245, z);
    group.add(strip);
  }

  // Gunwale (top edge of hull sides)
  [-1, 1].forEach(side => {
    const gunwale = new THREE.Mesh(
      new THREE.BoxGeometry(0.90, 0.025, 0.03),
      hullPlain
    );
    gunwale.position.set(0.0, 0.22, side * 0.15);
    gunwale.castShadow = true;
    group.add(gunwale);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 5. MAST (tall central pole with cross-beam / yard) ────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  // Main mast
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.032, 1.20, 8),
    mastMat
  );
  mast.position.set(0.05, 0.82, 0);
  mast.castShadow = true;

  // Mast step (base reinforcement on deck)
  const mastStep = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.04, 0.08),
    mastMat
  );
  mastStep.position.set(0.05, 0.24, 0);
  group.add(mastStep);

  // Yard (cross-beam)
  const yard = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.018, 0.70, 6),
    mastMat
  );
  yard.position.set(0.05, 1.18, 0);
  yard.rotation.z = Math.PI / 2;
  yard.castShadow = true;

  // Lower yard
  const yardLow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.014, 0.50, 6),
    mastMat
  );
  yardLow.position.set(0.05, 0.72, 0);
  yardLow.rotation.z = Math.PI / 2;
  group.add(yardLow);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 6. CROW'S NEST (lookout platform near mast top) ───────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  // Platform ring
  const crowsNest = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.055, 0.015, 10),
    mastMat
  );
  crowsNest.position.set(0.05, 1.30, 0);
  group.add(crowsNest);

  // Railing (small torus)
  const crowsRail = new THREE.Mesh(
    new THREE.TorusGeometry(0.058, 0.006, 5, 12),
    mastMat
  );
  crowsRail.position.set(0.05, 1.33, 0);
  crowsRail.rotation.x = Math.PI / 2;
  group.add(crowsRail);

  // Vertical rail posts
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const rPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.005, 0.05, 4),
      mastMat
    );
    rPost.position.set(
      0.05 + Math.cos(angle) * 0.055,
      1.32,
      Math.sin(angle) * 0.055
    );
    group.add(rPost);
  }

  // Mast top above crow's nest
  const mastTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.018, 0.16, 6),
    mastMat
  );
  mastTop.position.set(0.05, 1.42, 0);
  group.add(mastTop);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 7. SAIL (curved cloth with vertex displacement) ───────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  const sailGeo = new THREE.PlaneGeometry(0.58, 0.60, 10, 10);
  const sPos = sailGeo.attributes.position;
  for (let i = 0; i < sPos.count; i++) {
    const x = sPos.getX(i);
    const y = sPos.getY(i);
    // Belly curve — stronger in middle, less at edges
    const bellyX = Math.sin((x / 0.29 + 1) * Math.PI * 0.5);
    const bellyY = 1 - Math.abs(y / 0.30) * 0.3;
    sPos.setZ(i, bellyX * bellyY * 0.10);
  }
  sailGeo.computeVertexNormals();

  const sail = new THREE.Mesh(sailGeo, sailMat);
  sail.position.set(0.05, 0.95, 0.06);
  sail.castShadow = true;
  sail.receiveShadow = true;

  // Sail reinforcement strips (horizontal battens)
  for (let i = 0; i < 3; i++) {
    const stripY = 0.78 + i * 0.18;
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.008, 0.008),
      mat(P.rope)
    );
    strip.position.set(0.05, stripY, 0.10);
    group.add(strip);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 8. RIGGING ROPES ──────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  const makeLine = (pts) => {
    const geo = new THREE.BufferGeometry().setFromPoints(
      pts.map(p => new THREE.Vector3(p[0], p[1], p[2]))
    );
    return new THREE.Line(geo, ropeMat);
  };

  // Forestay (mast top to bow)
  group.add(makeLine([[0.05, 1.42, 0], [0.72, 0.28, 0]]));

  // Backstays (mast top to stern, port/starboard)
  group.add(makeLine([[0.05, 1.42, 0], [-0.52, 0.38, 0.14]]));
  group.add(makeLine([[0.05, 1.42, 0], [-0.52, 0.38, -0.14]]));

  // Shrouds (mast mid to hull sides — 3 per side)
  [-1, 1].forEach(side => {
    for (let i = 0; i < 3; i++) {
      const topY = 1.10 + i * 0.10;
      const baseX = -0.10 + i * 0.06;
      group.add(makeLine([
        [0.05, topY, 0],
        [baseX, 0.22, side * 0.16]
      ]));
    }
  });

  // Yard lifts (yard ends to mast top)
  group.add(makeLine([[0.05, 1.42, 0], [0.38, 1.18, 0]]));
  group.add(makeLine([[0.05, 1.42, 0], [-0.28, 1.18, 0]]));

  // Sheets (sail bottom corners to deck)
  group.add(makeLine([[0.33, 0.66, 0.06], [0.30, 0.24, 0.14]]));
  group.add(makeLine([[-0.23, 0.66, 0.06], [-0.25, 0.24, 0.14]]));

  // Bowsprit stays
  group.add(makeLine([[0.82, 0.30, 0], [0.60, 0.22, 0.12]]));
  group.add(makeLine([[0.82, 0.30, 0], [0.60, 0.22, -0.12]]));

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 9. BANNER / PENNANT at mast top ───────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  const pennantShape = new THREE.Shape();
  pennantShape.moveTo(0, 0);
  pennantShape.lineTo(0.18, 0.03);
  pennantShape.lineTo(0.14, 0.00);
  pennantShape.lineTo(0.18, -0.03);
  pennantShape.lineTo(0, 0);

  const pennant = new THREE.Mesh(
    new THREE.ShapeGeometry(pennantShape),
    flagMat
  );
  pennant.position.set(0.05, 1.48, 0.005);
  pennant.castShadow = true;
  group.add(pennant);

  // Pennant pole cap (mast finial)
  const finial = new THREE.Mesh(
    new THREE.SphereGeometry(0.015, 5, 4),
    ironMat
  );
  finial.position.set(0.05, 1.50, 0);
  group.add(finial);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 10. RUDDER (at stern) ─────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  // Rudder blade
  const rudderBlade = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.22, 0.08),
    hullPlain
  );
  rudderBlade.position.set(-0.59, 0.08, 0);
  rudderBlade.castShadow = true;
  group.add(rudderBlade);

  // Rudder post (vertical pivot)
  const rudderPost = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.30, 5),
    mastMat
  );
  rudderPost.position.set(-0.58, 0.22, 0);
  group.add(rudderPost);

  // Tiller (steering arm)
  const tiller = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.010, 0.16, 5),
    mastMat
  );
  tiller.position.set(-0.50, 0.34, 0);
  tiller.rotation.z = Math.PI / 2;
  group.add(tiller);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 11. DECK DETAILS — rope coils ─────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  // Rope coils (flat torus shapes on deck)
  [[-0.18, 0.255, 0.06], [0.22, 0.255, -0.06]].forEach(([rx, ry, rz]) => {
    const coil = new THREE.Mesh(
      new THREE.TorusGeometry(0.025, 0.008, 6, 12),
      mat(P.rope)
    );
    coil.position.set(rx, ry, rz);
    coil.rotation.x = Math.PI / 2;
    coil.castShadow = true;
    group.add(coil);

    // Inner coil layer
    const coilInner = new THREE.Mesh(
      new THREE.TorusGeometry(0.014, 0.006, 5, 10),
      mat(P.rope)
    );
    coilInner.position.set(rx, ry + 0.006, rz);
    coilInner.rotation.x = Math.PI / 2;
    group.add(coilInner);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 12. BARREL on deck ────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  const barrelBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.028, 0.07, 8),
    hullPlain
  );
  barrelBody.position.set(-0.20, 0.28, -0.06);
  barrelBody.castShadow = true;
  group.add(barrelBody);

  // Barrel bands (iron hoops)
  [0.26, 0.28, 0.315].forEach(by => {
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.032, 0.003, 4, 10),
      ironMat
    );
    band.position.set(-0.20, by, -0.06);
    band.rotation.x = Math.PI / 2;
    group.add(band);
  });

  // Second barrel (lying on side)
  const barrel2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.025, 0.06, 8),
    hullPlain
  );
  barrel2.position.set(0.24, 0.265, 0.05);
  barrel2.rotation.z = Math.PI / 2;
  barrel2.castShadow = true;
  group.add(barrel2);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 13. SHIELD on hull side (decorative) ──────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  // Round shields hung on the outside of hull
  [[-0.15, 0.16, 0.165], [0.10, 0.16, 0.165], [-0.15, 0.16, -0.165], [0.10, 0.16, -0.165]].forEach(([sx, sy, sz], idx) => {
    const shieldBack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.01, 10),
      mat(idx % 2 === 0 ? P.flag : P.hull)
    );
    shieldBack.position.set(sx, sy, sz);
    shieldBack.rotation.x = Math.PI / 2;
    shieldBack.castShadow = true;
    group.add(shieldBack);

    // Shield boss (center bump)
    const boss = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 5, 4),
      ironMat
    );
    boss.position.set(sx, sy, sz + Math.sign(sz) * 0.008);
    boss.scale.z = 0.5;
    group.add(boss);

    // Shield rim
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.04, 0.004, 4, 12),
      ironMat
    );
    rim.position.set(sx, sy, sz + Math.sign(sz) * 0.005);
    rim.rotation.x = Math.PI / 2;
    group.add(rim);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 14. OAR PORTS & OARS (decorative, stowed) ─────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  [-1, 1].forEach(side => {
    for (let i = 0; i < 4; i++) {
      const x = -0.28 + i * 0.16;
      // Oar port (small hole)
      const port = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.02, 5),
        ironMat
      );
      port.position.set(x, 0.12, side * 0.16);
      port.rotation.x = Math.PI / 2;
      group.add(port);
    }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 15. ANCHOR (small, stowed on bow) ─────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  // Anchor shank
  const anchorShank = new THREE.Mesh(
    new THREE.BoxGeometry(0.008, 0.08, 0.008),
    ironMat
  );
  anchorShank.position.set(0.48, 0.12, 0.14);
  group.add(anchorShank);

  // Anchor arms
  const anchorArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.008, 0.008),
    ironMat
  );
  anchorArm.position.set(0.48, 0.085, 0.14);
  group.add(anchorArm);

  // Anchor ring
  const anchorRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.012, 0.003, 4, 8),
    ironMat
  );
  anchorRing.position.set(0.48, 0.165, 0.14);
  group.add(anchorRing);

  // Anchor rope to hull
  group.add(makeLine([[0.48, 0.165, 0.14], [0.42, 0.22, 0.10]]));

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 16. WATER LINE DETAILS ────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  // Rubbing strake (protective strip along hull waterline)
  [-1, 1].forEach(side => {
    const strake = new THREE.Mesh(
      new THREE.BoxGeometry(1.00, 0.015, 0.015),
      hullPlain
    );
    strake.position.set(0.02, 0.04, side * 0.145);
    group.add(strake);
  });

  // ── Assemble main pieces ──────────────────────────────────────────────────
  group.add(hull, mast, yard, sail, mainDeck);

  addOutline(group);
  return group;
}

export const shipMeta = {
  id: 'ship',
  name: 'Ship',
  category: 'Oyun Taşı',
  description: 'Viking/tüccar tarzı detaylı gemi. Klinker gövde, yelken, arma, karga yuvası, dümen ve dekoratif kalkanlar.',
  type: 'Taşıt',
  materials: 12,
  geo: 'Prosedürel',
};
