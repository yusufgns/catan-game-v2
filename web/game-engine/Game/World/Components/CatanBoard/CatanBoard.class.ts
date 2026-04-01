import * as THREE from 'three';
import { getGameContext } from '../../../GameContext';
import { BEGINNER_BOARD as BOARD_DATA, HARBORS, hexToPixel, hexCornersArray, HARBOR_RESOURCE_COLOR } from '../../../../game-logic/hexGrid';
import { buildBoardGraph, BOARD_HEX_SIZE } from '../../../../game-logic/boardGraph';
import { createSettlement3D, createCity3D, createRoad3D, createRoadNode3D, createRobber3D } from './CatanPieces';
import { createShip } from '../../../../models/ship';

/**
 * Catan hex board — thick colorful hex tiles with low-poly decorations.
 * Includes board graph for intersection/edge placement of game pieces.
 */

// ─── Hex shape ─────────────────────────────────────────────────────────────────
function makeHexShape(radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    if (i === 0) shape.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    else shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  shape.closePath();
  return shape;
}

function hexToWorld(q: number, r: number, size: number): number[] {
  return [
    size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r),
    0,
    size * (3 / 2) * r,
  ];
}

// ─── Colors (bold, saturated — mobile game style) ──────────────────────────────
const C = {
  // Terrain base colors
  forest:    0x4cb648, pasture:   0x7acc4a, fields:    0xdaa520,
  hills:     0xd4734a, mountains: 0x8a9aaa, desert:    0xe8c868,
  ocean:     0x4a98d8,
  // Hex side wall (darker)
  forestSide: 0x3a8a38, pastureSide: 0x5aaa38, fieldsSide: 0xb08820,
  hillsSide:  0xb85a38, mountainsSide: 0x687888, desertSide: 0xc8a848,
  oceanSide:  0x3878a8,
  // Decoration
  trunk:  0x8b6b3c, leaf:   0x2d8a2d, leafDark: 0x1e6b1e,
  leafRound: 0x3aaa3a, leafRoundDark: 0x288a28,
  wool:   0xf5f0e8, sheepDark: 0x6a5a4a, sheepSkin: 0xe8d0b8,
  brick:  0xc84a2a, brickLight: 0xd86040, mortar: 0xe8d4b8,
  rock:   0x7a8a9a, rockDark: 0x5a6a7a, snow: 0xe8e8f0,
  sand:   0xe8cc78, fence: 0x9a7a50,
  wheat:  0xe8b830, wheatDark: 0xc89820,
  crystal: 0x5588cc,
  wood:   0x7a5a30, woodDark: 0x5a3a1a,
  frame:  0xc4a868, frameSide: 0xa08848,
  number: 0xf5ecd0,
};

// Board data imported from game-logic/hexGrid.js as this.boardData

// ─── Component ─────────────────────────────────────────────────────────────────

export default class CatanBoard {
  [key: string]: any;
  game: any;
  scene: any;
  S: number;
  COORD_SCALE: number;
  group: THREE.Group;
  graph: any;
  dicePosition: THREE.Group;
  piecesGroup: THREE.Group;
  markersGroup: THREE.Group;
  intersectionMeshes: Map<string, any>;
  edgeMeshes: Map<string, any>;
  hexMarkers: Map<string, any>;
  robberGroup: THREE.Group | null;
  _robberMesh: THREE.Group | null;

  boardData: any[];

