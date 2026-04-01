/**
 * Style-aware material factory for Catan Models.
 *
 * Call setStyle(styleConfig) before creating any model so mat() and palette()
 * use the correct material type, gradient map, outline settings, and colors.
 */
import * as THREE from 'three';

// ─── Style context ────────────────────────────────────────────────────────────
let _style: any = null;
let _gradientMaps: any = {};

export function setStyle(style) {
  _style = style;
  _gradientMaps = {};   // clear cached gradient maps when style changes
}

export function getStyle() { return _style; }

// ─── Default palette (Elemental Serenity values) ──────────────────────────────
const DEFAULT_PALETTE = {
  settlementWall: 0xd4956a, settlementRoof: 0x8b3a3a, settlementDoor: 0x5c3317,
  settlementTimber: 0x5c3a1e, settlementStone: 0x8a8070, settlementWindow: 0xffb347,
  grassGreen: 0x5a8a3a, flowerPink: 0xff6b8a, flowerYellow: 0xffcc44,
  cityWall:  0x8a7a6a, cityRoof:  0x4a3a8a, cityStone: 0xaaa090,
  roadWood:  0x8b5e3c, roadDark:  0x5c3a1e,
  shipHull:  0x8b5e3c, shipSail:  0xf5f0e8, shipMast: 0x5c3a1e, shipFlag: 0xc0392b,
  robberBody: 0x2a2a2a, robberCloak: 0x1a1a1a, robberEye: 0xff3300, robberStaff: 0x4a3a2a,
  sheepWool: 0xf2ede6, sheepSkin: 0xd4b896, sheepDark: 0x2a1f14, sheepEye: 0x1a1210,
  wheatStalk: 0xd4a832, wheatGrain: 0xe8c040, wheatLeaf: 0x8ab840, wheatTie: 0xb87333,
  woodBark: 0x5c3a1e, woodRing: 0x8b5e3c, woodLeaf: 0x2d6a2d, woodDark: 0x4a2e12,
  oreRock: 0x6a7a8a, oreVein: 0x8090a8, oreCrystal: 0x5588cc,
  brickMain: 0xb84428, brickMortar: 0xc8b89a, brickKiln: 0xa03820,
  // Hex terrain tiles
  hexForestGround: 0x2d7a3a, hexForestTree: 0x1e6b2e, hexForestTrunk: 0x5c3a1e,
  hexPastureGround: 0x6cc520, hexPastureFence: 0x8b6b3c,
  hexFieldsGround: 0xc8a030, hexFieldsWheat: 0xe8b830,
  hexHillsGround: 0xb85a28, hexHillsClay: 0x9a4420,
  hexMountainsGround: 0x788898, hexMountainsRock: 0x5a6a7a, hexMountainsPeak: 0xd8d8e0,
  hexDesertGround: 0xd4a838, hexDesertSand: 0xe8c060, hexDesertCactus: 0x3a7a3a,
  hexOceanWater: 0x2e80c8, hexOceanDeep: 0x1a5a90,
  hexFrame: 0xd4b87a,
};

/** Resolve a palette key → hex color number. */
export function palette(key: string) {
  return _style?.palette?.[key] ?? (DEFAULT_PALETTE as any)[key] ?? 0x888888;
}

// ─── Gradient map (toon steps) ────────────────────────────────────────────────
function getGradientMap(steps = 4) {
  if (_gradientMaps[steps]) return _gradientMaps[steps];
  const c = document.createElement('canvas');
  c.width = steps; c.height = 1;
  const ctx = c.getContext('2d')!;
  ['#222', '#666', '#aaa', '#eee'].slice(0, steps).forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.fillRect(i, 0, 1, 1);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  _gradientMaps[steps] = tex;
  return tex;
}

// ─── Material factory ─────────────────────────────────────────────────────────
/**
 * Create a material using the current style.
 * @param {number} color  hex color (use palette() to resolve)
 * @param {object} opts   optional overrides — emissive, emissiveIntensity, side, …
 */
export function mat(color: any, opts: any = {}) {
  const type = _style?.material ?? 'toon';

  if (type === 'toon') {
    return new THREE.MeshToonMaterial({
      color,
      gradientMap: getGradientMap(_style?.gradientSteps ?? 4),
      ...opts,
    });
  }

  if (type === 'standard') {
    // MeshStandardMaterial doesn't support gradientMap; pass only compatible opts
    const { emissive, emissiveIntensity, side, transparent, opacity, map } = opts;
    return new THREE.MeshStandardMaterial({
      color,
      roughness: _style?.roughness ?? 1.0,
      metalness: 0.0,
      ...(emissive     !== undefined && { emissive, emissiveIntensity: emissiveIntensity ?? 1 }),
      ...(side         !== undefined && { side }),
      ...(transparent  !== undefined && { transparent, opacity: opacity ?? 1 }),
      ...(map          !== undefined && { map }),
    });
  }

  if (type === 'physical') {
    const { side } = opts;
    return new THREE.MeshPhysicalMaterial({
      color, roughness: 0.75, metalness: 0.0,
      ...(side !== undefined && { side }),
    });
  }

  return new THREE.MeshBasicMaterial({ color, ...opts });
}

// ─── Canvas texture ───────────────────────────────────────────────────────────
export function canvasTex(size: number, draw: any) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

// ─── Toon outline (back-face technique) ───────────────────────────────────────
export function addOutline(group: any) {
  const outlineCfg = _style?.outline;
  if (outlineCfg?.enabled === false) return;

  const thickness = outlineCfg?.thickness ?? 0.025;
  const color     = outlineCfg?.color     ?? 0x111111;

  const outlineMat = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });

  // Collect first, then mutate — avoids infinite recursion inside traverse
  const meshes: any[] = [];
  group.traverse((child: any) => { if (child.isMesh) meshes.push(child); });

  meshes.forEach((child) => {
    child.geometry.computeBoundingSphere();
    const outline = new THREE.Mesh(child.geometry, outlineMat);
    outline.scale.setScalar(
      1 + thickness / Math.max(child.geometry.boundingSphere.radius, 0.1)
    );
    outline.castShadow = false;
    child.add(outline);
  });
}
