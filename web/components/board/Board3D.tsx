"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
  hexToWorld3D,
  pixelToWorld3D,
  edgeAngleToRoadRotation,
  HEX_SIZE_3D,
} from "@/lib/hexGrid3D";
import { hexCornersArray, hexToPixel } from "@/lib/hexGrid";
import { TERRAIN_CONFIG } from "@/lib/hexGrid";
import type { Hex } from "@/lib/hexGrid";
import type { BoardGraph } from "@/lib/boardGraph";
import type { Player, ActionMode } from "@/lib/gameTypes";
import { canPlaceSettlement, canPlaceRoad } from "@/lib/gameRules";
import { Settlement3D } from "@/components/board3d/Settlement3D";
import { City3D } from "@/components/board3d/City3D";
import { Road3D } from "@/components/board3d/Road3D";

const BOARD_HEX_SIZE = 72;
const PIECE_SCALE = 0.38;

// ─── Props ────────────────────────────────────────────────────────────────────

interface Board3DProps {
  hexes: Hex[];
  graph: BoardGraph;
  players: Player[];
  currentPlayerId: string;
  actionMode: ActionMode;
  setupConstraint: string | null;
  robberHex: string;
  onIntersectionClick: (id: string) => void;
  onEdgeClick: (id: string) => void;
  onHexClick: (hexKey: string) => void;
}

// ─── Hex Tile 3D ───────────────────────────────────────────────────────────────

function HexTile3D({
  hex,
  isRobber,
  isRobberTarget,
  onClick,
}: {
  hex: Hex & { cx: number; cy: number };
  isRobber: boolean;
  isRobberTarget: boolean;
  onClick?: () => void;
}) {
  const [x, , z] = hexToWorld3D(hex.q, hex.r);
  const config = TERRAIN_CONFIG[hex.type];
  const isLand = hex.type !== "ocean" && hex.type !== "desert";

  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const corners = hexCornersArray(0, 0, BOARD_HEX_SIZE * (HEX_SIZE_3D / 72));
    shape.moveTo(corners[0].x * (HEX_SIZE_3D / 72), corners[0].y * (HEX_SIZE_3D / 72));
    for (let i = 1; i < corners.length; i++) {
      shape.lineTo(corners[i].x * (HEX_SIZE_3D / 72), corners[i].y * (HEX_SIZE_3D / 72));
    }
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.15,
      bevelEnabled: false,
    });
  }, []);

  if (hex.type === "ocean") return null;

  const color = isLand ? config.gradientFrom : config.gradientTo;

  return (
    <group position={[x, 0.075, z]}>
      <mesh
        geometry={geometry}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
      >
        <meshStandardMaterial
          color={color}
          roughness={0.9}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Number token on land hexes */}
      {isLand && hex.number != null && (
        <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.35, 16]} />
          <meshStandardMaterial
            color={hex.number === 6 || hex.number === 8 ? "#dc2626" : "#78350f"}
            roughness={0.8}
          />
        </mesh>
      )}
      {/* Robber */}
      {isRobber && (
        <mesh position={[0, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.25, 0.3, 0.5, 8]} />
          <meshStandardMaterial color="#2a1a7e" roughness={0.7} metalness={0.1} />
        </mesh>
      )}
      {/* Robber target highlight */}
      {isRobberTarget && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.7, 32]} />
          <meshBasicMaterial color="#ff4444" transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// ─── Ocean ──────────────────────────────────────────────────────────────────────

