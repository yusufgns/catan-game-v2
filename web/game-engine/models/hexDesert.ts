/**
 * Desert hex terrain tile — produces nothing (robber starts here).
 * Sandy base with dunes, cacti, small rocks, and cracked ground.
 * Kept lightweight (~25 meshes) for instancing across the board.
 */
import * as THREE from 'three';
import { mat, palette, canvasTex } from './materials';
import { createHexPlate } from './hexBase';

export function createHexDesert() {
  const group = new THREE.Group();

  // ── Palette ─────────────────────────────────────────────────────────────────
  const P = {
    ground: palette('hexDesertGround'),
    sand:   palette('hexDesertSand'),
    cactus: palette('hexDesertCactus'),
    stone:  palette('settlementStone'),
  };

  // ── Cracked ground texture ──────────────────────────────────────────────────
  const crackTex = canvasTex(128, (ctx, s) => {
    // Sandy base
    const r = (P.ground >> 16) & 0xff, g = (P.ground >> 8) & 0xff, b = P.ground & 0xff;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, s, s);

    // Crack lines (dark thin lines)
    ctx.strokeStyle = 'rgba(80, 50, 20, 0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      const sx = Math.random() * s, sy = Math.random() * s;
      ctx.moveTo(sx, sy);
      // Jagged crack path with 2-3 segments
      let cx = sx, cy = sy;
      const segs = 2 + Math.floor(Math.random() * 2);
      for (let j = 0; j < segs; j++) {
        cx += (Math.random() - 0.5) * s * 0.3;
        cy += (Math.random() - 0.5) * s * 0.3;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    // Subtle sand grain noise
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = `rgba(255, 220, 120, ${0.03 + Math.random() * 0.04})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 1, 1);
    }
  });
  crackTex.wrapS = crackTex.wrapT = THREE.RepeatWrapping;

  // ── Materials ───────────────────────────────────────────────────────────────
  const groundMat = mat(P.ground, { map: crackTex });
  const sandMat   = mat(P.sand);
  const cactusMat = mat(P.cactus);
  const stoneMat  = mat(P.stone);

  // ── 1. HEX BASE PLATE (with cracked texture) ───────────────────────────────
  const plate = createHexPlate(0.95, 0.08, groundMat);
  group.add(plate);

  // ── 2. SAND DUNES (3 flattened spheres) ─────────────────────────────────────
  const dunes = [
    { x: -0.28, z: -0.18, r: 0.25, sy: 0.18 },
    { x:  0.22, z:  0.20, r: 0.22, sy: 0.15 },
    { x:  0.05, z: -0.32, r: 0.18, sy: 0.12 },
  ];
  dunes.forEach(({ x, z, r, sy }) => {
    const dune = new THREE.Mesh(
      new THREE.SphereGeometry(r, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      sandMat
    );
    dune.position.set(x, 0.08, z);
    dune.scale.y = sy;
    dune.castShadow = true;
    dune.receiveShadow = true;
    group.add(dune);
  });

  // ── 3. CACTI (2 simple cacti: cylinder trunk + sphere arms) ─────────────────

  // ── Cactus 1 (taller, with 2 arms) ──
  const c1x = -0.35, c1z = 0.22;

  // Trunk
  const trunk1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.028, 0.18, 7),
    cactusMat
  );
  trunk1.position.set(c1x, 0.08 + 0.09, c1z);
  trunk1.castShadow = true;
  group.add(trunk1);

  // Right arm
  const arm1r = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.020, 0.07, 6),
    cactusMat
  );
  arm1r.position.set(c1x + 0.04, 0.08 + 0.12, c1z);
  arm1r.rotation.z = -0.8;
  arm1r.castShadow = true;
  group.add(arm1r);

  // Left arm (shorter)
  const arm1l = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.018, 0.05, 6),
    cactusMat
  );
  arm1l.position.set(c1x - 0.035, 0.08 + 0.10, c1z);
  arm1l.rotation.z = 0.7;
  arm1l.castShadow = true;
  group.add(arm1l);

  // Arm tips (small spheres)
  const tip1r = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 4), cactusMat);
  tip1r.position.set(c1x + 0.065, 0.08 + 0.14, c1z);
  group.add(tip1r);

  const tip1l = new THREE.Mesh(new THREE.SphereGeometry(0.016, 5, 4), cactusMat);
  tip1l.position.set(c1x - 0.055, 0.08 + 0.12, c1z);
  group.add(tip1l);

  // ── Cactus 2 (smaller, single trunk) ──
  const c2x = 0.38, c2z = -0.18;

  const trunk2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.020, 0.022, 0.10, 6),
    cactusMat
  );
  trunk2.position.set(c2x, 0.08 + 0.05, c2z);
  trunk2.castShadow = true;
  group.add(trunk2);

  // Single arm on cactus 2
  const arm2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.016, 0.04, 5),
    cactusMat
  );
  arm2.position.set(c2x - 0.03, 0.08 + 0.07, c2z);
  arm2.rotation.z = 0.9;
  arm2.castShadow = true;
  group.add(arm2);

  const tip2 = new THREE.Mesh(new THREE.SphereGeometry(0.014, 5, 4), cactusMat);
  tip2.position.set(c2x - 0.048, 0.08 + 0.085, c2z);
  group.add(tip2);

  // ── 4. SMALL ROCKS (4 stones scattered) ─────────────────────────────────────
  const rocks = [
    { x:  0.40, z:  0.30, r: 0.025 },
    { x: -0.15, z: -0.42, r: 0.020 },
    { x:  0.30, z: -0.38, r: 0.018 },
    { x: -0.42, z: -0.08, r: 0.022 },
  ];
  rocks.forEach(({ x, z, r }) => {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(r, 0),
      stoneMat
    );
    rock.position.set(x, 0.08 + r * 0.5, z);
    rock.scale.y = 0.5;
    rock.rotation.y = Math.random() * Math.PI;
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);
  });

  // ── 5. DRIED TWIG / BONE (thin cylinder on ground) ──────────────────────────
  const twig = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.003, 0.10, 4),
    mat(0xc8b090)
  );
  twig.position.set(0.12, 0.08 + 0.005, 0.35);
  twig.rotation.z = Math.PI / 2;
  twig.rotation.y = 0.6;
  twig.receiveShadow = true;
  group.add(twig);

  return group;
}

export const hexDesertMeta = {
  id: 'hexDesert',
  name: 'Çöl',
  category: 'Arazi',
  description: 'Kaynak üretmeyen çöl arazisi. Kum tepeleri, kaktüsler, küçük kayalar ve çatlamış zemin içerir. Hırsız burada başlar.',
  type: 'Hex Tile',
  materials: 5,
  geo: 'Prosedürel',
};