  constructor({ position = [0, 0.08, 0], hexSize = 1.2, boardData }: { position?: number[]; hexSize?: number; boardData?: any[] } = {}) {
    this.game  = getGameContext();
    this.scene = this.game.scene;
    this.S = hexSize;
    this.boardData = boardData || BOARD_DATA;

    // Coordinate scale: 2D pixel coords → 3D world coords
    this.COORD_SCALE = hexSize / BOARD_HEX_SIZE;

    this.group = new THREE.Group();
    this.group.position.set(...(position as [number, number, number]));
    this.scene.add(this.group);

    // Build board graph (intersections & edges for game piece placement)
    this.graph = buildBoardGraph(this.boardData);

    // Dice position marker
    this.dicePosition = new THREE.Group();
    this.dicePosition.position.set(0, 0.5, 0);
    this.group.add(this.dicePosition);

    const dicePlatform = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.45, 0.06, 8),
      new THREE.MeshStandardMaterial({ color: C.frame, roughness: 0.8 })
    );
    dicePlatform.position.set(0, 0.35, 0);
    dicePlatform.castShadow = true;
    this.group.add(dicePlatform);

    // Game piece containers
    this.piecesGroup = new THREE.Group();
    this.group.add(this.piecesGroup);

    this.markersGroup = new THREE.Group();
    this.group.add(this.markersGroup);

    this._build();
    this._buildHarbors();
    this._buildIntersectionMarkers();
    this._buildEdgeMarkers();
    this._buildHexMarkers();
  }

  /** Convert a board graph intersection position to 3D [x, y, z] */
  interTo3D(x2d: number, y2d: number): number[] {
    return [x2d * this.COORD_SCALE, 0.02, y2d * this.COORD_SCALE];
  }

  /** Convert a board graph edge midpoint to 3D + rotation */
  edgeTo3D(x1: number, y1: number, x2: number, y2: number) {
    const mx = ((x1 + x2) / 2) * this.COORD_SCALE;
    const mz = ((y1 + y2) / 2) * this.COORD_SCALE;
    const dx = (x2 - x1) * this.COORD_SCALE;
    const dz = (y2 - y1) * this.COORD_SCALE;
    return {
      pos: [mx, 0.02, mz],
      rotY: -Math.atan2(dz, dx),
    };
  }

  // ── Thick hex tile (top + side wall) ─────────────────────────────────────
  _makeHex(topColor: number, sideColor: number, radius: number, height: number) {
    const g = new THREE.Group();
    const r = radius, h = height;

    // Top face
    const topGeo = new THREE.ExtrudeGeometry(makeHexShape(r), {
      depth: 0.02, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2,
    });
    const top = new THREE.Mesh(topGeo, new THREE.MeshStandardMaterial({
      color: topColor, roughness: 0.75, metalness: 0.0,
    }));
    top.rotation.x = -Math.PI / 2;
    top.position.y = h;
    top.castShadow = true;
    top.receiveShadow = true;
    g.add(top);

    // Side wall (cylinder approximation with hex cross-section)
    const sideGeo = new THREE.ExtrudeGeometry(makeHexShape(r), {
      depth: h, bevelEnabled: false,
    });
    const side = new THREE.Mesh(sideGeo, new THREE.MeshStandardMaterial({
      color: sideColor, roughness: 0.82, metalness: 0.0,
    }));
    side.rotation.x = -Math.PI / 2;
    side.position.y = 0;
    side.castShadow = true;
    side.receiveShadow = true;
    g.add(side);

    return g;
  }

  // ── Number token (canvas texture disc) ───────────────────────────────────
  _makeToken(number: number) {
    const SIZE = 256, cx = SIZE / 2, cy = SIZE / 2, rad = SIZE / 2 - 8;
    const isHot = number === 6 || number === 8;
    const c = document.createElement('canvas');
    c.width = c.height = SIZE;
    const ctx = c.getContext('2d')!;

    // Background
    ctx.fillStyle = '#f5ecd0';
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();

    // Border
    ctx.strokeStyle = isHot ? '#dc2626' : '#5a3a1a';
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(cx, cy, rad - 5, 0, Math.PI * 2); ctx.stroke();

    // Number — large and bold
    ctx.fillStyle = isHot ? '#dc2626' : '#2a1a0f';
    ctx.font = `900 ${String(number).length > 1 ? 110 : 130}px Arial, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(number), cx, cy - 10);

    // Pips
    const pips = { 2:1, 3:2, 4:3, 5:4, 6:5, 8:5, 9:4, 10:3, 11:2, 12:1 }[number] || 0;
    const sp = 20, startX = cx - ((pips - 1) * sp) / 2;
    ctx.fillStyle = isHot ? '#dc2626' : '#2a1a0f';
    for (let i = 0; i < pips; i++) {
      ctx.beginPath(); ctx.arc(startX + i * sp, cy + 58, 8, 0, Math.PI * 2); ctx.fill();
    }

    const tex = new THREE.CanvasTexture(c);
    const tokenR = 0.30;

    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(tokenR, 32),
      new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.55,
        emissive: 0xf5ecd0,
        emissiveIntensity: 0.15,
        emissiveMap: tex,
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── TERRAIN DECORATIONS (low-poly, bold, chunky) ─────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  _addForest(g: THREE.Group, y: number) {
    const s = this.S;
    const trunkMat = new THREE.MeshStandardMaterial({ color: C.trunk, roughness: 0.9 });
    const leafMat1 = new THREE.MeshStandardMaterial({ color: C.leafRound, roughness: 0.8 });
    const leafMat2 = new THREE.MeshStandardMaterial({ color: C.leafRoundDark, roughness: 0.8 });
    const woodMat  = new THREE.MeshStandardMaterial({ color: C.wood, roughness: 0.85 });

    // Round-top trees (like the reference image)
    const trees = [[0.05, 0.1], [-0.45, 0.2], [0.4, -0.2], [-0.2, -0.4], [0.3, 0.35]];
    trees.forEach(([dx, dz], i) => {
      const scale = 0.7 + Math.random() * 0.4;
      const px = dx * s * 0.75, pz = dz * s * 0.75;

      // Trunk
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03 * s, 0.04 * s, 0.25 * s * scale, 6), trunkMat
      );
      trunk.position.set(px, y + 0.125 * s * scale, pz);
      trunk.castShadow = true;
      g.add(trunk);

      // Round canopy (sphere, not cone)
      const canopy = new THREE.Mesh(
        new THREE.SphereGeometry(0.16 * s * scale, 7, 5), i % 2 === 0 ? leafMat1 : leafMat2
      );
      canopy.position.set(px, y + 0.32 * s * scale, pz);
      canopy.castShadow = true;
      g.add(canopy);
    });

    // Log pile
    const logGeo = new THREE.CylinderGeometry(0.03 * s, 0.03 * s, 0.18 * s, 5);
    [[-0.3, -0.15, 0], [-0.3, -0.15, 0.06]].forEach(([dx, dz, dy]) => {
      const log = new THREE.Mesh(logGeo, woodMat);
      log.position.set(dx * s * 0.7, y + 0.03 * s + dy * s, dz * s * 0.7);
      log.rotation.z = Math.PI / 2;
      log.castShadow = true;
      g.add(log);
    });
  }

  _addPasture(g: THREE.Group, y: number) {
    const s = this.S;
    const woolMat = new THREE.MeshStandardMaterial({ color: C.wool, roughness: 0.95 });
    const darkMat = new THREE.MeshStandardMaterial({ color: C.sheepDark, roughness: 0.9 });
    const skinMat = new THREE.MeshStandardMaterial({ color: C.sheepSkin, roughness: 0.85 });
    const fenceMat = new THREE.MeshStandardMaterial({ color: C.fence, roughness: 0.88 });
    const rockMat = new THREE.MeshStandardMaterial({ color: C.rockDark, roughness: 0.8 });

    // Fluffy sheep (2-3)
    [[-0.15, 0.1], [0.2, -0.25]].forEach(([dx, dz]) => {
      const px = dx * s * 0.7, pz = dz * s * 0.7;
      // Body (fluffy sphere)
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.10 * s, 8, 6), woolMat);
      body.position.set(px, y + 0.10 * s, pz);
      body.scale.set(1.2, 0.9, 1.0);
      body.castShadow = true;
      g.add(body);
      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.05 * s, 6, 4), skinMat);
      head.position.set(px + 0.10 * s, y + 0.10 * s, pz);
      g.add(head);
      // Legs (4 tiny cylinders)
      [[-0.04, 0.04], [-0.04, -0.04], [0.04, 0.04], [0.04, -0.04]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012 * s, 0.012 * s, 0.07 * s, 4), darkMat);
        leg.position.set(px + lx * s, y + 0.03 * s, pz + lz * s);
        g.add(leg);
      });
    });

    // Fence sections
    const postGeo = new THREE.CylinderGeometry(0.015 * s, 0.02 * s, 0.16 * s, 5);
    const railGeo = new THREE.BoxGeometry(0.30 * s, 0.012 * s, 0.012 * s);
    [[-0.5, 0.35], [0.4, -0.45]].forEach(([fx, fz]) => {
      for (let i = 0; i < 3; i++) {
        const post = new THREE.Mesh(postGeo, fenceMat);
        post.position.set((fx + i * 0.12) * s * 0.7, y + 0.08 * s, fz * s * 0.7);
        post.castShadow = true;
        g.add(post);
      }
      const rail = new THREE.Mesh(railGeo, fenceMat);
      rail.position.set((fx + 0.12) * s * 0.7, y + 0.12 * s, fz * s * 0.7);
      g.add(rail);
    });

    // A few rocks
    [[0.4, 0.2], [-0.35, -0.3]].forEach(([rx, rz]) => {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.06 * s, 0), rockMat);
      rock.position.set(rx * s * 0.7, y + 0.04 * s, rz * s * 0.7);
      rock.scale.y = 0.6;
      rock.castShadow = true;
      g.add(rock);
    });
  }

  _addFields(g: THREE.Group, y: number) {
    const s = this.S;

    // Premium wheat palette
    const grainHeadMat = new THREE.MeshStandardMaterial({
      color: 0xf7e1a3, roughness: 0.65, metalness: 0.0,
    });
    const stalkMat = new THREE.MeshStandardMaterial({
      color: 0xb8a040, roughness: 0.82,
    });
    const stalkLightMat = new THREE.MeshStandardMaterial({
      color: 0xc8b050, roughness: 0.80,
    });

    // Shared geometries
    const stalkGeo = new THREE.CylinderGeometry(0.006 * s, 0.010 * s, 1, 5); // unit height, scaled per instance
    const grainGeo = new THREE.SphereGeometry(0.028 * s, 6, 5);

    // Scatter ~35 wheat stalks randomly within hex radius
    const count = 35;
    const maxR = s * 0.55; // stay within hex

    for (let i = 0; i < count; i++) {
      // Random position within hex (reject if outside hex boundary)
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * maxR; // sqrt for uniform distribution
      const wx = Math.cos(angle) * dist;
      const wz = Math.sin(angle) * dist;

      // Random height variation
      const stalkH = (0.16 + Math.random() * 0.10) * s;
      const lean = (Math.random() - 0.5) * 0.18; // slight lean
      const leanX = (Math.random() - 0.5) * 0.10;

      // Stalk
      const stalk = new THREE.Mesh(stalkGeo, i % 3 === 0 ? stalkLightMat : stalkMat);
      stalk.scale.y = stalkH;
      stalk.position.set(wx, y + stalkH * 0.5, wz);
      stalk.rotation.z = lean;
      stalk.rotation.x = leanX;
      stalk.castShadow = true;
      g.add(stalk);

      // Grain head — plump oval at top of stalk
      const head = new THREE.Mesh(grainGeo, grainHeadMat);
      const headY = y + stalkH + 0.01 * s;
      head.position.set(
        wx + Math.sin(lean) * stalkH * 0.15,
        headY,
        wz + Math.sin(leanX) * stalkH * 0.15
      );
      head.scale.set(1.0, 1.6, 1.0); // oval, taller than wide
      head.castShadow = true;
      g.add(head);
    }

    // A few scattered grain on the ground (fallen seeds)
    const seedMat = new THREE.MeshStandardMaterial({ color: 0xe8c850, roughness: 0.8 });
    for (let i = 0; i < 5; i++) {
      const seed = new THREE.Mesh(new THREE.SphereGeometry(0.012 * s, 4, 3), seedMat);
      seed.position.set(
        (Math.random() - 0.5) * s * 0.6,
        y + 0.01 * s,
        (Math.random() - 0.5) * s * 0.6
      );
      seed.scale.set(1, 0.5, 0.8);
      g.add(seed);
    }
  }

  _addHills(g: THREE.Group, y: number) {
    const s = this.S;
    const brickMat = new THREE.MeshStandardMaterial({ color: C.brick, roughness: 0.75 });
    const brickLMat = new THREE.MeshStandardMaterial({ color: C.brickLight, roughness: 0.78 });
    const mortarMat = new THREE.MeshStandardMaterial({ color: C.mortar, roughness: 0.9 });

    // Brick kiln (dome)
    const kiln = new THREE.Mesh(new THREE.SphereGeometry(0.14 * s, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), brickMat);
    kiln.position.set(0.05 * s, y, -0.05 * s);
    kiln.castShadow = true;
    g.add(kiln);

    // Kiln chimney
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * s, 0.04 * s, 0.10 * s, 6), brickMat);
    chimney.position.set(0.05 * s, y + 0.14 * s, -0.05 * s);
    chimney.castShadow = true;
    g.add(chimney);

    // Brick stacks
    const brickGeo = new THREE.BoxGeometry(0.10 * s, 0.035 * s, 0.05 * s);
    [[-0.35, 0.2, 0], [-0.30, 0.2, 0.04], [-0.32, 0.2, -0.08],
     [0.30, -0.25, 0], [0.25, -0.25, 0.05], [-0.15, -0.35, 0]].forEach(([bx, bz, by], i) => {
      const brick = new THREE.Mesh(brickGeo, i % 2 === 0 ? brickMat : brickLMat);
      brick.position.set(bx * s * 0.7, y + 0.018 * s + (by || 0) * s, bz * s * 0.7);
      brick.rotation.y = Math.random() * 0.5;
      brick.castShadow = true;
      g.add(brick);
    });
  }

  _addMountains(g: THREE.Group, y: number) {
    const s = this.S;
    const rockMat = new THREE.MeshStandardMaterial({ color: C.rock, roughness: 0.7 });
    const rockDMat = new THREE.MeshStandardMaterial({ color: C.rockDark, roughness: 0.7 });
    const snowMat = new THREE.MeshStandardMaterial({ color: C.snow, roughness: 0.5, emissive: 0xddddee, emissiveIntensity: 0.05 });

    // Big peak
    const peak = new THREE.Mesh(new THREE.ConeGeometry(0.22 * s, 0.50 * s, 6), rockMat);
    peak.position.set(0, y + 0.25 * s, 0);
    peak.castShadow = true;
    g.add(peak);

    // Snow cap
    const snow = new THREE.Mesh(new THREE.ConeGeometry(0.10 * s, 0.12 * s, 6), snowMat);
    snow.position.set(0, y + 0.44 * s, 0);
    g.add(snow);

    // Side rocks
    [[-0.3, 0.2, 0.3], [0.25, -0.15, 0.25], [-0.15, -0.3, 0.2]].forEach(([dx, dz, h]) => {
      const rock = new THREE.Mesh(new THREE.ConeGeometry(0.12 * s, h * s, 5), rockDMat);
      rock.position.set(dx * s * 0.7, y + h * s * 0.5, dz * s * 0.7);
      rock.rotation.y = Math.random() * Math.PI;
      rock.castShadow = true;
      g.add(rock);
    });

    // Small boulders
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = (0.4 + Math.random() * 0.2) * s * 0.7;
      const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.05 * s, 0), rockDMat);
      boulder.position.set(Math.cos(angle) * dist, y + 0.03 * s, Math.sin(angle) * dist);
      boulder.scale.y = 0.6;
      g.add(boulder);
    }
  }

  _addDesert(g: THREE.Group, y: number) {
    const s = this.S;
    const sandMat = new THREE.MeshStandardMaterial({ color: C.sand, roughness: 0.85 });
    const cactusMat = new THREE.MeshStandardMaterial({ color: 0x4a8a3a, roughness: 0.8 });

    // Sand dunes
    [[-0.2, 0.15, 0.22], [0.2, -0.15, 0.18], [0.0, 0.0, 0.25]].forEach(([dx, dz, r]) => {
      const dune = new THREE.Mesh(new THREE.SphereGeometry(r * s, 7, 4), sandMat);
      dune.position.set(dx * s * 0.7, y + 0.02, dz * s * 0.7);
      dune.scale.set(1.3, 0.2, 1.1);
      g.add(dune);
    });

    // Cactus
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * s, 0.03 * s, 0.22 * s, 6), cactusMat);
    trunk.position.set(0.25 * s * 0.7, y + 0.11 * s, 0.2 * s * 0.7);
    trunk.castShadow = true;
    g.add(trunk);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.018 * s, 0.02 * s, 0.10 * s, 5), cactusMat);
    arm.position.set(0.25 * s * 0.7 + 0.04 * s, y + 0.15 * s, 0.2 * s * 0.7);
    arm.rotation.z = Math.PI / 3;
    g.add(arm);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── BUILD BOARD ──────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  _build() {
    const s = this.S;
    const baseH = 0.28;      // sand base height
    const baseR = s * 1.0;   // sand base radius (covers intersection/edge areas)
    const tileH = 0.10;      // terrain tile height (thin, sits ON the base)
    const tileR = s * 0.86;  // terrain hex radius (smaller than base → shows sand edge)
    const GAP = 0.05;        // vertical gap between base top and terrain tile top

    // Base top Y = 0 (reference). Terrain sits at baseTopY + GAP - tileH
    const baseTopY = 0;
    const tileY = baseTopY + GAP;

    // ── Sand base hexes ───────────────────────────────────────────────────
    // Outer hexes get a larger base radius so edge settlements/roads
    // have ground beneath them. Inner hexes use normal baseR.
    const boardSet = new Set(this.boardData.map(h => `${h.q},${h.r}`));
    const DIRS = [[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]];

    this.boardData.forEach((hex) => {
      const [x, , z] = hexToWorld(hex.q, hex.r, s);
      const neighborCount = DIRS.filter(([dq, dr]) =>
        boardSet.has(`${hex.q + dq},${hex.r + dr}`)
      ).length;
      // Outer hex (has at least one missing neighbor) → bigger base
      const isEdge = neighborCount < 6;
      const r = isEdge ? baseR * 1.16 : baseR;
      const base = this._makeHex(C.frame, C.frameSide, r, baseH);
      base.position.set(x, baseTopY - baseH, z);
      this.group.add(base);
    });

    // ── Land terrain hexes (on top of base, only 0.05 above) ─────────────
    this.boardData.forEach((hex) => {
      const [x, , z] = hexToWorld(hex.q, hex.r, s);

      const topC = C[hex.type] || C.desert;
      const sideC = C[hex.type + 'Side'] || C.desertSide;

      const tile = this._makeHex(topC, sideC, tileR, tileH);
      tile.position.set(x, tileY, z);

      // Tag all meshes in tile with hexKey for raycaster robber click
      const hexKey = `${hex.q},${hex.r}`;
      tile.traverse((child: any) => { if (child.isMesh) child.userData.hexKey = hexKey; });

      const rot = Math.floor(Math.random() * 6) * (Math.PI / 3);
      tile.rotation.y = rot;
      this.group.add(tile);

      // Terrain decorations
      const decoY = tileH + 0.02;
      const decoGroup = new THREE.Group();
      decoGroup.rotation.y = rot;
      decoGroup.position.set(x, tileY, z);

      switch (hex.type) {
        case 'forest':    this._addForest(decoGroup, decoY);    break;
        case 'pasture':   this._addPasture(decoGroup, decoY);   break;
        case 'fields':    this._addFields(decoGroup, decoY);    break;
        case 'hills':     this._addHills(decoGroup, decoY);     break;
        case 'mountains': this._addMountains(decoGroup, decoY); break;
        case 'desert':    this._addDesert(decoGroup, decoY);    break;
      }
      this.group.add(decoGroup);

      // Number token — positioned at bottom of hex (toward camera, +z direction)
      if (hex.number != null) {
        const token = this._makeToken(hex.number);
        token.position.set(x, tileY + tileH + 0.08, z + tileR * 0.75);
        this.group.add(token);
      }
    });
  }

  // ── Harbors — ships + dock planks + trade ratio labels ────────────────
  _buildHarbors() {
    const s = this.S;
    const CS = this.COORD_SCALE;

    const woodMat = new THREE.MeshStandardMaterial({ color: C.wood, roughness: 0.85 });
    const woodDarkMat = new THREE.MeshStandardMaterial({ color: C.woodDark, roughness: 0.9 });

    for (const harbor of HARBORS) {
      // Get ocean hex pixel center and its 6 corners
      const oceanPx = hexToPixel(harbor.q, harbor.r, BOARD_HEX_SIZE);
      const corners = hexCornersArray(oceanPx.x, oceanPx.y, BOARD_HEX_SIZE);
      const c1 = corners[harbor.edge];
      const c2 = corners[(harbor.edge + 1) % 6];

      // Edge midpoint in 2D pixel coords
      const emx = (c1.x + c2.x) / 2;
      const emy = (c1.y + c2.y) / 2;

      // Direction from edge midpoint toward ocean center (normalized)
      const dx = oceanPx.x - emx;
      const dy = oceanPx.y - emy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const nx = dx / dist;
      const ny = dy / dist;

      // Ship position: fixed offset from edge midpoint into ocean (consistent for all harbors)
      const shipOffset = BOARD_HEX_SIZE * 0.65;
      const shipPx = emx + nx * shipOffset;
      const shipPy = emy + ny * shipOffset;

      // Convert to 3D world coords
      const shipX = shipPx * CS;
      const shipZ = shipPy * CS;
      const shipY = 0.08;

      // Ship rotation: face the bow toward land (away from ocean center)
      const rotY = Math.atan2(-nx * CS, -ny * CS);

      // Create and place ship
      const ship = createShip();
      const shipScale = s * 0.38;
      ship.scale.set(shipScale, shipScale, shipScale);
      ship.position.set(shipX, shipY, shipZ);
      ship.rotation.y = rotY;
      this.group.add(ship);

      // ── Dock planks — start near settlement corners, end near ship ──
      const cornerPositions = [c1, c2];
      for (const corner of cornerPositions) {
        // Pull start slightly toward midpoint (wider V angle) + push outward toward ocean
        const insetPx = corner.x + (emx - corner.x) * 0.2;
        const insetPy = corner.y + (emy - corner.y) * 0.2;
        // Start further inland so dock embeds into sand base
        const startPx = insetPx - nx * BOARD_HEX_SIZE * 0.08;
        const startPy = insetPy - ny * BOARD_HEX_SIZE * 0.08;
        const startX = startPx * CS;
        const startZ = startPy * CS;

        // Dock end: stop short of ship (gap between dock and ship)
        const endX = startX + (shipX - startX) * 0.7;
        const endZ = startZ + (shipZ - startZ) * 0.7;

        const dockDx = endX - startX;
        const dockDz = endZ - startZ;
        const dockLen = Math.sqrt(dockDx * dockDx + dockDz * dockDz);
        const dockMidX = (startX + endX) / 2;
        const dockMidZ = (startZ + endZ) / 2;
        const dockRotY = -Math.atan2(dockDz, dockDx);

        const plank = new THREE.Mesh(
          new THREE.BoxGeometry(dockLen, 0.06, 0.12),
          woodMat
        );
        // Lower Y so dock embeds into the sand base
        plank.position.set(dockMidX, -0.02, dockMidZ);
        plank.rotation.y = dockRotY;
        plank.castShadow = true;
        this.group.add(plank);

        // Railing posts along dock
        const postCount = Math.max(2, Math.floor(dockLen / 0.6));
        for (let i = 0; i < postCount; i++) {
          const t = (i + 0.5) / postCount;
          const px = startX + dockDx * t;
          const pz = startZ + dockDz * t;
          const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.025, 0.18, 5),
            woodDarkMat
          );
          post.position.set(px, -0.02, pz);
          post.castShadow = true;
          this.group.add(post);
        }
      }

      // ── Trade ratio label ────────────
      const label = this._makeHarborLabel(harbor.type, (harbor as any).resource);
      label.position.set(shipX, shipY + shipScale * 1.8, shipZ);
      this.group.add(label);
    }
  }

  /** Create a harbor label as a Sprite (always faces camera) */
  _makeHarborLabel(type: string, resource?: string): THREE.Sprite {
    const SIZE = 256, cx = SIZE / 2, cy = SIZE / 2, rad = SIZE / 2 - 8;
    const c = document.createElement('canvas');
    c.width = c.height = SIZE;
    const ctx = c.getContext('2d')!;

    const is2to1 = type === '2:1';
    const resColor = resource ? (HARBOR_RESOURCE_COLOR as any)[resource] || '#94a3b8' : null;

    // Background
    ctx.fillStyle = is2to1 ? '#fef3c7' : '#f0f0f0';
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();

    // Colored ring for 2:1 resource harbors, gray for 3:1
    ctx.strokeStyle = is2to1 && resColor ? resColor : '#6b7280';
    ctx.lineWidth = 14;
    ctx.beginPath(); ctx.arc(cx, cy, rad - 7, 0, Math.PI * 2); ctx.stroke();

    // Label text: 2:1 shows ratio, 3:1 shows "?"
    ctx.fillStyle = '#1a1a2e';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (is2to1) {
      ctx.font = '900 80px Arial, sans-serif';
      ctx.fillText('2:1', cx, cy - 10);
      // Resource color dot
      if (resColor) {
        ctx.fillStyle = resColor;
        ctx.beginPath(); ctx.arc(cx, cy + 50, 24, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, cy + 50, 24, 0, Math.PI * 2); ctx.stroke();
      }
    } else {
      ctx.font = '900 120px Arial, sans-serif';
      ctx.fillText('?', cx, cy + 5);
      // Small ratio underneath
      ctx.font = '700 50px Arial, sans-serif';
      ctx.fillStyle = '#6b7280';
      ctx.fillText('3:1', cx, cy + 65);
    }

    const tex = new THREE.CanvasTexture(c);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, depthTest: false })
    );
    sprite.scale.set(0.5, 0.5, 1);
    return sprite;
  }

  // ── Intersection markers (ghost silhouette settlement/city models)
  _buildIntersectionMarkers() {
    this.intersectionMeshes = new Map();

    for (const [id, inter] of this.graph.intersections) {
      const [x, y, z] = this.interTo3D(inter.x, inter.y);

      const group = new THREE.Group();
      group.position.set(x, y + this.nodeTopOffset, z);

      // Create both settlement and city ghosts, toggle visibility as needed
      const settlement = createSettlement3D('#ffffff', this.pieceScale);
      this._applyGhostMat(settlement);
      settlement.name = 'ghost-settlement';
      group.add(settlement);

      const city = createCity3D('#ffffff', this.pieceScale * 0.85);
      this._applyGhostMat(city);
      city.name = 'ghost-city';
      city.visible = false;
      group.add(city);

      group.userData = {
        type: 'intersection', id,
        defaultOpacity: 0.35,
        hoverOpacity: 0.7,
        isHovered: false,
        ghostType: 'settlement',
      };
      group.visible = false;
      this.markersGroup.add(group);
      this.intersectionMeshes.set(id, group);
    }
  }

  /** Apply ghost (silhouette) material to all meshes in a 3D object */
  _applyGhostMat(obj: THREE.Object3D) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff, transparent: true, opacity: 0.35,
      roughness: 0.6, metalness: 0.0,
      emissive: 0xffffff, emissiveIntensity: 0.2,
    });
    obj.traverse((child: any) => {
      if (child.isMesh) {
        child.material = mat.clone();
        child.castShadow = false;
      }
    });
  }

  // ── Edge markers (ghost silhouette road models) ─────────────────────────
  _buildEdgeMarkers() {
    this.edgeMeshes = new Map();

    for (const [id, edge] of this.graph.edges) {
      const intA = this.graph.intersections.get(edge.intersections[0]);
      const intB = this.graph.intersections.get(edge.intersections[1]);
      if (!intA || !intB) continue;

      const { pos, rotY } = this.edgeTo3D(intA.x, intA.y, intB.x, intB.y);

      const RS = this.pieceScale;
      const road = createRoad3D('#ffffff', 3.15, [RS + 0.02, RS, RS]);
      this._applyGhostMat(road);

      const group = new THREE.Group();
      group.position.set(pos[0], pos[1], pos[2]);
      group.rotation.y = rotY;
      group.add(road);

      group.userData = {
        type: 'edge', id,
        defaultOpacity: 0.35,
        hoverOpacity: 0.7,
      };
      group.visible = false;
      this.markersGroup.add(group);
      this.edgeMeshes.set(id, group);
    }
  }

  /** Set opacity on all meshes within a marker group */
  _setMarkerOpacity(group: any, opacity: number) {
    group.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.opacity = opacity;
      }
    });
  }

  /** Show intersection markers for valid placement positions */
  showIntersections(validIds: Map<string, 'settlement' | 'city'> | Set<string>, hoverOnly = false) {
    for (const [id, group] of this.intersectionMeshes) {
      const isMap = validIds instanceof Map;
      const show = isMap ? validIds.has(id) : (validIds as Set<string>).has(id);
      group.visible = show;
      group.userData.hoverOnly = hoverOnly;
      if (show) {
        // Toggle settlement/city ghost visibility
        const ghostType = isMap ? validIds.get(id) : 'settlement';
        group.userData.ghostType = ghostType;
        const settlementGhost = group.getObjectByName('ghost-settlement');
        const cityGhost = group.getObjectByName('ghost-city');
        if (settlementGhost) settlementGhost.visible = ghostType === 'settlement';
        if (cityGhost) cityGhost.visible = ghostType === 'city';

        this._setMarkerOpacity(group, hoverOnly ? 0 : group.userData.defaultOpacity);
      }
    }
  }

  /** Show edge markers for valid road placement */
  showEdges(validIds: Set<string>, hoverOnly = false) {
    for (const [id, group] of this.edgeMeshes) {
      const show = validIds.has(id);
      group.visible = show;
      group.userData.hoverOnly = hoverOnly;
      if (show) {
        this._setMarkerOpacity(group, hoverOnly ? 0 : group.userData.defaultOpacity);
      }
    }
  }

  // ── Hex markers (robber placement — floating circles on each hex) ──────
  _buildHexMarkers() {
    this.hexMarkers = new Map();

    const ringGeo = new THREE.TorusGeometry(0.32, 0.04, 16, 32);
    const diskGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.01, 32);

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, transparent: true, opacity: 0.0, roughness: 0.3, metalness: 0.2,
      emissive: 0xffffff, emissiveIntensity: 0.5,
    });
    const diskMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, transparent: true, opacity: 0.0, roughness: 0.5, metalness: 0.0,
    });

    for (const hex of this.boardData) {
      if (hex.type === 'ocean') continue;
      const hexKey = `${hex.q},${hex.r}`;
      const [x, , z] = hexToWorld(hex.q, hex.r, this.S);

      const group = new THREE.Group();
      group.position.set(x - this.S * 0.92 * 0.65, 0.3, z); // same offset as robber

      // Outer ring
      const ring = new THREE.Mesh(ringGeo, ringMat.clone());
      ring.rotation.x = -Math.PI / 2;
      group.add(ring);

      // Inner fill
      const disk = new THREE.Mesh(diskGeo, diskMat.clone());
      group.add(disk);

      group.userData = {
        type: 'hexMarker', id: hexKey,
        defaultOpacity: 0.6,
        hoverOpacity: 1.0,
      };
      group.visible = false;
      this.markersGroup.add(group);
      this.hexMarkers.set(hexKey, group);
    }
  }

  /** Show hex markers for robber placement (all hexes except current robber position) */
  showHexMarkers(robberHex: string) {
    for (const [hexKey, group] of this.hexMarkers) {
      const show = hexKey !== robberHex;
      group.visible = show;
      if (show) this._setMarkerOpacity(group, group.userData.defaultOpacity);
    }
  }

  /** Hide all hex markers */
  hideHexMarkers() {
    for (const g of this.hexMarkers.values()) g.visible = false;
  }

  /** Hide all markers */
  hideAllMarkers() {
    for (const g of this.intersectionMeshes.values()) g.visible = false;
    for (const g of this.edgeMeshes.values()) g.visible = false;
    this.hideHexMarkers();
  }

  /** Piece scale — proportional to hex size (web uses 0.32 at hexSize 1.6) */
  get pieceScale() { return this.S * 0.20; }

  /** Y offset for settlement/city sitting on top of road node platform */
  get nodeTopOffset() { return 0.12 * this.pieceScale; }

  /** Place a settlement piece at an intersection (sits on road node) */
  placeSettlement(intId: string, color: string) {
    const inter = this.graph.intersections.get(intId);
    if (!inter) return;
    const [x, y, z] = this.interTo3D(inter.x, inter.y);

    const piece = createSettlement3D(color, this.pieceScale);
    piece.userData.pieceType = 'settlement';
    piece.userData.intId = intId;
    piece.position.set(x, y + this.nodeTopOffset, z);
    this.piecesGroup.add(piece);
    return piece;
  }

  /** Find the placed settlement piece at an intersection */
  findSettlementAt(intId: string): THREE.Object3D | null {
    for (const child of this.piecesGroup.children) {
      if (child.userData.pieceType === 'settlement' && child.userData.intId === intId) return child;
    }
    return null;
  }

  /** Place a city piece at an intersection (sits on road node) */
  placeCity(intId: string, color: string) {
    const inter = this.graph.intersections.get(intId);
    if (!inter) return;
    const [x, y, z] = this.interTo3D(inter.x, inter.y);

    const piece = createCity3D(color, this.pieceScale * 0.85);
    piece.position.set(x, y + this.nodeTopOffset, z);
    this.piecesGroup.add(piece);
    return piece;
  }

  /** Place a road piece along an edge — uses default length, scaled proportionally */
  placeRoad(edgeId: string, color: string) {
    const edge = this.graph.edges.get(edgeId);
    if (!edge) return;
    const intA = this.graph.intersections.get(edge.intersections[0]);
    const intB = this.graph.intersections.get(edge.intersections[1]);
    if (!intA || !intB) return;

    const { pos, rotY } = this.edgeTo3D(intA.x, intA.y, intB.x, intB.y);

    // Use default road length (3.15) with proportional scale
    // Scale X slightly larger so road fills the edge gap between nodes
    const RS = this.pieceScale;
    const piece = createRoad3D(color, 3.15, [RS + 0.02, RS, RS]);
    piece.position.set(...pos as [number, number, number]);
    piece.rotation.y = rotY;
    this.piecesGroup.add(piece);
    return piece;
  }

  /** Place a road node (junction platform) at an intersection */
  placeRoadNode(intId: string, playerColor: string, connectionAngles: number[], neutral = false) {
    const inter = this.graph.intersections.get(intId);
    if (!inter) return;
    const [x, y, z] = this.interTo3D(inter.x, inter.y);

    const piece = createRoadNode3D(playerColor, connectionAngles, neutral, this.pieceScale);
    piece.position.set(x, y, z);
    this.piecesGroup.add(piece);
    return piece;
  }

  /** Place or move the robber to a hex tile — centered on hex, elevated above decorations */
  placeRobber(hexKey: string, active = false) {
    // Remove existing robber
    if (this._robberMesh) {
      this.group.remove(this._robberMesh);
      this._robberMesh = null;
    }

    const [qStr, rStr] = hexKey.split(',');
    const q = parseInt(qStr), r = parseInt(rStr);
    const [x, , z] = hexToWorld(q, r, this.S);

    const tileR = this.S * 0.92;
    const robber = createRobber3D(active, this.pieceScale * 1.1);
    robber.position.set(x - tileR * 0.65, 0.25, z); // left side of hex
    this.group.add(robber);
    this._robberMesh = robber;
    return robber;
  }

  dispose() {
    this.scene.remove(this.group);
  }
}
