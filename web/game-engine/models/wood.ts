import * as THREE from 'three';
import { mat, palette, addOutline, canvasTex } from './materials';

export function createWood() {
  const group = new THREE.Group();

  // ── Palette ─────────────────────────────────────────────────────────────────
  const P = {
    bark:   palette('woodBark'),
    ring:   palette('woodRing'),
    leaf:   palette('woodLeaf'),
    dark:   palette('woodDark'),
    grass:  palette('grassGreen'),
    stone:  palette('settlementStone'),
  };

  // ── Procedural textures ─────────────────────────────────────────────────────

  // Bark texture — horizontal lines with slight irregularity
  const barkTex = canvasTex(128, (ctx, s) => {
    const r = (P.bark >> 16) & 0xff, g = (P.bark >> 8) & 0xff, b = P.bark & 0xff;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, s, s);
    // Bark ridges — dark & light horizontal lines
    for (let y = 0; y < s; y += 2) {
      const drift = Math.sin(y * 0.15) * 2;
      ctx.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.10})`;
      ctx.fillRect(drift, y, s, 1);
      if (Math.random() < 0.15) {
        ctx.fillStyle = `rgba(255,220,180,${0.04 + Math.random() * 0.04})`;
        ctx.fillRect(drift + Math.random() * s * 0.3, y, s * 0.4, 1);
      }
    }
    // Vertical cracks
    for (let i = 0; i < 6; i++) {
      const cx = Math.random() * s;
      ctx.strokeStyle = `rgba(0,0,0,${0.08 + Math.random() * 0.08})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      let cy = 0;
      ctx.moveTo(cx, cy);
      while (cy < s) {
        cy += 3 + Math.random() * 6;
        ctx.lineTo(cx + (Math.random() - 0.5) * 4, cy);
      }
      ctx.stroke();
    }
  });
  barkTex.wrapS = barkTex.wrapT = THREE.RepeatWrapping;

  // Cross-section with concentric tree rings
  const ringTex = canvasTex(128, (ctx, s) => {
    const r = (P.ring >> 16) & 0xff, g = (P.ring >> 8) & 0xff, b = P.ring & 0xff;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, s, s);
    const cx = s * 0.48, cy = s * 0.52;
    // Concentric rings
    for (let ri = 3; ri < s * 0.48; ri += 3) {
      ctx.beginPath();
      ctx.arc(cx, cy, ri, 0, Math.PI * 2);
      const lightness = (ri % 6 < 3) ? 0.06 : 0.12;
      ctx.strokeStyle = `rgba(60,30,10,${lightness + Math.random() * 0.04})`;
      ctx.lineWidth = 1 + Math.random() * 0.5;
      ctx.stroke();
    }
    // Pith (center dot)
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(40,20,5,0.4)';
    ctx.fill();
    // Radial cracks (2-3)
    for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
      const angle = Math.random() * Math.PI * 2;
      const len = 10 + Math.random() * 20;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
      ctx.strokeStyle = 'rgba(40,20,5,0.15)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
  });

  // Moss / leaf texture — green bumpy
  const mossTex = canvasTex(64, (ctx, s) => {
    const r = (P.grass >> 16) & 0xff, g = (P.grass >> 8) & 0xff, b = P.grass & 0xff;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, 1.5 + Math.random() * 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r - 20 + Math.floor(Math.random() * 40)},${g + Math.floor(Math.random() * 30)},${b - 10},0.5)`;
      ctx.fill();
    }
  });

  // ── Materials ───────────────────────────────────────────────────────────────
  const barkMat   = mat(P.bark, { map: barkTex });
  const ringMat   = mat(P.ring, { map: ringTex });
  const leafMat   = mat(P.leaf);
  const darkMat   = mat(P.dark);
  const grassMat  = mat(P.grass);
  const stoneMat  = mat(P.stone);
  const mossMat   = mat(P.grass, { map: mossTex });
  const sawdustMat = mat(0xc8a870);
  const metalMat  = mat(0x888890);
  const handleMat = mat(0x6b3a1a);
  const mushroomCapMat = mat(0xb03020);
  const mushroomStemMat = mat(0xe8ddd0);
  const birdBodyMat = mat(0x222222);
  const birdBellyMat = mat(0xeeeeee);
  const birdBeakMat = mat(0xe8a020);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 1. LOG PILE (5 logs in a stacked arrangement) ─────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  const makeLog = (x, y, z, rot, radius, length) => {
    const logGrp = new THREE.Group();
    logGrp.position.set(x, y, z);
    logGrp.rotation.y = rot;

    // Slight random scale variation along length for bark roughness
    const scaleVar = 0.97 + Math.random() * 0.06;

    // Main cylinder body
    const log = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * scaleVar, radius * (2 - scaleVar), length, 12),
      barkMat
    );
    log.rotation.z = Math.PI / 2;
    log.castShadow = true;
    log.receiveShadow = true;
    logGrp.add(log);

    // Cross-section ends with ring texture
    const endGeo = new THREE.CircleGeometry(radius, 16);
    const endL = new THREE.Mesh(endGeo, ringMat);
    endL.position.x = -length / 2;
    endL.rotation.y = -Math.PI / 2;
    logGrp.add(endL);

    const endR = new THREE.Mesh(endGeo, ringMat);
    endR.position.x = length / 2;
    endR.rotation.y = Math.PI / 2;
    logGrp.add(endR);

    // Bark rim ring on cross-section
    const rimGeo = new THREE.RingGeometry(radius * 0.85, radius, 16);
    const rimL = new THREE.Mesh(rimGeo, barkMat);
    rimL.position.x = -length / 2 - 0.001;
    rimL.rotation.y = -Math.PI / 2;
    logGrp.add(rimL);

    const rimR = new THREE.Mesh(rimGeo, barkMat);
    rimR.position.x = length / 2 + 0.001;
    rimR.rotation.y = Math.PI / 2;
    logGrp.add(rimR);

    // Bark bumps along the surface (subtle knots)
    for (let k = 0; k < 2; k++) {
      const knot = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 0.18, 5, 4),
        barkMat
      );
      const angle = Math.random() * Math.PI * 2;
      const along = (Math.random() - 0.5) * length * 0.6;
      knot.position.set(
        along,
        Math.sin(angle) * radius * 0.92,
        Math.cos(angle) * radius * 0.92
      );
      knot.scale.set(1.2, 0.6, 0.8);
      logGrp.add(knot);
    }

    return logGrp;
  };

  // Bottom layer — 3 logs side by side
  const bottomY = 0.10;
  group.add(makeLog(-0.18, bottomY, -0.04, 0.08,  0.09, 0.80));
  group.add(makeLog( 0.00, bottomY,  0.16, -0.05, 0.10, 0.85));
  group.add(makeLog( 0.18, bottomY, -0.10, 0.12,  0.085, 0.78));

  // Middle layer — 2 logs nestled in gaps
  const midY = 0.27;
  group.add(makeLog(-0.08, midY, 0.04, -0.06, 0.085, 0.82));
  group.add(makeLog( 0.12, midY, 0.02,  0.10, 0.08,  0.76));

  // Top log — slightly smaller, where the axe will go
  const topLog = makeLog(0.02, 0.40, 0.00, 0.04, 0.075, 0.74);
  group.add(topLog);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 2. LOG SUPPORT STAKES (prevent rolling) ───────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const stakeGeo = new THREE.CylinderGeometry(0.012, 0.018, 0.22, 5);
  const stakePositions = [
    [-0.34, 0.08, -0.14,  0.25],
    [-0.34, 0.08,  0.22, -0.20],
    [ 0.34, 0.08, -0.18,  0.22],
    [ 0.34, 0.08,  0.20, -0.18],
  ];
  stakePositions.forEach(([sx, sy, sz, tilt]) => {
    const stake = new THREE.Mesh(stakeGeo, darkMat);
    stake.position.set(sx, sy, sz);
    stake.rotation.z = tilt;
    stake.castShadow = true;
    group.add(stake);
  });

  // Cross braces between stakes (small horizontal rods)
  [[-0.34, 0.12, 0.04], [0.34, 0.12, 0.01]].forEach(([bx, by, bz]) => {
    const brace = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.30, 4),
      darkMat
    );
    brace.position.set(bx, by, bz);
    brace.rotation.x = Math.PI / 2;
    group.add(brace);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 3. AXE embedded in top log ────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const axeGroup = new THREE.Group();
  axeGroup.position.set(0.02, 0.48, 0.00);
  axeGroup.rotation.z = 0.15;
  axeGroup.rotation.x = -0.1;

  // Handle (cylinder)
  const axeHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.015, 0.30, 6),
    handleMat
  );
  axeHandle.position.y = 0.12;
  axeHandle.castShadow = true;
  axeGroup.add(axeHandle);

  // Blade (wedge shape via ExtrudeGeometry)
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, 0);
  bladeShape.lineTo(0.07, 0.04);
  bladeShape.lineTo(0.07, -0.04);
  bladeShape.closePath();
  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.015, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 1 });
  bladeGeo.translate(0, 0, -0.0075);
  const blade = new THREE.Mesh(bladeGeo, metalMat);
  blade.position.set(0, 0.26, 0);
  blade.rotation.z = -0.3;
  blade.castShadow = true;
  axeGroup.add(blade);

  // Blade edge highlight (thin bright line)
  const edgeGeo = new THREE.BoxGeometry(0.002, 0.085, 0.018);
  const edgeMat = mat(0xccccdd);
  const edge = new THREE.Mesh(edgeGeo, edgeMat);
  edge.position.set(0.068, 0.26, 0);
  edge.rotation.z = -0.3;
  axeGroup.add(edge);

  group.add(axeGroup);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 4. WOOD CHIPS & SHAVINGS scattered at base ────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const chipGeo = new THREE.BoxGeometry(0.03, 0.008, 0.015);
  const curlGeo = new THREE.TorusGeometry(0.015, 0.003, 4, 6, Math.PI * 1.2);
  for (let i = 0; i < 14; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist  = 0.12 + Math.random() * 0.28;
    const cx = Math.cos(angle) * dist;
    const cz = Math.sin(angle) * dist;

    if (Math.random() < 0.6) {
      // Flat chip
      const chip = new THREE.Mesh(chipGeo, mat(P.ring));
      chip.position.set(cx, 0.005, cz);
      chip.rotation.y = Math.random() * Math.PI;
      chip.rotation.x = (Math.random() - 0.5) * 0.3;
      chip.scale.set(0.5 + Math.random() * 1.0, 1, 0.6 + Math.random() * 0.8);
      group.add(chip);
    } else {
      // Curled shaving
      const curl = new THREE.Mesh(curlGeo, mat(P.ring));
      curl.position.set(cx, 0.01, cz);
      curl.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      curl.scale.setScalar(0.6 + Math.random() * 0.8);
      group.add(curl);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 5. PINE TREE (multi-tier foliage) ─────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const treeGroup = new THREE.Group();
  treeGroup.position.set(-0.22, 0, -0.22);

  // Tree trunk with bark
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.04, 0.45, 8),
    barkMat
  );
  trunk.position.y = 0.225;
  trunk.castShadow = true;
  treeGroup.add(trunk);

  // Visible root flares at base
  for (let i = 0; i < 4; i++) {
    const rAngle = (i / 4) * Math.PI * 2 + Math.random() * 0.3;
    const root = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.022, 0.08, 4),
      barkMat
    );
    root.position.set(
      Math.cos(rAngle) * 0.03,
      0.02,
      Math.sin(rAngle) * 0.03
    );
    root.rotation.z = Math.cos(rAngle) * 0.6;
    root.rotation.x = Math.sin(rAngle) * 0.6;
    treeGroup.add(root);
  }

  // 4 tiers of cone foliage, each slightly offset for natural look
  const tiers = [
    { y: 0.46, radius: 0.18, height: 0.22 },
    { y: 0.58, radius: 0.15, height: 0.20 },
    { y: 0.69, radius: 0.11, height: 0.18 },
    { y: 0.79, radius: 0.07, height: 0.14 },
  ];
  tiers.forEach((t, idx) => {
    const foliage = new THREE.Mesh(
      new THREE.ConeGeometry(t.radius, t.height, 8),
      leafMat
    );
    foliage.position.set(
      (Math.random() - 0.5) * 0.02,
      t.y,
      (Math.random() - 0.5) * 0.02
    );
    foliage.rotation.y = idx * 0.7;
    foliage.castShadow = true;
    treeGroup.add(foliage);
  });

  // Tree top spike
  const spike = new THREE.Mesh(
    new THREE.ConeGeometry(0.015, 0.06, 4),
    leafMat
  );
  spike.position.y = 0.90;
  treeGroup.add(spike);

  group.add(treeGroup);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 6. MUSHROOMS growing on a bottom log ──────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const makeMushroom = (mx, my, mz, scale) => {
    const mGroup = new THREE.Group();
    mGroup.position.set(mx, my, mz);
    mGroup.scale.setScalar(scale);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.010, 0.03, 5),
      mushroomStemMat
    );
    stem.position.y = 0.015;
    mGroup.add(stem);

    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.55),
      mushroomCapMat
    );
    cap.position.y = 0.03;
    mGroup.add(cap);

    // Tiny white dots on cap
    for (let d = 0; d < 3; d++) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.003, 4, 3),
        mushroomStemMat
      );
      const da = (d / 3) * Math.PI * 2;
      dot.position.set(Math.cos(da) * 0.012, 0.035, Math.sin(da) * 0.012);
      mGroup.add(dot);
    }

    return mGroup;
  };

  group.add(makeMushroom(-0.18, 0.18, -0.08, 1.0));
  group.add(makeMushroom(-0.14, 0.16,  0.06, 0.7));
  group.add(makeMushroom(-0.22, 0.17, -0.02, 0.5));

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 7. MOSS PATCHES on shaded side of logs ────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const mossPositions = [
    [-0.10, 0.16,  0.22],
    [ 0.05, 0.14, -0.18],
    [ 0.22, 0.12, -0.16],
    [-0.05, 0.28, -0.06],
  ];
  mossPositions.forEach(([mx, my, mz]) => {
    // Cluster of small green bumps
    for (let b = 0; b < 5; b++) {
      const bump = new THREE.Mesh(
        new THREE.SphereGeometry(0.012 + Math.random() * 0.012, 5, 4),
        mossMat
      );
      bump.position.set(
        mx + (Math.random() - 0.5) * 0.04,
        my + Math.random() * 0.01,
        mz + (Math.random() - 0.5) * 0.04
      );
      bump.scale.y = 0.4 + Math.random() * 0.3;
      group.add(bump);
    }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 8. GROUND DETAIL — sawdust, pine needles, stones ──────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  // Sawdust circle (flat disc under the pile)
  const sawdust = new THREE.Mesh(
    new THREE.CircleGeometry(0.38, 16),
    sawdustMat
  );
  sawdust.rotation.x = -Math.PI / 2;
  sawdust.position.y = 0.002;
  sawdust.receiveShadow = true;
  group.add(sawdust);

  // Scattered sawdust particles (tiny cubes)
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist  = Math.random() * 0.42;
    const particle = new THREE.Mesh(
      new THREE.BoxGeometry(0.008, 0.004, 0.008),
      sawdustMat
    );
    particle.position.set(
      Math.cos(angle) * dist,
      0.003,
      Math.sin(angle) * dist
    );
    particle.rotation.y = Math.random() * Math.PI;
    group.add(particle);
  }

  // Pine needles (tiny cylinders scattered around tree)
  const needleMat = mat(0x3a5a2a);
  for (let i = 0; i < 18; i++) {
    const nx = -0.22 + (Math.random() - 0.5) * 0.35;
    const nz = -0.22 + (Math.random() - 0.5) * 0.35;
    const needle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.002, 0.001, 0.035 + Math.random() * 0.02, 3),
      needleMat
    );
    needle.position.set(nx, 0.004, nz);
    needle.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
    needle.rotation.y = Math.random() * Math.PI;
    group.add(needle);
  }

  // Small stones
  for (let i = 0; i < 7; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist  = 0.30 + Math.random() * 0.14;
    const pebble = new THREE.Mesh(
      new THREE.SphereGeometry(0.010 + Math.random() * 0.010, 5, 3),
      stoneMat
    );
    pebble.position.set(Math.cos(angle) * dist, 0.008, Math.sin(angle) * dist);
    pebble.scale.y = 0.45;
    group.add(pebble);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 9. WOODPECKER on the pine tree (cute detail) ──────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const birdGroup = new THREE.Group();
  birdGroup.position.set(-0.22, 0.38, -0.19);
  birdGroup.rotation.y = 0.8;

  // Body (elongated sphere)
  const birdBody = new THREE.Mesh(
    new THREE.SphereGeometry(0.018, 6, 5),
    birdBodyMat
  );
  birdBody.scale.set(0.7, 1.0, 0.8);
  birdBody.position.y = 0.01;
  birdGroup.add(birdBody);

  // Belly (white patch)
  const belly = new THREE.Mesh(
    new THREE.SphereGeometry(0.014, 5, 4),
    birdBellyMat
  );
  belly.position.set(0.008, 0.008, 0);
  belly.scale.set(0.5, 0.9, 0.7);
  birdGroup.add(belly);

  // Head
  const birdHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.012, 5, 4),
    birdBodyMat
  );
  birdHead.position.set(0.005, 0.028, 0);
  birdGroup.add(birdHead);

  // Red crest
  const crest = new THREE.Mesh(
    new THREE.SphereGeometry(0.007, 4, 3),
    mat(0xcc2200)
  );
  crest.position.set(0.002, 0.038, 0);
  crest.scale.set(0.8, 0.6, 1.0);
  birdGroup.add(crest);

  // Beak
  const beak = new THREE.Mesh(
    new THREE.ConeGeometry(0.004, 0.016, 4),
    birdBeakMat
  );
  beak.position.set(0.022, 0.028, 0);
  beak.rotation.z = -Math.PI / 2;
  birdGroup.add(beak);

  // Eye (tiny black dot)
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.003, 4, 3),
    mat(0x111111)
  );
  eye.position.set(0.014, 0.031, 0.006);
  birdGroup.add(eye);

  // Tail feathers
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(0.006, 0.022, 0.014),
    birdBodyMat
  );
  tail.position.set(-0.012, -0.008, 0);
  tail.rotation.z = 0.3;
  birdGroup.add(tail);

  // Feet / claws gripping trunk
  [0.005, -0.005].forEach((fz) => {
    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(0.010, 0.003, 0.004),
      birdBeakMat
    );
    foot.position.set(0.014, -0.005, fz);
    birdGroup.add(foot);
  });

  group.add(birdGroup);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 10. GRASS TUFTS around the scene ──────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const grassBladeGeo = new THREE.ConeGeometry(0.010, 0.05, 3);
  const grassPositions = [
    [-0.38,  0.30], [ 0.36,  0.28], [-0.34, -0.30],
    [ 0.34, -0.28], [-0.28,  0.36], [ 0.30, -0.34],
    [ 0.40,  0.08], [-0.40, -0.12],
  ];
  grassPositions.forEach(([gx, gz]) => {
    for (let g = 0; g < 4; g++) {
      const grassBlade = new THREE.Mesh(grassBladeGeo, grassMat);
      grassBlade.position.set(
        gx + (Math.random() - 0.5) * 0.05,
        0.025,
        gz + (Math.random() - 0.5) * 0.05
      );
      grassBlade.rotation.z = (Math.random() - 0.5) * 0.35;
      grassBlade.rotation.x = (Math.random() - 0.5) * 0.2;
      group.add(grassBlade);
    }
  });

  // ── Assemble & outline ────────────────────────────────────────────────────
  addOutline(group);
  return group;
}

export const woodMeta = {
  id: 'wood',
  name: 'Wood',
  category: 'Kaynak',
  description: 'Orman kaynağını temsil eden detaylı odun yığını, balta, çam ağacı ve ağaçkakan.',
  type: 'Kaynak Token',
  materials: 14,
  geo: 'Prosedürel',
};
