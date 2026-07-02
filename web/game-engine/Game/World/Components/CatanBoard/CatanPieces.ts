import * as THREE from 'three';

/**
 * Game pieces — from-scratch, flat-shaded, chunky board-game silhouettes.
 * Settlement = classic gable house, City = house + tower, Road = clean bar.
 * Player color dominates every piece so ownership reads instantly.
 */

// ─── Color helpers ──────────────────────────────────────────────────────────

/** Darken hex color by factor f (0..1). */
function dk(hex: string, f: number): string {
  const c = new THREE.Color(hex);
  c.multiplyScalar(1 - f);
  return `#${c.getHexString()}`;
}

/** Lighten hex color toward white by factor f (0..1). */
function lt(hex: string, f: number): string {
  const c = new THREE.Color(hex);
  c.lerp(new THREE.Color(0xffffff), f);
  return `#${c.getHexString()}`;
}

function mat(color: string | number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness: 0.72, metalness: 0, flatShading: true, ...opts,
  });
}

const CREAM = '#f3ead7';
const DARK = '#241f1a';

function applyScale(group: THREE.Group, scale: number | number[]) {
  if (typeof scale === 'number') group.scale.setScalar(scale);
  else group.scale.set(scale[0], scale[1], scale[2]);
  return group;
}

function shadowed(mesh: THREE.Mesh): THREE.Mesh {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Gable house body: pentagon profile extruded along Z. */
function gableHouse(w: number, wallH: number, apexH: number, depth: number, color: string): THREE.Group {
  const g = new THREE.Group();

  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(w / 2, wallH);
  shape.lineTo(0, apexH);
  shape.lineTo(-w / 2, wallH);
  shape.closePath();

  const body = shadowed(new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }),
    mat(color),
  ));
  body.position.z = -depth / 2;
  g.add(body);

  // Roof slabs — two angled boxes, darker shade, slight overhang
  const slope = Math.hypot(w / 2, apexH - wallH);
  const roofMat = mat(dk(color, 0.38), { roughness: 0.6 });
  const angle = Math.atan2(apexH - wallH, w / 2);
  [-1, 1].forEach(side => {
    const slab = shadowed(new THREE.Mesh(
      new THREE.BoxGeometry(slope * 1.12, 0.07, depth * 1.14),
      roofMat,
    ));
    slab.position.set(side * w / 4, (wallH + apexH) / 2 + 0.035, 0);
    slab.rotation.z = -side * angle;
    g.add(slab);
  });

  return g;
}

// ─── 1. Settlement — classic gable house ────────────────────────────────────

export function createSettlement3D(color: string = '#DC2626', scale: number | number[] = 1): THREE.Group {
  const group = new THREE.Group();

  const W = 1.3, WALL = 0.95, APEX = 1.85, D = 1.05;

  // Plinth
  const plinth = shadowed(new THREE.Mesh(
    new THREE.BoxGeometry(W * 1.16, 0.14, D * 1.16),
    mat(dk(color, 0.5), { roughness: 0.85 }),
  ));
  plinth.position.y = 0.07;
  group.add(plinth);

  const house = gableHouse(W, WALL, APEX, D, color);
  house.position.y = 0.14;
  group.add(house);

  // Door
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.52, 0.06), mat(CREAM, { roughness: 0.6 }));
  door.position.set(0, 0.14 + 0.26, D / 2 + 0.02);
  group.add(door);
  const doorInner = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.4, 0.06), mat(DARK));
  doorInner.position.set(0, 0.14 + 0.22, D / 2 + 0.035);
  group.add(doorInner);

  // Window — warm glow (reads at night)
  const win = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.22, 0.05),
    mat('#ffca55', { emissive: 0xffb340, emissiveIntensity: 0.9, roughness: 0.4 }),
  );
  win.position.set(W / 2 + 0.015, 0.14 + WALL * 0.62, 0);
  win.rotation.y = Math.PI / 2;
  group.add(win);

  return applyScale(group, scale);
}

// ─── 2. City — grand house + watchtower ─────────────────────────────────────

