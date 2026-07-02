import * as THREE from 'three';
import { getGameContext } from '../../../GameContext';
import { BEGINNER_BOARD as BOARD_DATA, HARBORS, hexToPixel, hexCornersArray, HARBOR_RESOURCE_COLOR } from '../../../../game-logic/hexGrid';
import { buildBoardGraph, BOARD_HEX_SIZE } from '../../../../game-logic/boardGraph';
import { createSettlement3D, createCity3D, createRoad3D, createRoadNode3D, createRobber3D } from './CatanPieces';
import { createShip } from '../../../../models/ship';
import {
  ART, TERRAIN_BUILDERS, makeToken3D, makeRng,
  makeIntersectionRing, makeEdgeGlow, makeHexTargetRing, tagBaseOpacity,
} from './BoardArt';

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

// ─── Colors — warm storybook island (see BoardArt.ART for prop colors) ─────────
const C = {
  forest:    ART.forest,    pasture:   ART.pasture,   fields:  ART.fields,
  hills:     ART.hills,     mountains: ART.mountains, desert:  ART.desert,
  ocean:     0x3a90d8,
  forestSide: ART.forestSide, pastureSide: ART.pastureSide, fieldsSide: ART.fieldsSide,
  hillsSide:  ART.hillsSide,  mountainsSide: ART.mountainsSide, desertSide: ART.desertSide,
  oceanSide:  0x2870a0,
  wood:   0x7a5a30, woodDark: 0x5a3a1a,
  frame:  ART.sandTop, frameSide: ART.sandSide,
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

    // (dice roll onto the board freely — no floating platform)

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
  _makeHex(topColor: number, sideColor: number, radius: number, height: number, tintSeed = 0) {
    const g = new THREE.Group();
    const r = radius, h = height;

    // Per-hex tint jitter so identical terrains don't look copy-pasted
    const rnd = makeRng(tintSeed * 7919 + 13);
    const jitter = tintSeed === 0 ? 1 : 0.96 + rnd() * 0.08;
    const top3 = new THREE.Color(topColor).multiplyScalar(jitter);
    const side3 = new THREE.Color(sideColor).multiplyScalar(jitter);

    // Top face
    const topGeo = new THREE.ExtrudeGeometry(makeHexShape(r), {
      depth: 0.02, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2,
    });
    const top = new THREE.Mesh(topGeo, new THREE.MeshStandardMaterial({
      color: top3, roughness: 0.82, metalness: 0.0, flatShading: true,
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
      color: side3, roughness: 0.85, metalness: 0.0, flatShading: true,
    }));
    side.rotation.x = -Math.PI / 2;
    side.position.y = 0;
    side.castShadow = true;
    side.receiveShadow = true;
    g.add(side);

    return g;
  }

  // ── Number token — 3D disc from BoardArt ─────────────────────────────────
  _makeToken(number: number) {
    return makeToken3D(number);
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
    this.boardData.forEach((hex, hexIdx) => {
      const [x, , z] = hexToWorld(hex.q, hex.r, s);

      const topC = C[hex.type] || C.desert;
      const sideC = C[hex.type + 'Side'] || C.desertSide;

      // Deterministic per-hex seed (stable across rebuilds)
      const seed = (hex.q * 73856093) ^ (hex.r * 19349663) ^ (hexIdx + 1);
      const rnd = makeRng(seed);

      const tile = this._makeHex(topC, sideC, tileR, tileH, seed);
      tile.position.set(x, tileY, z);

      // Tag all meshes in tile with hexKey for raycaster robber click
      const hexKey = `${hex.q},${hex.r}`;
      tile.traverse((child: any) => { if (child.isMesh) child.userData.hexKey = hexKey; });

      const rot = Math.floor(rnd() * 6) * (Math.PI / 3);
      tile.rotation.y = rot;
      this.group.add(tile);

      // Terrain decorations — from-scratch BoardArt builders.
      // Deco group is NOT rotated: builders bias props away from the token
      // zone (+z, toward camera), rotation would break that.
      const decoY = tileH + 0.02;
      const decoGroup = new THREE.Group();
      decoGroup.position.set(x, tileY, z);

      const build = TERRAIN_BUILDERS[hex.type];
      if (build) build(decoGroup, decoY, s, seed);
      this.group.add(decoGroup);

      // Number token — sits ON the tile near the camera-facing edge
      if (hex.number != null) {
        const token = this._makeToken(hex.number);
        token.position.set(x, tileY + tileH + 0.02, z + tileR * 0.68);
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

  // ── Intersection markers — golden pulse ring + ghost piece on hover ─────
  _buildIntersectionMarkers() {
    this.intersectionMeshes = new Map();

    for (const [id, inter] of this.graph.intersections) {
      const [x, y, z] = this.interTo3D(inter.x, inter.y);

      const group = new THREE.Group();
      group.position.set(x, y + this.nodeTopOffset, z);

      // Glow ring — the always-visible "you can build here" cue
      const ring = makeIntersectionRing();
      group.add(ring);

      // Ghost pieces — only readable on hover (ghostOnly flag keeps them
      // faint in the resting state so the board stays clean)
      const settlement = createSettlement3D('#ffffff', this.pieceScale);
      this._applyGhostMat(settlement, 0.55);
      settlement.name = 'ghost-settlement';
      group.add(settlement);

      const city = createCity3D('#ffffff', this.pieceScale * 0.85);
      this._applyGhostMat(city, 0.55);
      city.name = 'ghost-city';
      city.visible = false;
      group.add(city);

      tagBaseOpacity(group);

      group.userData = {
        type: 'intersection', id,
        defaultOpacity: 0.55,
        hoverOpacity: 1.0,
        isHovered: false,
        ghostType: 'settlement',
      };
      group.visible = false;
      this.markersGroup.add(group);
      this.intersectionMeshes.set(id, group);
    }
  }

  /** Apply ghost (silhouette) material to all meshes in a 3D object */
  _applyGhostMat(obj: THREE.Object3D, baseOpacity = 0.35) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xfff2cc, transparent: true, opacity: baseOpacity,
      roughness: 0.6, metalness: 0.0, depthWrite: false,
      emissive: 0xffd76a, emissiveIntensity: 0.35,
    });
    obj.traverse((child: any) => {
      if (child.isMesh) {
        child.material = mat.clone();
        child.material.opacity = baseOpacity;
        child.castShadow = false;
      }
    });
  }

  // ── Edge markers — golden glow bar + ghost road on hover ────────────────
  _buildEdgeMarkers() {
    this.edgeMeshes = new Map();

    for (const [id, edge] of this.graph.edges) {
      const intA = this.graph.intersections.get(edge.intersections[0]);
      const intB = this.graph.intersections.get(edge.intersections[1]);
      if (!intA || !intB) continue;

      const { pos, rotY } = this.edgeTo3D(intA.x, intA.y, intB.x, intB.y);

      const RS = this.pieceScale;
      const group = new THREE.Group();
      group.position.set(pos[0], pos[1], pos[2]);
      group.rotation.y = rotY;

      const glow = makeEdgeGlow(3.15 * RS);
      group.add(glow);

      const road = createRoad3D('#ffffff', 3.15, [RS + 0.02, RS, RS]);
      this._applyGhostMat(road, 0.5);
      group.add(road);

      tagBaseOpacity(group);

      group.userData = {
        type: 'edge', id,
        defaultOpacity: 0.55,
        hoverOpacity: 1.0,
      };
      group.visible = false;
      this.markersGroup.add(group);
      this.edgeMeshes.set(id, group);
    }
  }

  /**
   * Sweep marker opacity. `opacity` acts as a 0..1 factor against each
   * mesh's tagged baseOpacity, so rings stay bright while ghosts stay soft.
   * Invisible hit volumes (userData.isHitArea) are skipped.
   */
  _setMarkerOpacity(group: any, opacity: number) {
    const factor = Math.max(0, Math.min(1, opacity));
    group.traverse((child: any) => {
      if (child.isMesh && child.material && !child.userData.isHitArea) {
        const base = child.userData.baseOpacity ?? 1;
        child.material.opacity = base * factor;
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

  // ── Hex markers (robber placement — red target rings) ───────────────────
  _buildHexMarkers() {
    this.hexMarkers = new Map();

    for (const hex of this.boardData) {
      if (hex.type === 'ocean') continue;
      const hexKey = `${hex.q},${hex.r}`;
      const [x, , z] = hexToWorld(hex.q, hex.r, this.S);

      const group = makeHexTargetRing();
      group.position.set(x - this.S * 0.92 * 0.65, 0.3, z); // same offset as robber
      tagBaseOpacity(group);

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
