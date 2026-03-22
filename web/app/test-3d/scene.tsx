"use client";

import { useMemo, useCallback } from "react";
import { Canvas, ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
  BEGINNER_BOARD,
  OCEAN_RING,
  hexToPixel,
  hexCornersArray,
  HARBORS,
  HARBOR_RESOURCE_COLOR,
  HARBOR_RESOURCE_LABEL,
  type Hex,
  type TerrainType,
  type Harbor,
} from "../../lib/hexGrid";
import { BOARD_HEX_SIZE, type BoardGraph } from "../../lib/boardGraph";
import type { Player } from "../../lib/gameTypes";
import { Settlement3D } from "../../components/board3d/Settlement3D";
import { City3D } from "../../components/board3d/City3D";
import { Road3D } from "../../components/board3d/Road3D";
import { Robber3D } from "../../components/board3d/Robber3D";
import Harbor3D from "../../components/board3d/Harbor3D";
import { Boat3D } from "../../components/board3d/Boat3D";
import RoadNode3D from "../../components/board3d/RoadNode3D";

// ─── Constants ───────────────────────────────────────────────────────────────

const HEX_3D_SIZE = 1.6;
const HEX_RADIUS  = 1.28;
const BOARD_Y     = 0.22;
const HEX_HEIGHT  = 0.10;
const FRAME_R     = HEX_3D_SIZE - 0.02;  // nearly fills cell → no gap between frames

// Scale factor: 2D pixel coords → 3D world coords
const COORD_SCALE = HEX_3D_SIZE / BOARD_HEX_SIZE;

const TERRAIN_3D_COLOR: Record<TerrainType, string> = {
  forest:    "#1e8c3a",
  hills:     "#c94a18",
  pasture:   "#6cc520",
  fields:    "#e8a800",
  mountains: "#7890a8",
  desert:    "#d4a030",
  ocean:     "#2e80c8",
};

const TERRAIN_EMISSIVE: Record<TerrainType, string> = {
  forest:    "#0a3015",
  hills:     "#3a1005",
  pasture:   "#1a3800",
  fields:    "#3a2800",
  mountains: "#101820",
  desert:    "#302000",
  ocean:     "#001830",
};

// ─── Coordinate helpers ──────────────────────────────────────────────────────

function hexTo3D(q: number, r: number): [number, number, number] {
  const px = hexToPixel(q, r, HEX_3D_SIZE);
  return [px.x, BOARD_Y, px.y];
}

const PIECE_Y = BOARD_Y + 0.05;   // base Y for roads and road nodes
// How tall the RoadNode3D platform is at scale S (FH+PH+stone ≈ 0.50 internal units)
const NODE_S  = 0.32;
const NODE_TOP = 0.12;  // settlement/city offset above road node platform

/** Convert a 2D board graph intersection position to 3D */
function interTo3D(x2d: number, y2d: number): [number, number, number] {
  return [x2d * COORD_SCALE, PIECE_Y, y2d * COORD_SCALE];
}

/** Convert a 2D board graph edge midpoint to 3D + compute Y rotation */
function edgeTo3D(
  x1: number, y1: number,
  x2: number, y2: number,
): { pos: [number, number, number]; rotY: number } {
  const mx = ((x1 + x2) / 2) * COORD_SCALE;
  const mz = ((y1 + y2) / 2) * COORD_SCALE;
  const dx = (x2 - x1) * COORD_SCALE;  // 2D x → 3D x
  const dz = (y2 - y1) * COORD_SCALE;  // 2D y → 3D z
  return {
    pos: [mx, PIECE_Y, mz],
    // Road3D at rotation=0 runs along X. Rotate to align with edge direction.
    rotY: -Math.atan2(dz, dx),
  };
}

// ─── Hex Shape ───────────────────────────────────────────────────────────────

function makeHexShape(radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

// ─── Ocean Ring Tiles ────────────────────────────────────────────────────────

const OCEAN_TILE_COLOR   = "#3d7fba";
const OCEAN_TILE_EMISSIVE = "#0a1f38";

function OceanTile3D({ hex }: { hex: Hex }) {
  const { x: px, y: pz } = hexToPixel(hex.q, hex.r, HEX_3D_SIZE);

  const geo = useMemo(() => {
    const shape = makeHexShape(FRAME_R);
    return new THREE.ExtrudeGeometry(shape, {
      depth: HEX_HEIGHT,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 1,
    });
  }, []);

  return (
    <mesh
      geometry={geo}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[px, BOARD_Y - 0.11, pz]}
    >
      <meshStandardMaterial
        color={OCEAN_TILE_COLOR}
        roughness={0.70}
        metalness={0.05}
        emissive={OCEAN_TILE_EMISSIVE}
        emissiveIntensity={0.45}
      />
    </mesh>
  );
}