export function createCity3D(color: string = '#2563EB', scale: number | number[] = 1): THREE.Group {
  const group = new THREE.Group();

  const W = 1.5, WALL = 1.05, APEX = 1.9, D = 1.15;

  // Shared plinth
  const plinth = shadowed(new THREE.Mesh(
    new THREE.BoxGeometry(W * 2.05, 0.16, D * 1.2),
    mat(dk(color, 0.5), { roughness: 0.85 }),
  ));
  plinth.position.set(0.28, 0.08, 0);
  group.add(plinth);

  // Main hall
  const hall = gableHouse(W, WALL, APEX, D, color);
  hall.position.set(-0.24, 0.16, 0);
  group.add(hall);

  // Chimney
  const chimney = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), mat(dk(color, 0.45))));
  chimney.position.set(-0.62, APEX - 0.05, 0.18);
  group.add(chimney);

  // Watchtower
  const TW = 0.72, TH = 2.15;
  const tower = shadowed(new THREE.Mesh(new THREE.BoxGeometry(TW, TH, TW), mat(color)));
  tower.position.set(0.85, 0.16 + TH / 2, 0);
  group.add(tower);

  // Tower band
  const band = new THREE.Mesh(new THREE.BoxGeometry(TW * 1.12, 0.12, TW * 1.12), mat(dk(color, 0.4)));
  band.position.set(0.85, 0.16 + TH * 0.72, 0);
  group.add(band);

  // Tower pyramid roof + gold finial
  const pyr = shadowed(new THREE.Mesh(new THREE.ConeGeometry(TW * 0.82, 0.72, 4), mat(dk(color, 0.38), { roughness: 0.6 })));
  pyr.position.set(0.85, 0.16 + TH + 0.36, 0);
  pyr.rotation.y = Math.PI / 4;
  group.add(pyr);
  const finial = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 6),
    mat('#ffd76a', { emissive: 0xffc94a, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.4 }),
  );
  finial.position.set(0.85, 0.16 + TH + 0.78, 0);
  group.add(finial);

  // Tower windows (stacked, warm glow)
  const winMat = mat('#ffca55', { emissive: 0xffb340, emissiveIntensity: 0.9, roughness: 0.4 });
  [0.5, 0.95].forEach(t => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.05), winMat);
    win.position.set(0.85, 0.16 + TH * t - 0.3, TW / 2 + 0.02);
    group.add(win);
  });

  // Grand door on hall
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.06), mat(CREAM, { roughness: 0.6 }));
  door.position.set(-0.24, 0.16 + 0.3, D / 2 + 0.02);
  group.add(door);
  const doorInner = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.46, 0.06), mat(DARK));
  doorInner.position.set(-0.24, 0.16 + 0.26, D / 2 + 0.035);
  group.add(doorInner);

  return applyScale(group, scale);
}

// ─── 3. Road — clean beveled bar ────────────────────────────────────────────

export function createRoad3D(color: string, length?: number, scale: number | number[] = 1): THREE.Group {
  const group = new THREE.Group();
  const L = length !== undefined ? length : 3.15;

  // Base slab (darker, slightly wider)
  const base = shadowed(new THREE.Mesh(
    new THREE.BoxGeometry(L, 0.16, 0.6),
    mat(dk(color, 0.42), { roughness: 0.85 }),
  ));
  base.position.y = 0.08;
  group.add(base);

  // Main bar
  const bar = shadowed(new THREE.Mesh(new THREE.BoxGeometry(L * 0.985, 0.28, 0.48), mat(color)));
  bar.position.y = 0.16 + 0.14;
  group.add(bar);

  // Top highlight strip
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(L * 0.96, 0.05, 0.34),
    mat(lt(color, 0.22), { roughness: 0.55 }),
  );
  top.position.y = 0.16 + 0.28 + 0.025;
  group.add(top);

  // Stud dots — subtle premium detail
  const studMat = mat(lt(color, 0.35), { roughness: 0.5 });
  const studGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.04, 8);
  [-L * 0.3, 0, L * 0.3].forEach(x => {
    const stud = new THREE.Mesh(studGeo, studMat);
    stud.position.set(x, 0.16 + 0.28 + 0.06, 0);
    group.add(stud);
  });

  return applyScale(group, scale);
}

