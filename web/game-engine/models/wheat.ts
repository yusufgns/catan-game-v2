import * as THREE from 'three';
import { mat, palette, addOutline, canvasTex } from './materials';

export function createWheat() {
  const group = new THREE.Group();

  // ── Palette ─────────────────────────────────────────────────────────────────
  const P = {
    stalk:   palette('wheatStalk'),
    grain:   palette('wheatGrain'),
    leaf:    palette('wheatLeaf'),
    tie:     palette('wheatTie'),
    grass:   palette('grassGreen'),
    flowerP: palette('flowerPink'),
    flowerY: palette('flowerYellow'),
  };

  // ── Procedural stalk texture (vertical grain lines) ────────────────────────
  const stalkTex = canvasTex(64, (ctx, s) => {
    const r = (P.stalk >> 16) & 0xff, g = (P.stalk >> 8) & 0xff, b = P.stalk & 0xff;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, s, s);
    // Vertical fibrous lines
    for (let x = 0; x < s; x += 2) {
      ctx.fillStyle = `rgba(0,0,0,${0.02 + Math.random() * 0.05})`;
      ctx.fillRect(x, 0, 1, s);
    }
    // Horizontal nodes/joints every ~16px
    for (let y = 12; y < s; y += 16) {
      ctx.fillStyle = `rgba(80,60,20,${0.15 + Math.random() * 0.1})`;
      ctx.fillRect(0, y, s, 2);
    }
  });
  stalkTex.wrapS = stalkTex.wrapT = THREE.RepeatWrapping;

  // ── Materials ──────────────────────────────────────────────────────────────
  const stalkMat  = mat(P.stalk, { map: stalkTex });
  const grainMat  = mat(P.grain);
  const leafMat   = mat(P.leaf, { side: THREE.DoubleSide });
  const tieMat    = mat(P.tie);
  const grassMat  = mat(P.grass);
  const soilMat   = mat(0x5a3e28);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 1. GROUND PATCH (dark earth disc) ─────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const ground = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.02, 16), soilMat);
  ground.position.y = 0.01;
  ground.receiveShadow = true;
  group.add(ground);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 2. STUBBLE / CUT STALK BASES ──────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const stubbleGeo = new THREE.CylinderGeometry(0.012, 0.018, 0.04, 5);
  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2 + Math.random() * 0.3;
    const dist  = 0.22 + Math.random() * 0.16;
    const stub  = new THREE.Mesh(stubbleGeo, stalkMat);
    stub.position.set(Math.cos(angle) * dist, 0.02, Math.sin(angle) * dist);
    stub.rotation.z = (Math.random() - 0.5) * 0.2;
    group.add(stub);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 3. WHEAT STALKS (12 stalks with detail) ──────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  const makeStalk = (x, z, height, leanX, leanZ, curveAmt) => {
    const stalkGrp = new THREE.Group();
    stalkGrp.position.set(x, 0, z);
    stalkGrp.rotation.z = leanX;
    stalkGrp.rotation.x = leanZ;

    // ── Stalk segments with node joints ──
    const segments = 4;
    const segH = height / segments;
    for (let s = 0; s < segments; s++) {
      const topR    = 0.014 - s * 0.002;
      const bottomR = 0.018 - s * 0.001;
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(topR, bottomR, segH, 6),
        stalkMat
      );
      const yBase = s * segH + segH / 2;
      // Apply slight curve offset per segment
      const curveOffset = curveAmt * (s / segments) * (s / segments);
      seg.position.set(curveOffset, yBase, curveOffset * 0.3);
      seg.castShadow = true;
      stalkGrp.add(seg);

      // Node/joint bulge between segments (except at base)
      if (s > 0) {
        const node = new THREE.Mesh(
          new THREE.SphereGeometry(bottomR + 0.006, 6, 4),
          stalkMat
        );
        node.position.set(curveOffset * ((s - 0.5) / segments), s * segH, curveOffset * 0.3 * ((s - 0.5) / segments));
        node.scale.set(1, 0.5, 1);
        stalkGrp.add(node);
      }
    }

    // ── Grain head (elongated spike with kernel bumps) ──
    const headH = 0.20;
    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.05, headH, 6),
      grainMat
    );
    head.position.y = height + headH / 2;
    head.castShadow = true;
    stalkGrp.add(head);

    // Individual kernel bumps along the head
    const kernelRows = 5;
    const kernelsPerRow = 4;
    for (let row = 0; row < kernelRows; row++) {
      const ky = height + 0.03 + (row / kernelRows) * (headH - 0.04);
      const rowRadius = 0.05 - (row / kernelRows) * 0.025;
      for (let k = 0; k < kernelsPerRow; k++) {
        const ka = (k / kernelsPerRow) * Math.PI * 2 + (row * 0.4);
        const kernel = new THREE.Mesh(
          new THREE.SphereGeometry(0.012, 5, 4),
          grainMat
        );
        kernel.position.set(
          Math.cos(ka) * rowRadius,
          ky,
          Math.sin(ka) * rowRadius
        );
        kernel.scale.set(0.8, 1.3, 0.8);
        stalkGrp.add(kernel);
      }
    }

    // ── Barbs/awns radiating from grain head ──
    const barbCount = 8;
    for (let i = 0; i < barbCount; i++) {
      const angle = (i / barbCount) * Math.PI * 2;
      const bY = height + 0.04 + (i / barbCount) * (headH - 0.06);
      const barbLen = 0.10 + Math.random() * 0.04;
      const barb = new THREE.Mesh(
        new THREE.CylinderGeometry(0.003, 0.001, barbLen, 3),
        grainMat
      );
      const bRadius = 0.04 - (i / barbCount) * 0.015;
      barb.position.set(
        Math.cos(angle) * bRadius,
        bY,
        Math.sin(angle) * bRadius
      );
      // Point outward and upward
      barb.rotation.z = Math.PI / 3.5 * Math.cos(angle);
      barb.rotation.x = Math.PI / 3.5 * Math.sin(angle);
      stalkGrp.add(barb);
    }

    // ── Leaves along the stalk (2 per stalk, curved organic shapes) ──
    for (let li = 0; li < 2; li++) {
      const leafY = height * (0.25 + li * 0.3);
      const leafAngle = li * Math.PI * 0.7 + Math.random() * 0.5;
      const leafW = 0.06 + Math.random() * 0.02;
      const leafH = 0.22 + Math.random() * 0.06;

      // Create a curved leaf shape
      const leafShape = new THREE.Shape();
      leafShape.moveTo(0, 0);
      leafShape.quadraticCurveTo(leafW * 0.7, leafH * 0.3, leafW * 0.3, leafH * 0.6);
      leafShape.quadraticCurveTo(leafW * 0.1, leafH * 0.85, 0, leafH);
      leafShape.quadraticCurveTo(-leafW * 0.15, leafH * 0.5, 0, 0);

      const leafGeo = new THREE.ShapeGeometry(leafShape);
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set(
        Math.cos(leafAngle) * 0.02,
        leafY,
        Math.sin(leafAngle) * 0.02
      );
      leaf.rotation.y = leafAngle;
      leaf.rotation.z = 0.3 + li * 0.15;
      leaf.castShadow = true;
      stalkGrp.add(leaf);
    }

    return stalkGrp;
  };

  // 12 stalks with varying heights, lean angles, and curve amounts
  const stalks = [
    //  x,      z,     height, leanX,  leanZ,  curve
    [  0.00,   0.00,  0.72,  -0.04,   0.00,   0.02 ],
    [  0.06,   0.08,  0.68,   0.06,   0.03,   0.03 ],
    [ -0.07,   0.06,  0.74,  -0.08,  -0.02,  -0.02 ],
    [  0.10,  -0.04,  0.66,   0.10,  -0.04,   0.01 ],
    [ -0.04,  -0.09,  0.70,  -0.06,  -0.07,  -0.03 ],
    [  0.13,   0.03,  0.64,   0.12,   0.02,   0.02 ],
    [ -0.11,  -0.03,  0.71,  -0.10,  -0.01,  -0.01 ],
    [  0.03,   0.12,  0.67,   0.04,   0.09,   0.03 ],
    [ -0.13,   0.09,  0.69,  -0.11,   0.05,  -0.02 ],
    [  0.08,  -0.10,  0.63,   0.09,  -0.08,   0.01 ],
    [ -0.02,   0.04,  0.73,  -0.03,   0.03,   0.00 ],
    [  0.15,  -0.06,  0.61,   0.14,  -0.05,   0.02 ],
  ];
  stalks.forEach(([x, z, h, lx, lz, c]) => group.add(makeStalk(x, z, h, lx, lz, c)));

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 4. TIE / RIBBON WITH BOW ──────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  // Main binding ring
  const tie = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.018, 8, 20),
    tieMat
  );
  tie.position.y = 0.20;
  tie.rotation.x = Math.PI / 2;
  tie.castShadow = true;
  group.add(tie);

  // Second wrap (slightly higher, thinner)
  const tie2 = new THREE.Mesh(
    new THREE.TorusGeometry(0.155, 0.012, 6, 18),
    tieMat
  );
  tie2.position.y = 0.23;
  tie2.rotation.x = Math.PI / 2;
  group.add(tie2);

  // Bow knot center (small sphere where the bow meets)
  const knotCenter = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 6, 5),
    tieMat
  );
  knotCenter.position.set(0.16, 0.215, 0);
  knotCenter.scale.set(1.2, 0.8, 1);
  group.add(knotCenter);

  // Bow loops (two torus halves)
  const bowLoopGeo = new THREE.TorusGeometry(0.04, 0.008, 6, 10, Math.PI);
  const bowLeft = new THREE.Mesh(bowLoopGeo, tieMat);
  bowLeft.position.set(0.16, 0.235, -0.02);
  bowLeft.rotation.set(0.3, 0.5, 0.8);
  group.add(bowLeft);

  const bowRight = new THREE.Mesh(bowLoopGeo, tieMat);
  bowRight.position.set(0.16, 0.235, 0.02);
  bowRight.rotation.set(-0.3, -0.5, 0.8);
  group.add(bowRight);

  // Trailing ribbon ends (thin tapered cylinders hanging down)
  const ribbonGeo = new THREE.CylinderGeometry(0.004, 0.008, 0.10, 4);
  const ribbonL = new THREE.Mesh(ribbonGeo, tieMat);
  ribbonL.position.set(0.17, 0.16, -0.02);
  ribbonL.rotation.z = 0.25;
  group.add(ribbonL);

  const ribbonR = new THREE.Mesh(ribbonGeo, tieMat);
  ribbonR.position.set(0.17, 0.16, 0.02);
  ribbonR.rotation.z = -0.2;
  group.add(ribbonR);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 5. FALLEN GRAINS ON THE GROUND ────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const fallenGrainGeo = new THREE.SphereGeometry(0.01, 5, 4);
  const fallenPositions = [
    [0.18, 0.12], [-0.15, 0.20], [0.22, -0.14], [-0.20, -0.10],
    [0.05, 0.25], [-0.08, -0.22], [0.26, 0.06], [-0.24, 0.08],
    [0.12, -0.20], [-0.02, 0.30], [0.30, -0.08], [-0.28, -0.04],
  ];
  fallenPositions.forEach(([fx, fz]) => {
    const grain = new THREE.Mesh(fallenGrainGeo, grainMat);
    grain.position.set(fx, 0.025, fz);
    grain.scale.set(1, 0.6, 0.7);
    grain.rotation.y = Math.random() * Math.PI;
    group.add(grain);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 6. SMALL FIELD FLOWERS ────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const flowers = [
    // [x, z, color]  — cornflowers (blue) and poppies (red)
    [-0.30,  0.18, 0x4488cc],   // cornflower
    [ 0.28, -0.20, 0xcc3333],   // poppy
    [-0.22, -0.26, 0x4488cc],   // cornflower
    [ 0.32,  0.14, 0xcc3333],   // poppy
    [-0.34, -0.06, 0x5599dd],   // cornflower
  ];
  flowers.forEach(([fx, fz, fc]) => {
    // Stem
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.004, 0.08, 4),
      grassMat
    );
    stem.position.set(fx, 0.06, fz);
    stem.rotation.z = (Math.random() - 0.5) * 0.15;
    group.add(stem);

    // Flower head
    const flower = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 6, 5),
      mat(fc)
    );
    flower.position.set(fx, 0.10, fz);
    group.add(flower);

    // Tiny leaf on stem
    const tinyLeaf = new THREE.Mesh(
      new THREE.PlaneGeometry(0.025, 0.015),
      leafMat
    );
    tinyLeaf.position.set(fx + 0.01, 0.06, fz);
    tinyLeaf.rotation.y = Math.random() * Math.PI;
    tinyLeaf.rotation.z = 0.4;
    group.add(tinyLeaf);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 7. GRASS TUFTS AROUND BASE ────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const bladeGeo = new THREE.ConeGeometry(0.010, 0.06, 3);
  const grassPositions = [
    [-0.32, 0.26], [0.30, 0.28], [-0.28, -0.30],
    [0.34, -0.22], [-0.36, 0.02], [0.36, 0.08],
    [0.10, 0.34], [-0.14, -0.34],
  ];
  grassPositions.forEach(([gx, gz]) => {
    for (let b = 0; b < 3; b++) {
      const blade = new THREE.Mesh(bladeGeo, grassMat);
      blade.position.set(
        gx + (Math.random() - 0.5) * 0.05,
        0.03,
        gz + (Math.random() - 0.5) * 0.05
      );
      blade.rotation.z = (Math.random() - 0.5) * 0.3;
      blade.rotation.x = (Math.random() - 0.5) * 0.2;
      group.add(blade);
    }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 8. LADYBUG ON A STALK ─────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const bugGrp = new THREE.Group();

  // Body (red with hemisphere shape)
  const bugBody = new THREE.Mesh(
    new THREE.SphereGeometry(0.022, 8, 6),
    mat(0xcc2211)
  );
  bugBody.scale.set(1, 0.6, 1.2);
  bugGrp.add(bugBody);

  // Head (small black sphere)
  const bugHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.012, 6, 5),
    mat(0x111111)
  );
  bugHead.position.set(0, 0.002, 0.025);
  bugGrp.add(bugHead);

  // Black dots on body
  const dotGeo = new THREE.SphereGeometry(0.005, 4, 3);
  const dotMat = mat(0x111111);
  [
    [-0.008, 0.012,  0.005],
    [ 0.010, 0.012, -0.008],
    [-0.006, 0.010, -0.014],
    [ 0.008, 0.010,  0.010],
  ].forEach(([dx, dy, dz]) => {
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.set(dx, dy, dz);
    bugGrp.add(dot);
  });

  // Center line (wing division)
  const wingLine = new THREE.Mesh(
    new THREE.BoxGeometry(0.003, 0.015, 0.04),
    dotMat
  );
  wingLine.position.set(0, 0.013, 0);
  bugGrp.add(wingLine);

  // Tiny antennae
  const antennaGeo = new THREE.CylinderGeometry(0.002, 0.001, 0.02, 3);
  const antennaL = new THREE.Mesh(antennaGeo, dotMat);
  antennaL.position.set(-0.006, 0.008, 0.035);
  antennaL.rotation.z = -0.5;
  antennaL.rotation.x = -0.6;
  bugGrp.add(antennaL);

  const antennaR = new THREE.Mesh(antennaGeo, dotMat);
  antennaR.position.set(0.006, 0.008, 0.035);
  antennaR.rotation.z = 0.5;
  antennaR.rotation.x = -0.6;
  bugGrp.add(antennaR);

  // Place the ladybug on the third stalk, partway up
  bugGrp.position.set(-0.07 + 0.02, 0.38, 0.06 + 0.02);
  bugGrp.rotation.set(0.2, 1.2, 0.8);
  group.add(bugGrp);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 9. SMALL PEBBLES ─────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const pebbleMat = mat(0x8a8070);
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
    const dist  = 0.32 + Math.random() * 0.08;
    const pebble = new THREE.Mesh(
      new THREE.SphereGeometry(0.010 + Math.random() * 0.006, 5, 3),
      pebbleMat
    );
    pebble.position.set(Math.cos(angle) * dist, 0.015, Math.sin(angle) * dist);
    pebble.scale.y = 0.45;
    group.add(pebble);
  }

  // ── Assemble & outline ────────────────────────────────────────────────────
  addOutline(group);
  return group;
}

export const wheatMeta = {
  id: 'wheat',
  name: 'Wheat',
  category: 'Kaynak',
  description: 'Tahıl kaynağını temsil eden detaylı buğday demeti. Sap eklemleri, tane başakları, yapraklar, kurdele ile bağ, uğur böceği detayı.',
  type: 'Kaynak Token',
  materials: 10,
  geo: 'Prosedürel',
};