function OceanRing() {
  return (
    <group>
      {OCEAN_RING.map((hex) => (
        <OceanTile3D key={`${hex.q},${hex.r}`} hex={hex} />
      ))}
    </group>
  );
}

// ─── Number Token (canvas texture disc) ─────────────────────────────────────

const PIP_COUNT: Record<number, number> = {
  2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1,
};

function TokenDisc({ number, isHot, y, offsetZ = 0 }: { number: number; isHot: boolean; y: number; offsetZ?: number }) {
  const texture = useMemo(() => {
    const SIZE = 256;
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d")!;
    const cx = SIZE / 2, cy = SIZE / 2, r = SIZE / 2 - 4;

    // Background disc
    ctx.fillStyle = "#f5ecd0";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Border ring
    ctx.strokeStyle = isHot ? "#dc2626" : "#78350f";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 7, 0, Math.PI * 2);
    ctx.stroke();

    // Number text
    const label = String(number);
    ctx.fillStyle = isHot ? "#dc2626" : "#3d2b1f";
    ctx.font = `bold ${label.length > 1 ? 96 : 108}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(label, cx, cy + 26);

    // Pips row
    const pips = PIP_COUNT[number] ?? 0;
    const pipR = 8;
    const spacing = 22;
    const startX = cx - ((pips - 1) * spacing) / 2;
    ctx.fillStyle = isHot ? "#dc2626" : "#3d2b1f";
    for (let i = 0; i < pips; i++) {
      ctx.beginPath();
      ctx.arc(startX + i * spacing, cy + 68, pipR, 0, Math.PI * 2);
      ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
  }, [number, isHot]);

  return (
    <mesh position={[0, y, offsetZ]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.30, 48]} />
      <meshStandardMaterial map={texture} roughness={0.55} transparent />
    </mesh>
  );
}

// ─── Single Hex Tile ─────────────────────────────────────────────────────────

function HexTile3D({
  hex,
  isRobber,
  clickable,
  onClick,
}: {
  hex: Hex;
  isRobber: boolean;
  clickable: boolean;
  onClick?: () => void;
}) {
  const [x, , z] = hexTo3D(hex.q, hex.r);
  const color  = TERRAIN_3D_COLOR[hex.type];
  const height = HEX_HEIGHT;
  const isHot  = hex.number === 6 || hex.number === 8;

  if (hex.type === "ocean") return null;

  const geo = useMemo(() => {
    const shape = makeHexShape(HEX_RADIUS);
    return new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 1,
    });
  }, [height]);

  const FRAME_DEPTH = 0.28;
  const frameGeo = useMemo(() => {
    const shape = makeHexShape(FRAME_R);
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: FRAME_DEPTH,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 1,
    });
    g.translate(0, 0, -FRAME_DEPTH);
    return g;
  }, []);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    if (clickable && onClick) {
      e.stopPropagation();
      onClick();
    }
  }, [clickable, onClick]);

  return (
    <group position={[x, BOARD_Y, z]}>
      {/* Sand frame */}
      <mesh geometry={frameGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}
       >
        <meshStandardMaterial color="#d4b87a" roughness={0.88} metalness={0.0} emissive="#3a2a00" emissiveIntensity={0.35} />
      </mesh>

      {/* Terrain tile */}
      <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}
        onClick={handleClick}>
        <meshStandardMaterial
          color={clickable ? "#ffcc00" : color}
          roughness={0.80}
          metalness={0.0}
          emissive={clickable ? "#ffaa00" : TERRAIN_EMISSIVE[hex.type]}
          emissiveIntensity={clickable ? 0.30 : 0.55}
        />
      </mesh>

      {/* Number token — canvas texture on a flat 3D disc */}
      {hex.number != null && (
        <TokenDisc number={hex.number} isHot={isHot} y={height + 0.04} offsetZ={0.42} />
      )}

      {/* Robber */}
      {isRobber && (
        <Robber3D position={[0, height + 0.01, 0]} scale={0.45} shadows={false} />
      )}
    </group>
  );
}

/** Compute road arm angles (degrees, 0=+Z) for a given intersection */
function getRoadNodeAngles(intId: string, graph: BoardGraph): number[] {
  const inter = graph.intersections.get(intId);
  if (!inter) return [];
  return inter.adjacentEdges.map((edgeId) => {
    const edge = graph.edges.get(edgeId);
    if (!edge) return 0;
    const otherId = edge.intersections[0] === intId ? edge.intersections[1] : edge.intersections[0];
    const other = graph.intersections.get(otherId);
    if (!other) return 0;
    const dx = (other.x - inter.x) * COORD_SCALE;
    const dz = (other.y - inter.y) * COORD_SCALE;
    return (Math.atan2(dx, dz) * 180) / Math.PI;
  });
}

// ─── Player Pieces ───────────────────────────────────────────────────────────

function PlayerPieces({
  players,
  graph,
}: {
  players: Player[];
  graph: BoardGraph;
}) {
  const S = 0.26;
  const RS = 0.32; // road scale
  const pieceY = NODE_TOP; // settlement/city sits on top of road node

  // All intersections occupied by ANY player's settlement or city
  const allOccupied = new Set(
    players.flatMap((p) => [...p.settlements, ...p.cities])
  );

  // Map: intId -> Set of playerIds who have a road touching it
  const roadTouches = new Map<string, Set<string>>();
  for (const player of players) {
    for (const edgeId of player.roads) {
      const edge = graph.edges.get(edgeId);
      if (!edge) continue;
      for (const intId of edge.intersections) {
        if (!roadTouches.has(intId)) roadTouches.set(intId, new Set());
        roadTouches.get(intId)!.add(player.id);
      }
    }
  }

  return (
    <group>
      {players.map((player) => (
        <group key={player.id}>
          {/* Settlements */}
          {player.settlements.map((intId) => {
            const inter = graph.intersections.get(intId);
            if (!inter) return null;
            const pos = interTo3D(inter.x, inter.y);
            const angles = getRoadNodeAngles(intId, graph);
            return (
              <group key={`s-${intId}`}>
                <RoadNode3D playerColor={player.color} connectionAngles={angles} position={pos} scale={S} />
                <Settlement3D color={player.color} position={[pos[0], pos[1] + pieceY, pos[2]]} scale={S} />
              </group>
            );
          })}

          {/* Cities */}
          {player.cities.map((intId) => {
            const inter = graph.intersections.get(intId);
            if (!inter) return null;
            const pos = interTo3D(inter.x, inter.y);
            const angles = getRoadNodeAngles(intId, graph);
            return (
              <group key={`c-${intId}`}>
                <RoadNode3D playerColor={player.color} connectionAngles={angles} position={pos} scale={S} />
                <City3D color={player.color} position={[pos[0], pos[1] + pieceY, pos[2]]} scale={S} />
              </group>
            );
          })}

          {/* Roads */}
          {player.roads.map((edgeId) => {
            const edge = graph.edges.get(edgeId);
            if (!edge) return null;
            const intA = graph.intersections.get(edge.intersections[0]);
            const intB = graph.intersections.get(edge.intersections[1]);
            if (!intA || !intB) return null;
            const { pos, rotY } = edgeTo3D(intA.x, intA.y, intB.x, intB.y);
            return (
              <group key={`r-${edgeId}`} position={pos} rotation={[0, rotY, 0]}>
                <Road3D color={player.color} scale={[RS + 0.02, RS, RS]} />
              </group>
            );
          })}

          {/* Road junctions — connector at intersections where 2+ roads meet */}
          {(() => {
            const roadSet = new Set(player.roads);
            const junctions: string[] = [];
            for (const [intId, inter] of graph.intersections) {
              if (allOccupied.has(intId)) continue; // any player's settlement/city takes priority
              const count = inter.adjacentEdges.filter((eid) => roadSet.has(eid)).length;
              if (count >= 1) junctions.push(intId);
            }
            return junctions.map((intId) => {
              const inter = graph.intersections.get(intId)!;
              const pos = interTo3D(inter.x, inter.y);
              // Only show arms for roads this player actually placed
              const angles = inter.adjacentEdges
                .filter((eid) => roadSet.has(eid))
                .map((eid) => {
                  const edge = graph.edges.get(eid);
                  if (!edge) return 0;
                  const otherId = edge.intersections[0] === intId ? edge.intersections[1] : edge.intersections[0];
                  const other = graph.intersections.get(otherId);
                  if (!other) return 0;
                  const dx = (other.x - inter.x) * COORD_SCALE;
                  const dz = (other.y - inter.y) * COORD_SCALE;
                  return (Math.atan2(dx, dz) * 180) / Math.PI;
                });
              // Neutral if multiple players' roads meet here, or no adjacent intersection is blocked
              const sharedByMultiple = (roadTouches.get(intId)?.size ?? 0) > 1;
              const isBlocked = !sharedByMultiple && inter.adjacentEdges.some((eid) => {
                const edge = graph.edges.get(eid);
                if (!edge) return false;
                const otherId = edge.intersections[0] === intId ? edge.intersections[1] : edge.intersections[0];
                return allOccupied.has(otherId);
              });
              return (
                <RoadNode3D
                  key={`jn-${intId}`}
                  playerColor={player.color}
                  connectionAngles={angles}
                  neutral={!isBlocked}
                  position={pos}
                  scale={S}
                />
              );
            });
          })()}
        </group>
      ))}
    </group>
  );
}

// ─── Interaction Markers ─────────────────────────────────────────────────────

function IntersectionMarkers({
  graph,
  validIds,
  onClick,
}: {
  graph: BoardGraph;
  validIds: Set<string>;
  onClick: (id: string) => void;
}) {
  if (validIds.size === 0) return null;

  return (
    <group>
      {Array.from(validIds).map((intId) => {
        const inter = graph.intersections.get(intId);
        if (!inter) return null;
        const [x, y, z] = interTo3D(inter.x, inter.y);
        return (
          <group key={intId} position={[x, y + 0.05, z]}>
            {/* Flat circle marker */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}
              onClick={(e) => { e.stopPropagation(); onClick(intId); }}>
              <circleGeometry args={[0.22, 24]} />
              <meshStandardMaterial color="#1a1a1a" transparent opacity={0.55} />
            </mesh>
            {/* Border ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
              <ringGeometry args={[0.18, 0.22, 24]} />
              <meshStandardMaterial color="#4ade80" transparent opacity={0.7} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function EdgeMarkers({
  graph,
  validIds,
  onClick,
}: {
  graph: BoardGraph;
  validIds: Set<string>;
  onClick: (id: string) => void;
}) {
  if (validIds.size === 0) return null;

  return (
    <group>
      {Array.from(validIds).map((edgeId) => {
        const edge = graph.edges.get(edgeId);
        if (!edge) return null;
        const intA = graph.intersections.get(edge.intersections[0]);
        const intB = graph.intersections.get(edge.intersections[1]);
        if (!intA || !intB) return null;
        const { pos, rotY } = edgeTo3D(intA.x, intA.y, intB.x, intB.y);
        // Road-sized rectangle marker (matches Road3D proportions at scale 0.38)
        return (
          <group key={edgeId} position={[pos[0], pos[1] + 0.05, pos[2]]} rotation={[0, rotY, 0]}>
            <mesh
              position={[0, 0.05, 0]}
              onClick={(e) => { e.stopPropagation(); onClick(edgeId); }}
            >
              <boxGeometry args={[0.95, 0.07, 0.28]} />
              <meshStandardMaterial
                color="#1a1a1a"
                transparent
                opacity={0.45}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ─── Harbor Markers ──────────────────────────────────────────────────────────

// Resource → harbor type mapping
const HARBOR_TYPE_MAP: Record<string, "generic" | "brick" | "lumber" | "ore" | "grain" | "wool"> = {
  brick: "brick", lumber: "lumber", ore: "ore", grain: "grain", wool: "wool",
};

// Resource → boat stripe color
const BOAT_STRIPE_COLOR: Record<string, string> = {
  lumber: "#22c55e", brick: "#f97316", wool: "#a3e635",
  grain: "#facc15", ore: "#94a3b8",
};

function HarborMarker3D({ harbor }: { harbor: Harbor }) {
  const { x: cx, y: cz } = hexToPixel(harbor.q, harbor.r, HEX_3D_SIZE);
  // q,r = ocean hex; corners of its harbor.edge face the land boundary
  const corners = hexCornersArray(cx, cz, HEX_3D_SIZE);
  const c1 = corners[harbor.edge];
  const c2 = corners[(harbor.edge + 1) % 6];
  const emx = (c1.x + c2.x) / 2;
  const emz = (c1.y + c2.y) / 2;

  // Boat further into ocean
  const boatX = emx + (cx - emx) * 0.75;
  const boatZ = emz + (cz - emz) * 0.75;

  const Y = BOARD_Y + 0.10;
  const boatRotY = Math.atan2(cx - emx, cz - emz);
  const stripeColor = harbor.resource ? BOAT_STRIPE_COLOR[harbor.resource] ?? "#DC2626" : "#DC2626";

  // Piers go from each corner directly toward the boat (V shape)
  const pier1MidX = (c1.x + boatX) / 2;
  const pier1MidZ = (c1.y + boatZ) / 2;
  const pier1RotY = Math.atan2(boatX - c1.x, boatZ - c1.y);

  const pier2MidX = (c2.x + boatX) / 2;
  const pier2MidZ = (c2.y + boatZ) / 2;
  const pier2RotY = Math.atan2(boatX - c2.x, boatZ - c2.y);

  return (
    <group>
      {/* Harbor dock from corner 1 toward boat */}
      <Harbor3D
        position={[pier1MidX, Y, pier1MidZ]}
        rotationY={pier1RotY}
        scale={0.20}
        shadows={false}
      />
      {/* Harbor dock from corner 2 toward boat */}
      <Harbor3D
        position={[pier2MidX, Y, pier2MidZ]}
        rotationY={pier2RotY}
        scale={0.20}
        shadows={false}
      />
      {/* Boat in ocean — harbor info baked into sail texture */}
      <Boat3D
        position={[boatX, Y, boatZ]}
        rotationY={boatRotY}
        scale={0.18}
        shadows={false}
        stripeColor={stripeColor}
        animated={true}
        harborType={harbor.type}
        harborResource={harbor.resource}
      />
    </group>
  );
}

function Harbors() {
  return (
    <group>
      {HARBORS.map((h, i) => (
        <HarborMarker3D key={i} harbor={h} />
      ))}
    </group>
  );
}


// ─── Lights ──────────────────────────────────────────────────────────────────

function Lights() {
  return (
    <>
      <ambientLight intensity={0.5} color="#ffffff" />
      <directionalLight position={[6, 14, 8]}  intensity={1.4} color="#ffffff" />
      <directionalLight position={[-5, 8, -4]} intensity={0.4} color="#ddeeff" />
    </>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface Scene3DProps {
  hexes: Hex[];
  graph: BoardGraph;
  players: Player[];
  robberHex: string;
  validIntersections: Set<string>;
  validEdges: Set<string>;
  robberMode: boolean;
  onIntersectionClick: (id: string) => void;
  onEdgeClick: (id: string) => void;
  onHexClick: (hexKey: string) => void;
}

// ─── Board ───────────────────────────────────────────────────────────────────

function Board({
  hexes, graph, players, robberHex,
  validIntersections, validEdges, robberMode,
  onIntersectionClick, onEdgeClick, onHexClick,
}: Scene3DProps) {
  return (
    <group>
      <OceanRing />
      {hexes.map((hex) => (
        <HexTile3D
          key={`${hex.q},${hex.r}`}
          hex={hex}
          isRobber={`${hex.q},${hex.r}` === robberHex}
          clickable={robberMode && hex.type !== "ocean" && hex.type !== "desert"}
          onClick={() => onHexClick(`${hex.q},${hex.r}`)}
        />
      ))}
      <Harbors />
      <PlayerPieces players={players} graph={graph} />
      <IntersectionMarkers graph={graph} validIds={validIntersections} onClick={onIntersectionClick} />
      <EdgeMarkers graph={graph} validIds={validEdges} onClick={onEdgeClick} />
    </group>
  );
}

// ─── Main Scene ──────────────────────────────────────────────────────────────

export function Scene3D(props: Scene3DProps) {
  return (
    <Canvas
      camera={{ position: [0, 14, 17], fov: 42, near: 0.1, far: 500 }}
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      onCreated={({ gl }) => gl.setClearColor("#000000", 0)}
      style={{ width: "100%", height: "100%" }}
    >
      <Lights />
      <Board {...props} />
      <OrbitControls
        target={[0, 0.5, 0]}
        minDistance={3} maxDistance={36}
        maxPolarAngle={Math.PI / 1.9} minPolarAngle={Math.PI / 10}
        enablePan={false} rotateSpeed={0.6} zoomSpeed={0.7}
      />
    </Canvas>
  );
}