// ─── 4. Road node — simple junction puck ────────────────────────────────────

export function createRoadNode3D(
  playerColor: string = '#EA580C',
  connectionAngles: number[] = [],
  neutral: boolean = false,
  scale: number | number[] = 1,
): THREE.Group {
  const group = new THREE.Group();
  const color = neutral ? '#93a0ad' : playerColor;

  // Base ring
  const ring = shadowed(new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 0.62, 0.14, 8),
    mat(dk(color, 0.42), { roughness: 0.85 }),
  ));
  ring.position.y = 0.07;
  group.add(ring);

  // Main puck
  const puck = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.54, 0.26, 8), mat(color)));
  puck.position.y = 0.14 + 0.13;
  group.add(puck);

  // Top cap
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.36, 0.05, 8),
    mat(lt(color, 0.2), { roughness: 0.55 }),
  );
  cap.position.y = 0.14 + 0.26 + 0.025;
  group.add(cap);

  // Arms toward each connected road
  for (const deg of connectionAngles) {
    const rad = (deg * Math.PI) / 180;
    const arm = new THREE.Group();
    arm.rotation.y = rad;

    const armBase = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.16, 0.34), mat(dk(color, 0.42)));
    armBase.position.set(0, 0.08, 0.62);
    arm.add(armBase);

    const armBar = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.28, 0.3), mat(color)));
    armBar.position.set(0, 0.16 + 0.14, 0.62);
    arm.add(armBar);

    group.add(arm);
  }

  return applyScale(group, scale);
}

// ─── 5. Robber — hooded shadow figure ───────────────────────────────────────

export function createRobber3D(active: boolean = false, scale: number | number[] = 1): THREE.Group {
  const group = new THREE.Group();

  const cloak = '#2a2431';
  const cloakDark = '#1d1824';
  const cloakLight = '#3a3344';
  const eyeCol = active ? '#ff4433' : '#ffc24a';

  // Ground shadow disc
  const baseDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.36, 0.03, 14),
    mat(cloakDark, { transparent: true, opacity: 0.7, roughness: 0.95 }),
  );
  baseDisc.position.y = 0.015;
  group.add(baseDisc);

  // Flowing robe — wide faceted cone
  const robe = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.15, 8), mat(cloak)));
  robe.position.y = 0.6;
  group.add(robe);

  // Shoulder cape
  const cape = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.5, 8), mat(cloakLight)));
  cape.position.y = 1.06;
  cape.rotation.y = Math.PI / 8;
  group.add(cape);

  // Hood — tilted cone, mysterious
  const hood = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.52, 8), mat(cloakDark)));
  hood.position.set(0, 1.44, 0.02);
  hood.rotation.x = 0.14;
  group.add(hood);

  // Face void
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mat('#0d0a12', { roughness: 1 }));
  face.position.set(0, 1.32, 0.1);
  group.add(face);

  // Glowing eyes
  const eyeMat = new THREE.MeshStandardMaterial({
    color: eyeCol, emissive: eyeCol, emissiveIntensity: active ? 1.6 : 1.0, roughness: 0.2,
  });
  [-0.045, 0.045].forEach(x => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 5), eyeMat);
    eye.position.set(x, 1.34, 0.19);
    group.add(eye);
  });

  // Loot sack
  const sack = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.15, 7, 6), mat('#6e4a26', { roughness: 0.9 })));
  sack.scale.set(1, 1.15, 0.95);
  sack.position.set(-0.3, 0.5, 0.12);
  group.add(sack);
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), mat('#8a5f33'));
  knot.position.set(-0.28, 0.67, 0.15);
  group.add(knot);

  // Active alert ring
  if (active) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.032, 8, 26),
      new THREE.MeshStandardMaterial({
        color: '#ff4433', emissive: 0xff4433, emissiveIntensity: 1.2,
        roughness: 0.3, transparent: true, opacity: 0.9,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    group.add(ring);
  }

  return applyScale(group, scale);
}
