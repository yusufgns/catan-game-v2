"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import {
  hexToPixel,
  OCEAN_RING,
  HARBORS,
  type Hex,
} from "@/lib/hexGrid";
import { canPlaceSettlement, canPlaceRoad } from "@/lib/gameRules";
import type { BoardGraph } from "@/lib/boardGraph";
import type { Player, ActionMode } from "@/lib/gameTypes";
import { HexTile } from "./HexTile";
import { OceanTile } from "./OceanTile";
import { HarborMarker } from "./HarborMarker";
import { RobberPiece } from "./RobberPiece";

const HEX_SIZE = 72;
const VIEWBOX_PADDING = 110;

// ─── Color utility ────────────────────────────────────────────────────────────
// Adjusts #rrggbb brightness by multiplying channels.
// Avoids CSS filter (which would flatten preserve-3d children).

function adj(hex: string, f: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.min(255, Math.round(r * f))},${Math.min(255, Math.round(g * f))},${Math.min(255, Math.round(b * f))})`;
}

// ─── CSS 3D Cube ──────────────────────────────────────────────────────────────
// A generic 6-face CSS 3D cube. zOffset stacks cubes vertically (city tower).

function CSSCube({
  cssX, cssY, size, color, zOffset = 0,
}: {
  cssX: number; cssY: number; size: number; color: string; zOffset?: number;
}) {
  const h = size / 2;
  const face: React.CSSProperties = {
    position: "absolute", width: size, height: size, backfaceVisibility: "hidden",
  };
  return (
    <div style={{
      position: "absolute", left: cssX, top: cssY,
      transformStyle: "preserve-3d",
      transform: `translate(-${h}px, -${h}px) translateZ(${h + zOffset}px)`,
      pointerEvents: "none",
    }}>
      {/* Top  — brightest */}
      <div style={{ ...face, background: adj(color, 1.5), border: `1px solid ${adj(color, 2.0)}`, transform: `rotateX(90deg) translateZ(${h}px)` }} />
      {/* Front */}
      <div style={{ ...face, background: adj(color, 1.1), border: `1px solid ${adj(color, 1.6)}`, transform: `translateZ(${h}px)` }} />
      {/* Back */}
      <div style={{ ...face, background: adj(color, 0.45), transform: `rotateY(180deg) translateZ(${h}px)` }} />
      {/* Left */}
      <div style={{ ...face, background: adj(color, 0.68), border: `0.5px solid ${adj(color, 1.0)}`, transform: `rotateY(-90deg) translateZ(${h}px)` }} />
      {/* Right */}
      <div style={{ ...face, background: adj(color, 0.68), border: `0.5px solid ${adj(color, 1.0)}`, transform: `rotateY(90deg) translateZ(${h}px)` }} />
      {/* Bottom */}
      <div style={{ ...face, background: adj(color, 0.28), transform: `rotateX(-90deg) translateZ(${h}px)` }} />
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface HexBoardProps {
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

// ─── Main Component ───────────────────────────────────────────────────────────

export function HexBoard({
  hexes, graph, players, currentPlayerId, actionMode, setupConstraint, robberHex,
  onIntersectionClick, onEdgeClick, onHexClick,
}: HexBoardProps) {
  const svgRef       = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1.55);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastMouse  = useRef({ x: 0, y: 0 });

  // ── Compute SVG layout ─────────────────────────────────────────────────────
  const { landTiles, oceanTiles, viewBox, vb } = useMemo(() => {
    const pos = (hex: Hex) => {
      const { x, y } = hexToPixel(hex.q, hex.r, HEX_SIZE);
      return { ...hex, cx: x, cy: y };
    };
    const land  = hexes.map(pos);
    const ocean = OCEAN_RING.map(pos);
    const all   = [...ocean, ...land];
    const xs = all.map(p => p.cx);
    const ys = all.map(p => p.cy);
    const minX = Math.min(...xs) - HEX_SIZE - VIEWBOX_PADDING;
    const minY = Math.min(...ys) - HEX_SIZE - VIEWBOX_PADDING;
    const maxX = Math.max(...xs) + HEX_SIZE + VIEWBOX_PADDING;
    const maxY = Math.max(...ys) + HEX_SIZE + VIEWBOX_PADDING;
    return {
      landTiles: land,
      oceanTiles: ocean,
      viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`,
      vb: { minX, minY, width: maxX - minX },
    };
  }, [hexes]);

  // ── SVG → CSS pixel scale (for 3D overlay positioning) ────────────────────
  useEffect(() => {
    const update = () => {
      if (svgRef.current) setScale(svgRef.current.clientWidth / vb.width);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [vb.width]);

  // ── Mouse-wheel camera zoom ────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(z => Math.min(2.2, Math.max(1.0, z - e.deltaY * 0.001)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── Drag-to-pan ────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const PAN_LIMIT = 120;
    const onDown = (e: MouseEvent) => {
      isDragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      el.style.cursor = "grabbing";
    };
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      setPan(p => ({
        x: Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, p.x + dx)),
        y: Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, p.y + dy)),
      }));
    };
    const onUp = () => { isDragging.current = false; el.style.cursor = "grab"; };
    el.style.cursor = "grab";
    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const toCSS = (svgX: number, svgY: number) => ({
    cssX: (svgX - vb.minX) * (scale ?? 0),
    cssY: (svgY - vb.minY) * (scale ?? 0),
  });

  // ── Valid placements ───────────────────────────────────────────────────────
  const validSettlements = useMemo(() => {
    if (actionMode !== "settlement") return new Set<string>();
    const s = new Set<string>();
    for (const [id] of graph.intersections)
      if (canPlaceSettlement(id, graph, players, currentPlayerId)) s.add(id);
    return s;
  }, [actionMode, graph, players, currentPlayerId]);

  const validCities = useMemo(() => {
    if (actionMode !== "city") return new Set<string>();
    return new Set(players.find(p => p.id === currentPlayerId)?.settlements ?? []);
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

  // ── Lookup maps ────────────────────────────────────────────────────────────
  const buildingAt = useMemo(() => {
    const m = new Map<string, { player: Player; isCity: boolean }>();
    for (const p of players) {
      for (const id of p.settlements) m.set(id, { player: p, isCity: false });
      for (const id of p.cities)      m.set(id, { player: p, isCity: true  });
    }
    return m;
  }, [players]);

  const roadAt = useMemo(() => {
    const m = new Map<string, Player>();
    for (const p of players)
      for (const id of p.roads) m.set(id, p);
    return m;
  }, [players]);

  // Intersections where 2+ roads from same player meet (junction effect)
  const roadJunctions = useMemo(() => {
    const junctions = new Map<string, { player: Player; count: number }>();
    for (const [intId, inter] of graph.intersections) {
      const roadCountByPlayer = new Map<string, number>();
      for (const edgeId of inter.adjacentEdges) {
        const player = roadAt.get(edgeId);
        if (player)
          roadCountByPlayer.set(player.id, (roadCountByPlayer.get(player.id) ?? 0) + 1);
      }
      for (const [playerId, count] of roadCountByPlayer) {
        if (count >= 2) {
          const player = players.find(p => p.id === playerId)!;
          junctions.set(intId, { player, count });
          break;
        }
      }
    }
    return junctions;
  }, [graph.intersections, roadAt, players]);

  const pieceSize   = scale !== null ? Math.max(13, HEX_SIZE * 0.21 * scale) : 13;
  const roadThick   = scale !== null ? Math.max(6, HEX_SIZE * 0.12 * scale) : 6;
  const roadDepth   = scale !== null ? Math.max(4, HEX_SIZE * 0.07 * scale) : 4;
  const roadGap     = scale !== null ? 10 * scale : 10;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full" style={{ position: "relative" }}>

      {/* ── Zoom buttons (outside the 3D context) ─────────────────────── */}
      <div style={{ position: "absolute", top: 10, right: 10, zIndex: 50, display: "flex", flexDirection: "column", gap: 3 }}>
        {([["＋", 0.18], ["－", -0.18]] as [string, number][]).map(([lbl, d]) => (
          <button key={lbl}
            onClick={() => setZoom(z => Math.min(2.2, Math.max(1.0, z + d)))}
            style={{ width: 26, height: 26, background: "rgba(10,10,30,0.9)", border: "1px solid rgba(0,212,255,0.45)", color: "#00d4ff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >{lbl}</button>
        ))}
        <button onClick={() => { setZoom(1.55); setPan({ x: 0, y: 0 }); }}
          style={{ width: 26, height: 13, background: "rgba(10,10,30,0.9)", border: "1px solid rgba(0,212,255,0.2)", color: "rgba(0,212,255,0.5)", fontSize: 8, cursor: "pointer", letterSpacing: 1 }}
        >RST</button>
      </div>

      {/* ── Perspective container (wheel target + 3D scene) ───────────── */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center"
        style={{ perspective: "1400px", perspectiveOrigin: "50% 30%" }}
      >

      <div style={{
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotateX(52deg)`,
        transformStyle: "preserve-3d",
        width: "100%",
        maxWidth: "860px",
        position: "relative",
      }}>
        {/* ── 2D SVG Board ────────────────────────────────────────────── */}
        <svg
          ref={svgRef}
          viewBox={viewBox}
          style={{ overflow: "visible", width: "100%", height: "auto", display: "block", filter: "drop-shadow(0px 4px 12px rgba(0,0,0,0.4))" }}
        >
          <defs>
            <pattern id="scanlines-board" x="0" y="0" width="2" height="4" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="2" height="2" fill="black" opacity="0.05" />
            </pattern>
            {/* Ocean background wave pattern */}
            <pattern id="bg-ocean-wave" x="0" y="0" width="40" height="20" patternUnits="userSpaceOnUse">
              <path d="M0,10 Q10,4 20,10 Q30,16 40,10" fill="none" stroke="#1a4a7a" strokeWidth="1" opacity="0.22" />
            </pattern>
          </defs>

          {/* Ocean surface */}
          <rect x="-2500" y="-2500" width="5000" height="5000" fill="#002966" />
          <rect x="-2500" y="-2500" width="5000" height="5000" fill="url(#bg-ocean-wave)" />

          {/* Land tiles — ocean-type hexes rendered as OceanTile */}
          {landTiles.map(hex => {
            if (hex.type === "ocean") {
              return <OceanTile key={`${hex.q},${hex.r}`} id={`${hex.q}-${hex.r}`} cx={hex.cx} cy={hex.cy} size={HEX_SIZE} />;
            }
            return (
              <HexTile key={`${hex.q},${hex.r}`} id={`${hex.q}-${hex.r}`} cx={hex.cx} cy={hex.cy} size={HEX_SIZE} type={hex.type} number={hex.number} />
            );
          })}

          {/* Harbor SVG text labels */}
          {HARBORS.map((harbor, i) => (
            <HarborMarker key={`harbor-${i}`} harbor={harbor} size={HEX_SIZE} />
          ))}

          {/* ── Robber mode: small hex click targets ────────────────────── */}
          {actionMode === "robber" && landTiles.map(hex => {
            if (hex.type === "ocean") return null;
            const key = `${hex.q},${hex.r}`;
            const isCurrent = key === robberHex;
            if (isCurrent) return null;
            return (
              <circle
                key={`robber-target-${key}`}
                cx={hex.cx} cy={hex.cy}
                r={HEX_SIZE * 0.22}
                fill="rgba(200,30,30,0.35)"
                stroke="#ff4444"
                strokeWidth={2}
                cursor="pointer"
                onClick={() => onHexClick(key)}
              />
            );
          })}

          {/* ── Edge highlights + click targets ────────────────────────── */}
          {Array.from(graph.edges.values()).map(edge => {
            const intA    = graph.intersections.get(edge.intersections[0])!;
            const intB    = graph.intersections.get(edge.intersections[1])!;
            const isValid = validRoads.has(edge.id);
            return (
              <g key={edge.id}>
                {isValid && (
                  <line x1={intA.x} y1={intA.y} x2={intB.x} y2={intB.y}
                    stroke="#00ff88" strokeWidth={3} strokeLinecap="round"
                    opacity={0.55} strokeDasharray="5,5" />
                )}
                {actionMode === "road" && (
                  <line x1={intA.x} y1={intA.y} x2={intB.x} y2={intB.y}
                    stroke="transparent" strokeWidth={24}
                    cursor={isValid ? "pointer" : "default"}
                    onClick={() => isValid && onEdgeClick(edge.id)} />
                )}
              </g>
            );
          })}

          {/* ── Intersection highlights + click targets ─────────────────── */}
          {Array.from(graph.intersections.values()).map(inter => {
            const building   = buildingAt.get(inter.id);
            const isValidS   = validSettlements.has(inter.id);
            const isValidC   = validCities.has(inter.id);
            const isClickable = isValidS || isValidC;
            return (
              <g key={inter.id}>
                {!building && isValidS && (
                  <circle cx={inter.x} cy={inter.y} r={10}
                    fill="rgba(0,255,136,0.18)" stroke="#00ff88" strokeWidth={1.5} />
                )}
                {building && isValidC && (
                  <circle cx={inter.x} cy={inter.y} r={13}
                    fill="rgba(255,215,0,0.18)" stroke="#ffd700" strokeWidth={1.5} />
                )}
                {/* Dot at empty intersections — black */}
                {!building && !isValidS && (
                  <>
                    <circle cx={inter.x} cy={inter.y} r={6} fill="#0a0a1a" stroke="#000000" strokeWidth={1.5} />
                    <circle cx={inter.x} cy={inter.y} r={3.5} fill="#000000" stroke="#222233" strokeWidth={1} />
                  </>
                )}
                {isClickable && (
                  <circle cx={inter.x} cy={inter.y} r={18}
                    fill="transparent" cursor="pointer"
                    onClick={() => onIntersectionClick(inter.id)} />
                )}
              </g>
            );
          })}

          <rect x="-9999" y="-9999" width="99999" height="99999"
            fill="url(#scanlines-board)" pointerEvents="none" opacity={0.3} />
        </svg>

        {/* ── 3D Pieces Overlay ──────────────────────────────────────────── */}
        {scale !== null && (
          <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", pointerEvents: "none" }}>

            {/* Robber — CSS 3D cube */}
            {(() => {
              const tile = landTiles.find(h => `${h.q},${h.r}` === robberHex);
              if (!tile) return null;
              const { cssX, cssY } = toCSS(tile.cx, tile.cy);
              return <RobberPiece cssX={cssX} cssY={cssY} size={Math.max(12, pieceSize)} />;
            })()}

            {/* ── Road junction effect (where 2+ roads meet, no building) ─── */}
            {Array.from(roadJunctions.entries()).map(([intId, { player }]) => {
              if (buildingAt.has(intId)) return null;
              const inter = graph.intersections.get(intId)!;
              const { cssX, cssY } = toCSS(inter.x, inter.y);
              const junctionSize = Math.max(6, pieceSize * 0.4);
              return (
                <div
                  key={`junction-${intId}`}
                  style={{
                    position: "absolute",
                    left: cssX,
                    top: cssY,
                    width: junctionSize,
                    height: junctionSize,
                    borderRadius: "50%",
                    background: adj(player.color, 1.2),
                    border: `2px solid ${adj(player.color, 1.8)}`,
                    boxShadow: `0 0 8px ${player.color}66`,
                    transform: "translate(-50%, -50%)",
                  }}
                />
              );
            })}

            {/* ── Roads (CSS 3D planks) ────────────────────────────────────
                Each road = a box: width=len, height=roadThick, depth=roadDepth.
                Container has explicit width/height so faces are positioned
                relative to the box origin.                                     */}
            {Array.from(roadAt.entries()).map(([edgeId, player]) => {
              const edge = graph.edges.get(edgeId)!;
              const intA = graph.intersections.get(edge.intersections[0])!;
              const intB = graph.intersections.get(edge.intersections[1])!;
              const { cssX: ax, cssY: ay } = toCSS(intA.x, intA.y);
              const { cssX: bx, cssY: by } = toCSS(intB.x, intB.y);
              const mx  = (ax + bx) / 2;
              const my  = (ay + by) / 2;
              const fullLen = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
              const len = Math.max(4, fullLen - 2 * roadGap);
              const ang = Math.atan2(by - ay, bx - ax) * (180 / Math.PI);
              const hd = roadDepth / 2;
              const ht = roadThick / 2;
              return (
                <div key={edgeId} style={{
                  position: "absolute",
                  left: mx, top: my,
                  width: len, height: roadThick,
                  transformStyle: "preserve-3d",
                  transform: `translate(-50%, -50%) rotate(${ang}deg) translateZ(${hd}px)`,
                  pointerEvents: "none",
                }}>
                  {/* Top face — lies flat on top */}
                  <div style={{
                    position: "absolute", width: len, height: roadThick,
                    left: 0, top: 0,
                    background: adj(player.color, 1.4),
                    border: `0.5px solid ${adj(player.color, 1.9)}`,
                    borderRadius: 2,
                    transform: `translateZ(${hd}px)`,
                    backfaceVisibility: "hidden",
                  }} />
                  {/* Front face */}
                  <div style={{
                    position: "absolute", width: len, height: roadDepth,
                    left: 0, top: ht - hd,
                    background: adj(player.color, 1.05),
                    border: `0.5px solid ${adj(player.color, 1.5)}`,
                    transform: `rotateX(-90deg) translateZ(${ht}px)`,
                    transformOrigin: "0 0",
                    backfaceVisibility: "hidden",
                  }} />
                  {/* Bottom face */}
                  <div style={{
                    position: "absolute", width: len, height: roadThick,
                    left: 0, top: 0,
                    background: adj(player.color, 0.3),
                    transform: `translateZ(-${hd}px)`,
                    backfaceVisibility: "hidden",
                  }} />
                </div>
              );
            })}

            {/* ── Settlements & Cities ──────────────────────────────────────
                Settlement = single CSSCube (small).
                City       = main CSSCube + narrower tower stacked on top.
                Both centred on the intersection point.                      */}
            {Array.from(buildingAt.entries()).flatMap(([intId, { player, isCity }]) => {
              const inter = graph.intersections.get(intId)!;
              const { cssX, cssY } = toCSS(inter.x, inter.y);

              if (isCity) {
                return [
                  <CSSCube key={`${intId}-base`}
                    cssX={cssX} cssY={cssY}
                    size={pieceSize} zOffset={0}
                    color={player.color} />,
                  <CSSCube key={`${intId}-tower`}
                    cssX={cssX} cssY={cssY}
                    size={pieceSize * 0.55} zOffset={pieceSize}
                    color={player.color} />,
                ];
              }

              return [
                <CSSCube key={intId}
                  cssX={cssX} cssY={cssY}
                  size={pieceSize} zOffset={0}
                  color={player.color} />,
              ];
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