function Ocean3D() {
  const geoRef = useRef<THREE.PlaneGeometry>(null);
  useFrame(({ clock }) => {
    const geo = geoRef.current;
    if (!geo) return;
    const t = clock.getElapsedTime();
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const h =
        Math.sin(x * 0.08 + t * 0.8) * 0.15 +
        Math.sin(y * 0.06 + t * 0.6) * 0.12;
      pos.setZ(i, h);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
      <planeGeometry ref={geoRef} args={[80, 80, 40, 40]} />
      <meshStandardMaterial color="#1a5a9e" roughness={0.5} metalness={0.1} />
    </mesh>
  );
}

// ─── Main Board3D ───────────────────────────────────────────────────────────────

export function Board3D({
  hexes,
  graph,
  players,
  currentPlayerId,
  actionMode,
  setupConstraint,
  robberHex,
  onIntersectionClick,
  onEdgeClick,
  onHexClick,
}: Board3DProps) {
  const landHexes = useMemo(() => {
    return hexes
      .filter((h) => h.type !== "ocean")
      .map((h) => {
        const { x, y } = hexToPixel(h.q, h.r, BOARD_HEX_SIZE);
        return { ...h, cx: x, cy: y };
      });
  }, [hexes]);

  const validSettlements = useMemo(() => {
    if (actionMode !== "settlement") return new Set<string>();
    const s = new Set<string>();
    for (const [id] of graph.intersections)
      if (canPlaceSettlement(id, graph, players, currentPlayerId)) s.add(id);
    return s;
  }, [actionMode, graph, players, currentPlayerId]);

  const validCities = useMemo(() => {
    if (actionMode !== "city") return new Set<string>();
    return new Set(players.find((p) => p.id === currentPlayerId)?.settlements ?? []);
  }, [actionMode, players, currentPlayerId]);

  const validRoads = useMemo(() => {
    if (actionMode !== "road") return new Set<string>();
    const s = new Set<string>();
    for (const [id, edge] of graph.edges) {
      if (!canPlaceRoad(id, graph, players, currentPlayerId)) continue;
      if (setupConstraint && !edge.intersections.includes(setupConstraint)) continue;
      s.add(id);
    }
    return s;
  }, [actionMode, graph, players, currentPlayerId, setupConstraint]);

  const buildingAt = useMemo(() => {
    const m = new Map<string, { player: Player; isCity: boolean }>();
    for (const p of players) {
      for (const id of p.settlements) m.set(id, { player: p, isCity: false });
      for (const id of p.cities) m.set(id, { player: p, isCity: true });
    }
    return m;
  }, [players]);

  const roadAt = useMemo(() => {
    const m = new Map<string, Player>();
    for (const p of players) for (const id of p.roads) m.set(id, p);
    return m;
  }, [players]);

  return (
    <>
      <Ocean3D />

      {/* Land hex tiles */}
      {landHexes.map((hex) => {
        const key = `${hex.q},${hex.r}`;
        return (
          <HexTile3D
            key={key}
            hex={hex}
            isRobber={key === robberHex}
            isRobberTarget={actionMode === "robber" && key !== robberHex}
            onClick={actionMode === "robber" ? () => onHexClick(key) : undefined}
          />
        );
      })}

      {/* Intersection click targets + buildings */}
      {Array.from(graph.intersections.values()).map((inter) => {
        const [x, , z] = pixelToWorld3D(inter.x, inter.y);
        const building = buildingAt.get(inter.id);
        const isValidS = validSettlements.has(inter.id);
        const isValidC = validCities.has(inter.id);
        const isClickable = isValidS || isValidC;

        return (
          <group key={inter.id} position={[x, 0.2, z]}>
            {/* Invisible click target */}
            <mesh
              visible={isClickable}
              onClick={(e) => {
                e.stopPropagation();
                if (isClickable) onIntersectionClick(inter.id);
              }}
            >
              <sphereGeometry args={[0.5, 8, 8]} />
              <meshBasicMaterial visible={false} />
            </mesh>

            {/* Building */}
            {building && (
              <>
                {building.isCity ? (
                  <City3D
                    color={building.player.color}
                    position={[0, 0, 0]}
                    scale={PIECE_SCALE}
                    shadows
                  />
                ) : (
                  <Settlement3D
                    color={building.player.color}
                    position={[0, 0, 0]}
                    scale={PIECE_SCALE}
                    shadows
                  />
                )}
              </>
            )}

            {/* Valid placement hint */}
            {!building && isValidS && (
              <mesh position={[0, 0.05, 0]}>
                <ringGeometry args={[0.35, 0.5, 16]} />
                <meshBasicMaterial color="#00ff88" transparent opacity={0.5} side={THREE.DoubleSide} />
              </mesh>
            )}
            {building && isValidC && (
              <mesh position={[0, 0.05, 0]}>
                <ringGeometry args={[0.4, 0.55, 16]} />
                <meshBasicMaterial color="#ffd700" transparent opacity={0.5} side={THREE.DoubleSide} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Edge click targets + roads */}
      {Array.from(graph.edges.values()).map((edge) => {
        const intA = graph.intersections.get(edge.intersections[0])!;
        const intB = graph.intersections.get(edge.intersections[1])!;
        const [ax, , az] = pixelToWorld3D(intA.x, intA.y);
        const [bx, , bz] = pixelToWorld3D(intB.x, intB.y);
        const mx = (ax + bx) / 2;
        const mz = (az + bz) / 2;
        const angleDeg = (Math.atan2(bz - az, bx - ax) * 180) / Math.PI;
        const rotation = edgeAngleToRoadRotation(angleDeg);
        const roadPlayer = roadAt.get(edge.id);
        const isValid = validRoads.has(edge.id);

        return (
          <group key={edge.id} position={[mx, 0.15, mz]}>
            {/* Invisible click target */}
            <mesh
              visible={actionMode === "road"}
              onClick={(e) => {
                e.stopPropagation();
                if (isValid) onEdgeClick(edge.id);
              }}
              rotation={[0, (-rotation * Math.PI) / 180, 0]}
            >
              <boxGeometry args={[1.2, 0.4, 0.5]} />
              <meshBasicMaterial visible={false} />
            </mesh>

            {/* Road */}
            {roadPlayer && (
              <Road3D
                color={roadPlayer.color}
                position={[0, 0, 0]}
                scale={PIECE_SCALE}
                rotationY={rotation}
                shadows
              />
            )}

            {/* Valid road hint */}
            {!roadPlayer && isValid && (
              <mesh position={[0, 0.02, 0]} rotation={[0, (-rotation * Math.PI) / 180, 0]}>
                <boxGeometry args={[1.0, 0.08, 0.35]} />
                <meshBasicMaterial color="#00ff88" transparent opacity={0.4} />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}
