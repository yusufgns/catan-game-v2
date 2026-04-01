import * as THREE from 'three';
import { mat, palette, addOutline, canvasTex } from './materials';

export function createRoad() {
  const group = new THREE.Group();

  // ── Palette ─────────────────────────────────────────────────────────────────
  const P = {
    wood:  palette('roadWood'),
    dark:  palette('roadDark'),
    grass: palette('grassGreen'),
    stone: palette('settlementStone'),
  };

  // ── Procedural wood-grain texture ─────────────────────────────────────────
  const woodGrainTex = canvasTex(128, (ctx, s) => {
    const r = (P.wood >> 16) & 0xff, g = (P.wood >> 8) & 0xff, b = P.wood & 0xff;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, s, s);
    // Grain lines running lengthwise
    for (let y = 0; y < s; y++) {
      const wave = Math.sin(y * 0.15) * 2;
      ctx.fillStyle = `rgba(0,0,0,${0.02 + Math.random() * 0.05})`;
      ctx.fillRect(wave, y, s, 1);
    }
    // Darker grain streaks
    for (let i = 0; i < 6; i++) {
      const x = Math.random() * s;
      ctx.fillStyle = `rgba(40,20,5,${0.06 + Math.random() * 0.06})`;
      ctx.fillRect(x, 0, 1 + Math.random() * 2, s);
    }
    // Knot holes
    for (let i = 0; i < 2; i++) {
      const kx = 20 + Math.random() * (s - 40);
      const ky = 20 + Math.random() * (s - 40);
      const kr = 3 + Math.random() * 4;
      ctx.beginPath();
      ctx.arc(kx, ky, kr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(30,15,5,${0.15 + Math.random() * 0.1})`;
      ctx.fill();
      // Ring around knot
      ctx.beginPath();
      ctx.arc(kx, ky, kr + 2, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(30,15,5,0.08)`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });
  woodGrainTex.wrapS = woodGrainTex.wrapT = THREE.RepeatWrapping;

  // Weathered/darker wood texture (for underside, cross braces)
  const weatheredTex = canvasTex(64, (ctx, s) => {
    const r = (P.dark >> 16) & 0xff, g = (P.dark >> 8) & 0xff, b = P.dark & 0xff;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y++) {
      ctx.fillStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.06})`;
      ctx.fillRect(0, y, s, 1);
    }
    // Weathering blotches
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, 4 + Math.random() * 6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.08})`;
      ctx.fill();
    }
  });

  // ── Materials ───────────────────────────────────────────────────────────────
  const woodMat     = mat(P.wood, { map: woodGrainTex });
  const darkWoodMat = mat(P.dark, { map: weatheredTex });
  const nailMat     = mat(0x333333);
  const ropeMat     = mat(0x9a8a6a);
  const grassMat    = mat(P.grass);
  const stoneMat    = mat(P.stone);
  const dirtMat     = mat(0x6a5a48);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 1. MAIN PLANK BOARDS (overlapping, varied) ────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const plankConfigs = [
    // [xOff, zOff, width, length, height, yOff, rotY]
    { x:  0.00, z: -0.08, w: 1.10, d: 0.10, h: 0.030, y: 0.040, ry:  0.00  },
    { x:  0.02, z:  0.02, w: 1.08, d: 0.09, h: 0.028, y: 0.042, ry:  0.012 },
    { x: -0.01, z:  0.11, w: 1.12, d: 0.10, h: 0.032, y: 0.038, ry: -0.008 },
    { x:  0.03, z: -0.06, w: 1.06, d: 0.08, h: 0.026, y: 0.044, ry:  0.015 },
    { x: -0.02, z:  0.04, w: 1.14, d: 0.09, h: 0.030, y: 0.036, ry: -0.010 },
  ];

  const planks: any[] = [];
  plankConfigs.forEach((cfg) => {
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(cfg.w, cfg.h, cfg.d),
      woodMat
    );
    plank.position.set(cfg.x, cfg.y, cfg.z);
    plank.rotation.y = cfg.ry;
    plank.castShadow = true;
    plank.receiveShadow = true;
    planks.push(plank);
    group.add(plank);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 2. NAIL HEADS on planks ───────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const nailGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.008, 6);
  // Nails at cross-brace intersections on each plank
  const nailXPositions = [-0.38, -0.02, 0.34];
  plankConfigs.forEach((cfg) => {
    nailXPositions.forEach((nx) => {
      // Two nails side by side per brace per plank
      [-0.015, 0.015].forEach((nzOff) => {
        const nail = new THREE.Mesh(nailGeo, nailMat);
        nail.position.set(
          cfg.x + nx + (Math.random() - 0.5) * 0.005,
          cfg.y + cfg.h / 2 + 0.003,
          cfg.z + nzOff
        );
        group.add(nail);
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 3. CROSS BRACES (structural support underneath) ───────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const bracePositions = [-0.38, -0.02, 0.34];
  bracePositions.forEach((bx) => {
    // Vertical cross brace
    const brace = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.06, 0.34),
      darkWoodMat
    );
    brace.position.set(bx, 0.01, 0.02);
    brace.castShadow = true;
    group.add(brace);
  });

  // Diagonal braces between vertical braces (visible from angle)
  const diagBraceGeo = new THREE.BoxGeometry(0.30, 0.025, 0.025);
  [
    { x: -0.20, z:  0.08, ry: 0 },
    { x:  0.16, z: -0.04, ry: 0 },
  ].forEach((d) => {
    const diag = new THREE.Mesh(diagBraceGeo, darkWoodMat);
    diag.position.set(d.x, 0.005, d.z);
    diag.rotation.y = d.ry;
    diag.rotation.z = 0.15;
    diag.castShadow = true;
    group.add(diag);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 4. WORN END CAPS (rounded edges at road ends) ─────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const capGeo = new THREE.CylinderGeometry(0.12, 0.13, 0.035, 10);
  [-0.57, 0.57].forEach((cx) => {
    const cap = new THREE.Mesh(capGeo, woodMat);
    cap.position.set(cx, 0.04, 0.02);
    cap.rotation.z = Math.PI / 2;
    cap.castShadow = true;
    group.add(cap);
  });

  // Extra worn plank ends (short stubs sticking out)
  [
    { x: -0.54, z: -0.06, w: 0.08, d: 0.07 },
    { x:  0.55, z:  0.08, w: 0.06, d: 0.06 },
    { x: -0.52, z:  0.10, w: 0.07, d: 0.06 },
  ].forEach((s) => {
    const stub = new THREE.Mesh(
      new THREE.BoxGeometry(s.w, 0.022, s.d),
      woodMat
    );
    stub.position.set(s.x, 0.038, s.z);
    stub.rotation.y = (Math.random() - 0.5) * 0.1;
    group.add(stub);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 5. ROPE / TWINE LASHING at joints ─────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const ropeGeo = new THREE.TorusGeometry(0.032, 0.005, 6, 12);
  bracePositions.forEach((bx) => {
    // Rope wrapping around brace-plank joint (top)
    const rope1 = new THREE.Mesh(ropeGeo, ropeMat);
    rope1.position.set(bx, 0.04, -0.10);
    rope1.rotation.x = Math.PI / 2;
    rope1.rotation.z = Math.random() * 0.3;
    group.add(rope1);

    const rope2 = new THREE.Mesh(ropeGeo, ropeMat);
    rope2.position.set(bx, 0.04, 0.12);
    rope2.rotation.x = Math.PI / 2;
    rope2.rotation.z = Math.random() * 0.3;
    group.add(rope2);

    // Small rope X-cross on the brace
    const ropeCross = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.004, 0.10, 4),
      ropeMat
    );
    ropeCross.position.set(bx, 0.045, 0.02);
    ropeCross.rotation.z = 0.6;
    group.add(ropeCross);
    const ropeCross2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.004, 0.10, 4),
      ropeMat
    );
    ropeCross2.position.set(bx, 0.045, 0.02);
    ropeCross2.rotation.z = -0.6;
    group.add(ropeCross2);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 6. WEATHERING — darker patches on wood surface ────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const patchGeo = new THREE.PlaneGeometry(0.12, 0.06);
  const patchMat = mat(P.dark, { transparent: true, opacity: 0.18 });
  [
    { x: -0.25, z: -0.04 },
    { x:  0.18, z:  0.08 },
    { x:  0.40, z: -0.02 },
    { x: -0.10, z:  0.10 },
  ].forEach((p) => {
    const patch = new THREE.Mesh(patchGeo, patchMat);
    patch.position.set(p.x, 0.058, p.z);
    patch.rotation.x = -Math.PI / 2;
    patch.rotation.z = Math.random() * Math.PI;
    group.add(patch);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 7. GRASS TUFTS (between and around planks) ────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const bladeGeo = new THREE.ConeGeometry(0.008, 0.045, 3);
  const grassPositions = [
    // Between planks
    [-0.30,  0.15], [-0.10, -0.12], [0.15,  0.14], [0.35, -0.10],
    [0.05,   0.16], [-0.20, -0.14], [0.45,  0.13], [-0.45, -0.08],
    // Around road edges
    [-0.50,  0.18], [0.50,  0.19], [-0.48, -0.16], [0.52, -0.14],
    [-0.35,  0.20], [0.25,  0.22], [0.42, -0.18], [-0.15, -0.19],
  ];
  grassPositions.forEach(([gx, gz]) => {
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const blade = new THREE.Mesh(bladeGeo, grassMat);
      blade.position.set(
        gx + (Math.random() - 0.5) * 0.03,
        0.022,
        gz + (Math.random() - 0.5) * 0.03
      );
      blade.rotation.z = (Math.random() - 0.5) * 0.4;
      blade.rotation.x = (Math.random() - 0.5) * 0.3;
      blade.scale.set(
        0.8 + Math.random() * 0.5,
        0.7 + Math.random() * 0.6,
        0.8 + Math.random() * 0.5
      );
      group.add(blade);
    }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 8. PEBBLES & DIRT around the base ─────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  // Dirt mounds
  const dirtGeo = new THREE.SphereGeometry(0.03, 5, 3);
  [
    [-0.42, -0.12], [0.44, 0.10], [-0.30, 0.18],
    [0.20, -0.17], [0.50, -0.08], [-0.50, 0.06],
  ].forEach(([dx, dz]) => {
    const dirt = new THREE.Mesh(dirtGeo, dirtMat);
    dirt.position.set(dx, 0.005, dz);
    dirt.scale.set(1.0 + Math.random() * 0.6, 0.3, 1.0 + Math.random() * 0.4);
    group.add(dirt);
  });

  // Pebbles
  for (let i = 0; i < 14; i++) {
    const px = (Math.random() - 0.5) * 1.2;
    const pz = (Math.random() - 0.5) * 0.44;
    // Only place pebbles near edges
    if (Math.abs(pz) < 0.10 && Math.abs(px) < 0.45) continue;
    const pebble = new THREE.Mesh(
      new THREE.SphereGeometry(0.008 + Math.random() * 0.010, 5, 3),
      stoneMat
    );
    pebble.position.set(px, 0.006, pz);
    pebble.scale.y = 0.35 + Math.random() * 0.3;
    pebble.rotation.y = Math.random() * Math.PI;
    group.add(pebble);
  }

  // Larger stepping stones at road ends
  [
    { x: -0.62, z:  0.00, r: 0.025 },
    { x:  0.63, z:  0.02, r: 0.022 },
    { x: -0.58, z:  0.12, r: 0.018 },
    { x:  0.60, z: -0.10, r: 0.020 },
  ].forEach((s) => {
    const stone = new THREE.Mesh(
      new THREE.CylinderGeometry(s.r, s.r * 1.1, 0.015, 6),
      stoneMat
    );
    stone.position.set(s.x, 0.007, s.z);
    stone.rotation.y = Math.random() * Math.PI;
    group.add(stone);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 9. EDGE SIDE BOARDS (visible road sides) ─────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  // Side rails / edge boards running lengthwise
  const edgeGeo = new THREE.BoxGeometry(1.05, 0.035, 0.018);
  [
    { z: -0.14, y: 0.025, ry:  0.005 },
    { z:  0.17, y: 0.023, ry: -0.008 },
  ].forEach((e) => {
    const edge = new THREE.Mesh(edgeGeo, darkWoodMat);
    edge.position.set(0, e.y, e.z);
    edge.rotation.y = e.ry;
    edge.castShadow = true;
    group.add(edge);
  });

  // ── Assemble & outline ────────────────────────────────────────────────────
  addOutline(group);
  return group;
}

export const roadMeta = {
  id: 'road',
  name: 'Road',
  category: 'Oyun Taşı',
  description: 'Yerleşimleri bağlar. En uzun yol için gerekli. Detaylı ortaçağ tahta/arnavut kaldırımı yol.',
  type: 'Altyapı',
  materials: 7,
  geo: 'Prosedürel',
};
