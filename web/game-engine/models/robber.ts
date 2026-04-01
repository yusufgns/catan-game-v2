import * as THREE from 'three';
import { mat, palette, addOutline } from './materials';

export function createRobber() {
  const group = new THREE.Group();

  // ── Palette ─────────────────────────────────────────────────────────────────
  const P = {
    body:    palette('robberBody'),
    cloak:   palette('robberCloak'),
    eye:     palette('robberEye'),
    staff:   palette('robberStaff'),
  };

  // ── Materials ───────────────────────────────────────────────────────────────
  const bodyMat    = mat(P.body);
  const cloakMat   = mat(P.cloak);
  const cloakDark  = mat(P.cloak, { color: new THREE.Color(P.cloak).multiplyScalar(0.6) });
  const eyeMat     = mat(P.eye, { emissive: P.eye, emissiveIntensity: 0.9 });
  const staffMat   = mat(P.staff);
  const staffDark  = mat(P.staff, { color: new THREE.Color(P.staff).multiplyScalar(0.7) });
  const beltMat    = mat(0x3b2010);
  const buckleMat  = mat(0xb89b40, { emissive: 0xb89b40, emissiveIntensity: 0.15 });
  const bootMat    = mat(0x2a1a0e);
  const faceMat    = mat(0x111111);
  const boneMat    = mat(0xd4c9a8);
  const shadowMat  = mat(0x000000, { transparent: true, opacity: 0.35 });
  const pouchMat   = mat(0x4a3020);
  const bladeMat   = mat(0x888899, { emissive: 0x888899, emissiveIntensity: 0.05 });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 1. GROUND SHADOW (dark circle beneath) ────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const groundShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.38, 24),
    shadowMat
  );
  groundShadow.rotation.x = -Math.PI / 2;
  groundShadow.position.y = 0.005;
  group.add(groundShadow);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 2. BOOTS (visible under robe, slightly pointed) ───────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const bootGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.14, 8);
  const bootToeGeo = new THREE.ConeGeometry(0.045, 0.10, 6);

  [[-0.09, 1], [0.09, -1]].forEach(([xOff, side]) => {
    const boot = new THREE.Mesh(bootGeo, bootMat);
    boot.position.set(xOff, 0.07, 0.02);
    boot.castShadow = true;
    group.add(boot);

    // Pointed toe
    const toe = new THREE.Mesh(bootToeGeo, bootMat);
    toe.position.set(xOff, 0.04, 0.10);
    toe.rotation.x = Math.PI / 2;
    group.add(toe);

    // Boot sole (darker line at bottom)
    const sole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.072, 0.075, 0.02, 8),
      mat(0x1a0e06)
    );
    sole.position.set(xOff, 0.01, 0.02);
    group.add(sole);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 3. ROBE / CLOAK BODY (layered segments, flowing fabric) ───────────────
  // ══════════════════════════════════════════════════════════════════════════════

  // Bottom robe layer — widest, skirt-like
  const robeBottom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.32, 0.30, 12),
    cloakMat
  );
  robeBottom.position.set(0, 0.25, 0.01);
  robeBottom.castShadow = true;
  robeBottom.receiveShadow = true;
  group.add(robeBottom);

  // Mid robe layer
  const robeMid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.19, 0.24, 0.22, 12),
    cloakMat
  );
  robeMid.position.set(0, 0.50, 0.02);
  robeMid.castShadow = true;
  group.add(robeMid);

  // Upper robe layer
  const robeUpper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.20, 0.18, 10),
    cloakMat
  );
  robeUpper.position.set(0, 0.68, 0.03);
  robeUpper.castShadow = true;
  group.add(robeUpper);

  // Shoulder area — slightly wider for hunched look
  const shoulders = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.16, 0.10, 10),
    bodyMat
  );
  shoulders.position.set(0, 0.81, 0.04);
  shoulders.castShadow = true;
  group.add(shoulders);

  // ── Tattered / ragged hem (bottom edge) ─────────────────────────────────────
  const hemRadius = 0.33;
  const hemY = 0.10;
  const tattersCount = 18;
  for (let i = 0; i < tattersCount; i++) {
    const angle = (i / tattersCount) * Math.PI * 2;
    const h = 0.06 + Math.random() * 0.06;
    const w = 0.035 + Math.random() * 0.02;
    const tatter = new THREE.Mesh(
      new THREE.ConeGeometry(w, h, 3),
      i % 3 === 0 ? cloakDark : cloakMat
    );
    tatter.position.set(
      Math.sin(angle) * hemRadius + (Math.random() - 0.5) * 0.02,
      hemY - h / 2,
      Math.cos(angle) * hemRadius + (Math.random() - 0.5) * 0.02
    );
    tatter.rotation.z = (Math.random() - 0.5) * 0.4;
    tatter.rotation.x = (Math.random() - 0.5) * 0.3;
    group.add(tatter);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 4. HUNCHED POSTURE — lean body group forward slightly ─────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  // (Achieved by positioning torso/head slightly forward in Z — already offset above)

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 5. HEAD & HOOD (cone + sphere with depth and shadow) ──────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 14, 12),
    bodyMat
  );
  head.position.set(0, 0.97, 0.05);
  head.castShadow = true;
  group.add(head);

  // Hood — outer shell (larger cone, enveloping head)
  const hood = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.38, 14),
    cloakMat
  );
  hood.position.set(0, 1.18, 0.02);
  hood.castShadow = true;
  group.add(hood);

  // Hood brim — ring at forehead level creating depth/shadow
  const hoodBrim = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.03, 8, 16, Math.PI),
    cloakDark
  );
  hoodBrim.position.set(0, 1.01, 0.08);
  hoodBrim.rotation.x = -0.3;
  group.add(hoodBrim);

  // Hood inner shadow (dark sphere slightly behind face)
  const hoodShadow = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    faceMat
  );
  hoodShadow.position.set(0, 1.01, 0.07);
  hoodShadow.rotation.x = Math.PI;
  group.add(hoodShadow);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 6. FACE — GLOWING EYES & MASK AREA ────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  // Face mask / bandana area (dark region)
  const faceMask = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.08),
    faceMat
  );
  faceMask.position.set(0, 0.94, 0.165);
  group.add(faceMask);

  // Glowing red eyes — slightly larger, menacing
  const eyeGeo = new THREE.SphereGeometry(0.028, 8, 6);

  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.06, 0.98, 0.18);
  eyeL.scale.set(1.2, 0.7, 0.8); // narrowed, sinister squint

  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.06, 0.98, 0.18);
  eyeR.scale.set(1.2, 0.7, 0.8);

  group.add(eyeL, eyeR);

  // Eye glow halos (subtle)
  const glowGeo = new THREE.SphereGeometry(0.04, 8, 6);
  const glowMat = mat(P.eye, { emissive: P.eye, emissiveIntensity: 0.5, transparent: true, opacity: 0.3 });

  [eyeL, eyeR].forEach((eye) => {
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.copy(eye.position);
    glow.position.z += 0.01;
    group.add(glow);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 7. LEATHER BELT & BUCKLE ──────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const belt = new THREE.Mesh(
    new THREE.TorusGeometry(0.205, 0.022, 8, 24),
    beltMat
  );
  belt.position.set(0, 0.55, 0.02);
  belt.rotation.x = Math.PI / 2;
  belt.castShadow = true;
  group.add(belt);

  // Belt buckle (small rectangle)
  const buckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.045, 0.025),
    buckleMat
  );
  buckle.position.set(0, 0.55, 0.23);
  group.add(buckle);

  // Buckle prong (inner detail)
  const buckleInner = new THREE.Mesh(
    new THREE.BoxGeometry(0.025, 0.025, 0.008),
    mat(0x222222)
  );
  buckleInner.position.set(0, 0.55, 0.24);
  group.add(buckleInner);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 8. POUCH / SATCHEL (hanging from belt) ────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const pouch = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.08, 0.05),
    pouchMat
  );
  pouch.position.set(0.18, 0.49, 0.14);
  pouch.rotation.y = 0.3;
  pouch.castShadow = true;
  group.add(pouch);

  // Pouch flap
  const pouchFlap = new THREE.Mesh(
    new THREE.BoxGeometry(0.075, 0.02, 0.055),
    mat(0x3a2518)
  );
  pouchFlap.position.set(0.18, 0.535, 0.14);
  pouchFlap.rotation.y = 0.3;
  group.add(pouchFlap);

  // Pouch strap (connects to belt)
  const pouchStrap = new THREE.Mesh(
    new THREE.BoxGeometry(0.015, 0.06, 0.012),
    beltMat
  );
  pouchStrap.position.set(0.18, 0.53, 0.16);
  pouchStrap.rotation.y = 0.3;
  group.add(pouchStrap);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 9. KNIFE / DAGGER AT BELT ─────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  // Dagger handle
  const daggerHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.014, 0.07, 6),
    staffMat
  );
  daggerHandle.position.set(-0.18, 0.52, 0.16);
  daggerHandle.rotation.z = -0.2;
  group.add(daggerHandle);

  // Dagger guard (cross-piece)
  const daggerGuard = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.008, 0.015),
    buckleMat
  );
  daggerGuard.position.set(-0.175, 0.485, 0.16);
  daggerGuard.rotation.z = -0.2;
  group.add(daggerGuard);

  // Dagger blade (elongated triangle shape via cone)
  const daggerBlade = new THREE.Mesh(
    new THREE.ConeGeometry(0.015, 0.10, 4),
    bladeMat
  );
  daggerBlade.position.set(-0.17, 0.43, 0.16);
  daggerBlade.rotation.z = -0.2;
  daggerBlade.rotation.y = Math.PI / 4;
  group.add(daggerBlade);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 10. TATTERED CAPE (flowing behind) ────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  // Cape main body — wide trapezoid shape
  const capeShape = new THREE.Shape();
  capeShape.moveTo(-0.14, 0);
  capeShape.lineTo(-0.20, -0.50);
  capeShape.lineTo(0.20, -0.50);
  capeShape.lineTo(0.14, 0);
  capeShape.closePath();

  const capeGeo = new THREE.ExtrudeGeometry(capeShape, { depth: 0.015, bevelEnabled: false });
  const cape = new THREE.Mesh(capeGeo, cloakMat);
  cape.position.set(0, 0.82, -0.16);
  cape.rotation.x = 0.15; // slight backward flow
  cape.castShadow = true;
  group.add(cape);

  // Cape tattered bottom edge
  const capeTatters = 8;
  for (let i = 0; i < capeTatters; i++) {
    const x = -0.18 + (i / (capeTatters - 1)) * 0.36;
    const h = 0.04 + Math.random() * 0.05;
    const tatter = new THREE.Mesh(
      new THREE.ConeGeometry(0.022 + Math.random() * 0.01, h, 3),
      i % 2 === 0 ? cloakDark : cloakMat
    );
    tatter.position.set(x, 0.30 - h / 2, -0.17);
    tatter.rotation.x = 0.15;
    tatter.rotation.z = (Math.random() - 0.5) * 0.3;
    group.add(tatter);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 11. STAFF / WALKING STICK with gnarled top ────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  // Main shaft — slightly tapered
  const staffShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.028, 1.30, 8),
    staffMat
  );
  staffShaft.position.set(0.30, 0.65, 0.0);
  staffShaft.rotation.z = 0.12;
  staffShaft.castShadow = true;
  group.add(staffShaft);

  // Gnarled top — twisted knots (spheres arranged irregularly)
  const knarlPositions = [
    [0.38, 1.28, 0.0, 0.030],
    [0.37, 1.32, 0.02, 0.025],
    [0.39, 1.26, -0.02, 0.022],
    [0.36, 1.30, -0.01, 0.020],
    [0.40, 1.30, 0.01, 0.018],
  ];
  knarlPositions.forEach(([x, y, z, r]) => {
    const knot = new THREE.Mesh(
      new THREE.SphereGeometry(r, 6, 5),
      staffDark
    );
    knot.position.set(x, y, z);
    group.add(knot);
  });

  // Twisted vine/bark wrapping (small torus sections along shaft)
  [0.45, 0.65, 0.85, 1.05].forEach((yy) => {
    const xOff = 0.30 + (yy - 0.65) * Math.sin(0.12);
    const vine = new THREE.Mesh(
      new THREE.TorusGeometry(0.03, 0.006, 6, 8, Math.PI * 1.2),
      staffDark
    );
    vine.position.set(xOff, yy, 0.0);
    vine.rotation.x = Math.random() * Math.PI;
    vine.rotation.y = Math.random() * Math.PI;
    group.add(vine);
  });

  // ── 12. CRYSTAL ON TOP OF STAFF (octahedron, glowing) ─────────────────────
  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.065),
    eyeMat
  );
  crystal.position.set(0.39, 1.40, 0.0);
  crystal.rotation.y = Math.PI / 4;
  group.add(crystal);

  // Crystal inner glow (slightly larger transparent sphere)
  const crystalGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 6),
    mat(P.eye, { emissive: P.eye, emissiveIntensity: 0.6, transparent: true, opacity: 0.2 })
  );
  crystalGlow.position.copy(crystal.position);
  group.add(crystalGlow);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 13. ARMS (under cloak, subtle bumps) ──────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  // Left arm (reaching toward staff)
  const armL = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 0.28, 8),
    cloakMat
  );
  armL.position.set(0.20, 0.72, 0.04);
  armL.rotation.z = -0.6;
  armL.rotation.x = -0.15;
  armL.castShadow = true;
  group.add(armL);

  // Right arm (hanging down)
  const armR = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 0.25, 8),
    cloakMat
  );
  armR.position.set(-0.18, 0.68, 0.06);
  armR.rotation.z = 0.35;
  armR.rotation.x = -0.1;
  armR.castShadow = true;
  group.add(armR);

  // Hand / fist near staff (small sphere)
  const handL = new THREE.Mesh(
    new THREE.SphereGeometry(0.032, 6, 5),
    bodyMat
  );
  handL.position.set(0.30, 0.62, 0.02);
  group.add(handL);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 14. SKULL & BONES AT FEET (subtle detail) ─────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  // Small skull
  const skull = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 8, 6),
    boneMat
  );
  skull.position.set(-0.22, 0.035, 0.22);
  skull.scale.set(1.0, 0.85, 0.9);
  group.add(skull);

  // Skull eye sockets (two tiny dark holes)
  const socketGeo = new THREE.SphereGeometry(0.008, 4, 3);
  const socketMat = mat(0x222222);

  const socketL = new THREE.Mesh(socketGeo, socketMat);
  socketL.position.set(-0.235, 0.04, 0.245);
  const socketR = new THREE.Mesh(socketGeo, socketMat);
  socketR.position.set(-0.205, 0.04, 0.245);
  group.add(socketL, socketR);

  // Jaw (flattened sphere below skull)
  const jaw = new THREE.Mesh(
    new THREE.SphereGeometry(0.022, 6, 4),
    boneMat
  );
  jaw.position.set(-0.22, 0.018, 0.24);
  jaw.scale.set(1.0, 0.5, 0.8);
  group.add(jaw);

  // Scattered bones (two small cylinders)
  const boneGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.08, 5);

  const bone1 = new THREE.Mesh(boneGeo, boneMat);
  bone1.position.set(0.20, 0.01, 0.28);
  bone1.rotation.z = Math.PI / 2;
  bone1.rotation.y = 0.6;
  group.add(bone1);

  const bone2 = new THREE.Mesh(boneGeo, boneMat);
  bone2.position.set(0.24, 0.01, 0.25);
  bone2.rotation.z = Math.PI / 2;
  bone2.rotation.y = -0.4;
  group.add(bone2);

  // Bone end knobs (small spheres at ends)
  [bone1, bone2].forEach((bone) => {
    const knob1 = new THREE.Mesh(new THREE.SphereGeometry(0.012, 5, 4), boneMat);
    knob1.position.copy(bone.position);
    knob1.position.x -= 0.04;
    const knob2 = new THREE.Mesh(new THREE.SphereGeometry(0.012, 5, 4), boneMat);
    knob2.position.copy(bone.position);
    knob2.position.x += 0.04;
    group.add(knob1, knob2);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── 15. ROBE FOLDS / FABRIC DETAIL ────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  // Vertical fold lines on front of robe (subtle ridges)
  [-0.06, 0.0, 0.06].forEach((xOff) => {
    const fold = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.35, 0.008),
      cloakDark
    );
    fold.position.set(xOff, 0.38, 0.22);
    group.add(fold);
  });

  // Shoulder ridge (where hood meets cloak)
  const shoulderRidge = new THREE.Mesh(
    new THREE.TorusGeometry(0.165, 0.018, 6, 14, Math.PI),
    cloakDark
  );
  shoulderRidge.position.set(0, 0.86, 0.04);
  shoulderRidge.rotation.x = Math.PI / 2;
  shoulderRidge.rotation.z = Math.PI;
  group.add(shoulderRidge);

  // ══════════════════════════════════════════════════════════════════════════════
  // ── ASSEMBLE & OUTLINE ────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  // Apply a subtle forward lean to the entire group for hunched posture
  group.rotation.x = 0.06;

  addOutline(group);
  return group;
}

export const robberMeta = {
  id: 'robber',
  name: 'Robber',
  category: 'Özel',
  description: 'Üzerine konulduğu hex\'in kaynak üretimini engeller. Detaylı kapüşonlu haydut figürü.',
  type: 'Özel Token',
  materials: 12,
  geo: 'Prosedürel',
};
