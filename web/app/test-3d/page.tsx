"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { buildBoardGraph } from "@/lib/boardGraph";
import { generateRandomBoard } from "@/lib/randomMap";
import { BEGINNER_BOARD } from "@/lib/hexGrid";
import {
  canPlaceSettlement,
  canUpgradeCity,
  canPlaceRoad,
  computeLongestRoad,
  distributeResources,
} from "@/lib/gameRules";
import type { Player, ActionMode, ResourceType } from "@/lib/gameTypes";
import { EMPTY_RESOURCES, RESOURCE_COLOR, RESOURCE_LABEL } from "@/lib/gameTypes";
import type { Hex } from "@/lib/hexGrid";
import type { BoardGraph } from "@/lib/boardGraph";
import type { Scene3DProps } from "./scene";

const Scene3D = dynamic(
  () => import("./scene").then((m) => ({ default: m.Scene3D })),
  { ssr: false },
);

// ─── Types ───────────────────────────────────────────────────────────────────

type GamePhase = "setup1" | "setup2" | "main";

const INITIAL_PLAYERS: Player[] = [
  { id: "p1", name: "TUTANKHAMIN", color: "#d97706", settlements: [], cities: [], roads: [], resources: { ...EMPTY_RESOURCES } },
  { id: "p2", name: "NASSIR",      color: "#2563eb", settlements: [], cities: [], roads: [], resources: { ...EMPTY_RESOURCES } },
  { id: "p3", name: "JEAN",        color: "#16a34a", settlements: [], cities: [], roads: [], resources: { ...EMPTY_RESOURCES } },
  { id: "p4", name: "CANDAMIR",    color: "#dc2626", settlements: [], cities: [], roads: [], resources: { ...EMPTY_RESOURCES } },
];

const RESOURCE_ICON: Record<ResourceType, string> = {
  lumber: "🪵", brick: "🧱", wool: "🐑", grain: "🌾", ore: "⛏",
};

const MAX_ROADS = 15;
const MAX_SETTLEMENTS = 5;
const MAX_CITIES = 4;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function recalcLR(nextPlayers: Player[], graph: BoardGraph, currentHolder: string | null): string | null {
  const lengths = new Map(nextPlayers.map((p) => [p.id, computeLongestRoad(p.id, graph, nextPlayers)]));
  if (currentHolder !== null) {
    const holderLen = lengths.get(currentHolder) ?? 0;
    if (holderLen >= 5) {
      let bestLen = holderLen, bestId = currentHolder;
      for (const [id, len] of lengths) if (len > bestLen) { bestLen = len; bestId = id; }
      return bestId;
    }
  }
  let bestId: string | null = null, bestLen = 4;
  for (const [id, len] of lengths) if (len > bestLen) { bestLen = len; bestId = id; }
  return bestId;
}

function computeVP(p: Player, lrHolder: string | null): number {
  return p.settlements.length + p.cities.length * 2 + (lrHolder === p.id ? 2 : 0);
}

function getValidIntersections(actionMode: ActionMode, graph: BoardGraph, players: Player[], playerId: string): Set<string> {
  const valid = new Set<string>();
  if (actionMode !== "settlement" && actionMode !== "city") return valid;
  for (const [id] of graph.intersections) {
    if (actionMode === "settlement" && canPlaceSettlement(id, graph, players, playerId)) valid.add(id);
    else if (actionMode === "city" && canUpgradeCity(id, players, playerId)) valid.add(id);
  }
  return valid;
}

function getValidEdges(actionMode: ActionMode, graph: BoardGraph, players: Player[], playerId: string, setupConstraint: string | null): Set<string> {
  const valid = new Set<string>();
  if (actionMode !== "road") return valid;
  for (const [id, edge] of graph.edges) {
    if (setupConstraint && !edge.intersections.includes(setupConstraint)) continue;
    if (canPlaceRoad(id, graph, players, playerId)) valid.add(id);
  }
  return valid;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Test3DPage() {
  const [hexes, setHexes] = useState<Hex[]>(BEGINNER_BOARD);
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [actionMode, setActionMode] = useState<ActionMode>("settlement");
  const [longestRoadHolder, setLongestRoadHolder] = useState<string | null>(null);
  const [setupConstraint, setSetupConstraint] = useState<string | null>(null);
  const [phase, setPhase] = useState<GamePhase>("setup1");
  const [diceRolled, setDiceRolled] = useState(false);
  const [diceValues, setDiceValues] = useState<[number, number] | null>(null);
  const [robberHex, setRobberHex] = useState<string>(() => {
    const d = BEGINNER_BOARD.find((h) => h.type === "desert");
    return d ? `${d.q},${d.r}` : "0,0";
  });
  const [stealTargets, setStealTargets] = useState<string[]>([]);

  const graph = useMemo(() => buildBoardGraph(hexes), [hexes]);
  const currentPlayer = players[currentPlayerIndex];
  const isSetup = phase !== "main";

  const winner = useMemo(
    () => players.find((p) => computeVP(p, longestRoadHolder) >= 10) ?? null,
    [players, longestRoadHolder],
  );

  const validIntersections = useMemo(
    () => getValidIntersections(actionMode, graph, players, currentPlayer.id),
    [actionMode, graph, players, currentPlayer.id],
  );

  const validEdges = useMemo(
    () => getValidEdges(actionMode, graph, players, currentPlayer.id, setupConstraint),
    [actionMode, graph, players, currentPlayer.id, setupConstraint],
  );

  // ─── Setup turn advancement ────────────────────────────────────────────────

  function advanceSetupTurn() {
    setSetupConstraint(null);
    if (phase === "setup1") {
      if (currentPlayerIndex === players.length - 1) {
        setPhase("setup2");
        setActionMode("settlement");
      } else {
        setCurrentPlayerIndex((i) => i + 1);
        setActionMode("settlement");
      }
    } else if (phase === "setup2") {
      if (currentPlayerIndex === 0) {
        setPhase("main");
        setCurrentPlayerIndex(0);
        setActionMode("idle");
      } else {
        setCurrentPlayerIndex((i) => i - 1);
        setActionMode("settlement");
      }
    }
  }

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function handleIntersectionClick(id: string) {
    if (actionMode === "settlement") {
      if (!canPlaceSettlement(id, graph, players, currentPlayer.id)) return;
      const nextPlayers = players.map((p) =>
        p.id === currentPlayer.id ? { ...p, settlements: [...p.settlements, id] } : p,
      );
      setPlayers(nextPlayers);
      setLongestRoadHolder(recalcLR(nextPlayers, graph, longestRoadHolder));
      if (isSetup) { setSetupConstraint(id); setActionMode("road"); }
      else { setSetupConstraint(null); setActionMode("idle"); }
    } else if (actionMode === "city") {
      if (!canUpgradeCity(id, players, currentPlayer.id)) return;
      const nextPlayers = players.map((p) =>
        p.id === currentPlayer.id
          ? { ...p, settlements: p.settlements.filter((s) => s !== id), cities: [...p.cities, id] }
          : p,
      );
      setPlayers(nextPlayers);
      setActionMode("idle");
    }
  }

  function handleEdgeClick(id: string) {
    if (actionMode !== "road") return;
    if (setupConstraint) {
      const edge = graph.edges.get(id);
      if (!edge || !edge.intersections.includes(setupConstraint)) return;
    }
    if (!canPlaceRoad(id, graph, players, currentPlayer.id)) return;
    const nextPlayers = players.map((p) =>
      p.id === currentPlayer.id ? { ...p, roads: [...p.roads, id] } : p,
    );
    setPlayers(nextPlayers);
    setLongestRoadHolder(recalcLR(nextPlayers, graph, longestRoadHolder));
    if (isSetup) advanceSetupTurn();
    else { setSetupConstraint(null); setActionMode("idle"); }
  }

  function handleHexClick(hexKey: string) {
    if (actionMode !== "robber") return;
    setRobberHex(hexKey);
    const intIds = graph.hexIntersections.get(hexKey) ?? [];
    const opponentIds = new Set<string>();
    for (const intId of intIds) {
      for (const p of players) {
        if (p.id === currentPlayer.id) continue;
        if (p.settlements.includes(intId) || p.cities.includes(intId)) opponentIds.add(p.id);
      }
    }
    const targets = Array.from(opponentIds).filter((id) => {
      const p = players.find((p) => p.id === id)!;
      return Object.values(p.resources).some((v) => v > 0);
    });
    if (targets.length > 0) { setStealTargets(targets); setActionMode("steal"); }
    else { setStealTargets([]); setActionMode("idle"); }
  }

  function handleSteal(targetId: string) {
    const target = players.find((p) => p.id === targetId)!;
    const available = (Object.keys(target.resources) as ResourceType[]).filter((r) => target.resources[r] > 0);
    if (available.length === 0) return;
    const stolen = available[Math.floor(Math.random() * available.length)];
    setPlayers(players.map((p) => {
      if (p.id === targetId) return { ...p, resources: { ...p.resources, [stolen]: p.resources[stolen] - 1 } };
      if (p.id === currentPlayer.id) return { ...p, resources: { ...p.resources, [stolen]: p.resources[stolen] + 1 } };
      return p;
    }));
    setStealTargets([]);
    setActionMode("idle");
  }

  function rollDice() {
    const d1 = Math.ceil(Math.random() * 6);
    const d2 = Math.ceil(Math.random() * 6);
    const sum = d1 + d2;
    setDiceValues([d1, d2]);
    setDiceRolled(true);
    if (sum !== 7) setPlayers(distributeResources(sum, hexes, graph, players, robberHex));
    else setActionMode("robber");
  }

  function endTurn() {
    setActionMode("idle");
    setSetupConstraint(null);
    setDiceRolled(false);
    setDiceValues(null);
    setCurrentPlayerIndex((i) => (i + 1) % players.length);
  }

  function randomize() {
    const newHexes = generateRandomBoard();
    setHexes(newHexes);
    setPlayers(INITIAL_PLAYERS);
    setCurrentPlayerIndex(0);
    setPhase("setup1");
    setActionMode("settlement");
    setLongestRoadHolder(null);
    setSetupConstraint(null);
    setDiceRolled(false);
    setDiceValues(null);
    const desert = newHexes.find((h) => h.type === "desert");
    setRobberHex(desert ? `${desert.q},${desert.r}` : "0,0");
    setStealTargets([]);
  }

  const diceTotal = diceValues ? diceValues[0] + diceValues[1] : null;
  const totalCards = (Object.values(currentPlayer.resources) as number[]).reduce((a, b) => a + b, 0);

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{
      background: "#05070a",
    }}>
      {/* Figma background layers */}
      {/* Layer 1 — main radial gradient (blue center → dark navy edges) */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 40% 50%, #1e40af 0%, #1e3a8a 35%, #1e3263 52.5%, #1e293b 70%, #0f172a 100%)",
      }} />
      {/* Layer 2 — soft blue glows (30% opacity) */}
      <div className="absolute inset-0 pointer-events-none" style={{
        opacity: 0.30,
        background: [
          "radial-gradient(ellipse 35% 32% at 20% 30%, rgba(59,130,246,0.30) 0%, rgba(30,65,123,0.15) 25%, transparent 50%)",
          "radial-gradient(ellipse 35% 32% at 80% 70%, rgba(59,130,246,0.20) 0%, rgba(30,65,123,0.10) 25%, transparent 50%)",
          "radial-gradient(ellipse 22% 20% at 50% 50%, rgba(96,165,250,0.15) 0%, rgba(48,83,125,0.075) 20%, transparent 40%)",
        ].join(", "),
      }} />
      {/* Layer 3 — subtle lens flares (10% opacity) */}
      <div className="absolute inset-0 pointer-events-none" style={{
        opacity: 0.10,
        background: [
          "radial-gradient(ellipse 4% 4% at 15% 20%, rgba(255,255,255,0.40) 0%, rgba(255,255,255,0.10) 30%, transparent 100%)",
          "radial-gradient(ellipse 3% 3% at 85% 80%, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.08) 30%, transparent 100%)",
          "radial-gradient(ellipse 2% 2% at 50% 50%, rgba(255,255,255,0.20) 0%, transparent 50%)",
        ].join(", "),
      }} />

      {/* ── 3D Canvas ─────────────────────────────────────────────────────── */}
      <div className="absolute inset-0">
        <Scene3D
          hexes={hexes}
          graph={graph}
          players={players}
          robberHex={robberHex}
          validIntersections={validIntersections}
          validEdges={validEdges}
          robberMode={actionMode === "robber"}
          onIntersectionClick={handleIntersectionClick}
          onEdgeClick={handleEdgeClick}
          onHexClick={handleHexClick}
        />
      </div>

      {/* ── Top-left Toolbar ──────────────────────────────────────────────── */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1 px-2 py-1.5"
        style={{ background: "rgba(8,15,30,0.82)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, backdropFilter: "blur(8px)" }}>
        {[
          { icon: "◀", title: "Undo", onClick: undefined },
          { icon: "⛶", title: "Fullscreen", onClick: undefined },
          { icon: "⊡", title: "Screenshot", onClick: undefined },
          { icon: "≡", title: "Stats", onClick: undefined },
          { icon: "⟳", title: "Randomize", onClick: randomize },
          { icon: "✕", title: "Exit", onClick: undefined },
        ].map(({ icon, title, onClick }) => (
          <button key={title} title={title} onClick={onClick}
            className="w-7 h-7 flex items-center justify-center text-xs transition-all"
            style={{
              color: "rgba(255,255,255,0.55)", cursor: onClick ? "pointer" : "default",
              borderRadius: 4,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            {icon}
          </button>
        ))}
      </div>

      {/* ── Right: Player Cards ────────────────────────────────────────────── */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5" style={{ width: 240 }}>
        {players.map((p, i) => {
          const vp = computeVP(p, longestRoadHolder);
          const isActive = i === currentPlayerIndex;
          const resTotal = (Object.values(p.resources) as number[]).reduce((a, b) => a + b, 0);
          const roadLen = computeLongestRoad(p.id, graph, players);
          return (
            <div key={p.id} style={{
              background: isActive ? "rgba(8,15,30,0.95)" : "rgba(8,15,30,0.72)",
              border: `1px solid ${isActive ? p.color : "rgba(255,255,255,0.08)"}`,
              borderRadius: 6, overflow: "hidden",
              boxShadow: isActive ? `0 0 16px ${p.color}44` : "none",
              backdropFilter: "blur(8px)",
            }}>
              {/* Header row */}
              <div className="flex items-center" style={{ background: isActive ? p.color : `${p.color}55`, padding: "5px 8px", gap: 8 }}>
                {/* VP badge */}
                <div className="flex items-center justify-center font-black text-sm"
                  style={{
                    background: "rgba(0,0,0,0.35)", color: "#fff",
                    width: 28, height: 28, borderRadius: 4, flexShrink: 0,
                  }}>
                  {vp}
                </div>
                {/* Name */}
                <span className="font-bold text-xs tracking-wider flex-1 truncate" style={{ color: "#fff" }}>
                  {p.name}
                </span>
                {/* LR badge */}
                {longestRoadHolder === p.id && (
                  <span className="text-xs font-bold px-1" style={{ background: "rgba(255,215,0,0.3)", color: "#ffd700", borderRadius: 3 }}>LR</span>
                )}
              </div>

              {/* Stats row */}
              <div className="flex items-center justify-between px-2 py-1.5" style={{ gap: 6 }}>
                {/* Resource + dev card counts */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>🃏</span>
                    <span className="font-bold text-xs" style={{ color: "rgba(255,255,255,0.85)" }}>{resTotal}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>🏗</span>
                    <span className="font-bold text-xs" style={{ color: "rgba(255,255,255,0.85)" }}>
                      {p.settlements.length}S {p.cities.length}C
                    </span>
                  </div>
                </div>
                {/* Road length */}
                {roadLen > 0 && (
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                    🛣 {roadLen}
                  </span>
                )}
              </div>

              {/* Resource chips — only show for active or if has resources */}
              {(isActive || resTotal > 0) && (
                <div className="flex gap-1 px-2 pb-2 flex-wrap">
                  {(Object.keys(p.resources) as ResourceType[]).map((r) => {
                    const count = p.resources[r];
                    return (
                      <div key={r} className="flex items-center gap-0.5"
                        style={{
                          background: count > 0 ? `${RESOURCE_COLOR[r]}22` : "rgba(255,255,255,0.04)",
                          border: `1px solid ${count > 0 ? RESOURCE_COLOR[r] + "66" : "rgba(255,255,255,0.07)"}`,
                          borderRadius: 3, padding: "1px 5px", opacity: count === 0 ? 0.4 : 1,
                        }}>
                        <span style={{ fontSize: 9 }}>{RESOURCE_ICON[r]}</span>
                        <span className="font-bold" style={{ fontSize: 10, color: "rgba(255,255,255,0.9)", marginLeft: 2 }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Bottom HUD ────────────────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-end justify-between px-3 pb-3 pointer-events-none">

        {/* ── Bottom-left: setup hint / robber / steal ── */}
        <div className="flex flex-col gap-2 pointer-events-auto" style={{ maxWidth: 280 }}>
          {isSetup && (
            <div className="px-4 py-2.5" style={{
              background: "rgba(8,15,30,0.90)", border: `1px solid ${currentPlayer.color}66`,
              borderRadius: 6, backdropFilter: "blur(8px)",
            }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: currentPlayer.color }} />
                <span className="font-bold text-xs tracking-wider" style={{ color: currentPlayer.color }}>{currentPlayer.name}</span>
              </div>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                {actionMode === "settlement" ? "▸ Place a settlement" : "▸ Place a road next to your settlement"}
              </span>
            </div>
          )}

          {actionMode === "robber" && (
            <div className="px-4 py-2.5" style={{
              background: "rgba(30,5,5,0.90)", border: "1px solid rgba(220,50,50,0.6)",
              borderRadius: 6, backdropFilter: "blur(8px)",
            }}>
              <span className="font-bold text-xs tracking-wider" style={{ color: "#ff6666" }}>☠ 7 rolled — click a hex to move the robber</span>
            </div>
          )}

          {actionMode === "steal" && (
            <div className="px-4 py-2.5" style={{
              background: "rgba(30,5,5,0.90)", border: "1px solid rgba(220,50,50,0.6)",
              borderRadius: 6, backdropFilter: "blur(8px)",
            }}>
              <div className="text-xs font-bold mb-2" style={{ color: "#ff6666" }}>☠ Choose who to steal from:</div>
              <div className="flex gap-2">
                {stealTargets.map((pid) => {
                  const p = players.find((p) => p.id === pid)!;
                  return (
                    <button key={pid} onClick={() => handleSteal(pid)}
                      className="px-3 py-1 text-xs font-bold tracking-wider"
                      style={{ background: `${p.color}25`, border: `1px solid ${p.color}88`, color: p.color, borderRadius: 4, cursor: "pointer" }}>
                      {p.name}
                    </button>
                  );
                })}
                <button onClick={() => { setStealTargets([]); setActionMode("idle"); }}
                  className="px-3 py-1 text-xs font-bold"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)", borderRadius: 4, cursor: "pointer" }}>
                  Skip
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Bottom-center: current player resources ── */}
        {!isSetup && (
          <div className="flex flex-col items-center gap-2 pointer-events-auto" style={{ flex: 1, maxWidth: 420, margin: "0 12px" }}>
            {/* Dice result */}
            {diceValues && (
              <div className="flex items-center gap-2 px-4 py-1.5"
                style={{
                  background: "rgba(8,15,30,0.88)", border: `1px solid ${diceTotal === 7 ? "rgba(255,60,60,0.5)" : "rgba(255,215,0,0.3)"}`,
                  borderRadius: 6, backdropFilter: "blur(8px)",
                }}>
                <span style={{ fontSize: 16 }}>🎲</span>
                <span className="font-black text-sm" style={{ color: diceTotal === 7 ? "#ff4444" : "#ffd700" }}>
                  {diceValues[0]} + {diceValues[1]} = {diceTotal}
                </span>
                {diceTotal === 7 && <span className="text-xs font-bold" style={{ color: "#ff6666" }}>ROBBER</span>}
              </div>
            )}

            {/* Resource bar */}
            <div className="flex items-center gap-1.5 px-3 py-2"
              style={{
                background: "rgba(8,15,30,0.90)", border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 8, backdropFilter: "blur(8px)",
              }}>
              {(Object.keys(currentPlayer.resources) as ResourceType[]).map((r) => {
                const count = currentPlayer.resources[r];
                return (
                  <div key={r} className="flex items-center gap-1 px-2 py-1"
                    style={{
                      background: count > 0 ? `${RESOURCE_COLOR[r]}1a` : "rgba(255,255,255,0.03)",
                      border: `1px solid ${count > 0 ? RESOURCE_COLOR[r] + "55" : "rgba(255,255,255,0.07)"}`,
                      borderRadius: 5, opacity: count === 0 ? 0.45 : 1,
                      minWidth: 42, flexDirection: "column", alignItems: "center",
                    }}>
                    <span style={{ fontSize: 14 }}>{RESOURCE_ICON[r]}</span>
                    <span className="font-black text-xs" style={{ color: count > 0 ? "#fff" : "rgba(255,255,255,0.4)", marginTop: 1 }}>{count}</span>
                  </div>
                );
              })}
              <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />
              <div className="flex flex-col items-center px-2 py-1"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 5, minWidth: 36 }}>
                <span style={{ fontSize: 12 }}>🃏</span>
                <span className="font-black text-xs" style={{ color: "rgba(255,255,255,0.6)", marginTop: 1 }}>{totalCards}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Bottom-right: build actions ── */}
        <div className="flex flex-col gap-2 items-end pointer-events-auto" style={{ minWidth: 200 }}>
          {!isSetup && (
            <div style={{
              background: "rgba(8,15,30,0.90)", border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 8, backdropFilter: "blur(8px)", overflow: "hidden",
            }}>
              {/* Piece counts row */}
              <div className="flex items-center border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                {[
                  { label: "ROAD", icon: "🛣", remaining: MAX_ROADS - currentPlayer.roads.length },
                  { label: "SET",  icon: "🏠", remaining: MAX_SETTLEMENTS - currentPlayer.settlements.length },
                  { label: "CITY", icon: "🏙", remaining: MAX_CITIES - currentPlayer.cities.length },
                ].map(({ label, icon, remaining }) => (
                  <div key={label} className="flex flex-col items-center px-3 py-2"
                    style={{ borderRight: "1px solid rgba(255,255,255,0.07)", flex: 1 }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{label}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span style={{ fontSize: 10 }}>{icon}</span>
                      <span className="font-black text-sm" style={{ color: remaining > 0 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.2)" }}>{remaining}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action buttons row */}
              {actionMode !== "robber" && actionMode !== "steal" && (
                <div className="flex" style={{ gap: 0 }}>
                  {/* Build buttons */}
                  {diceRolled && (["settlement", "city", "road"] as ActionMode[]).map((mode, idx) => {
                    const active = actionMode === mode;
                    return (
                      <button key={mode}
                        onClick={() => setActionMode((prev) => (prev === mode ? "idle" : mode))}
                        className="flex-1 py-2 text-xs font-bold tracking-wide uppercase transition-all"
                        style={{
                          background: active ? `${currentPlayer.color}30` : "transparent",
                          color: active ? currentPlayer.color : "rgba(255,255,255,0.45)",
                          borderRight: idx < 2 ? "1px solid rgba(255,255,255,0.07)" : "none",
                          cursor: "pointer",
                        }}>
                        {mode === "settlement" ? "SET" : mode === "city" ? "CITY" : "ROAD"}
                      </button>
                    );
                  })}

                  {/* Separator */}
                  {diceRolled && <div style={{ width: 1, background: "rgba(255,255,255,0.07)" }} />}

                  {/* Roll / Next */}
                  {!diceRolled ? (
                    <button onClick={rollDice}
                      className="flex-1 py-2.5 text-xs font-bold tracking-wide uppercase"
                      style={{
                        background: "rgba(255,215,0,0.15)", color: "#ffd700",
                        width: "100%", cursor: "pointer",
                      }}>
                      🎲 ROLL
                    </button>
                  ) : (
                    <button onClick={endTurn}
                      className="px-4 py-2.5 text-xs font-bold tracking-wide uppercase"
                      style={{
                        background: "rgba(22,163,74,0.20)", color: "#4ade80",
                        cursor: "pointer", whiteSpace: "nowrap",
                      }}>
                      NEXT ✓
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Setup: randomize button */}
          {isSetup && (
            <button onClick={randomize}
              className="px-4 py-2 text-xs font-bold tracking-wider uppercase"
              style={{
                background: "rgba(8,15,30,0.90)", border: "1px solid rgba(255,215,0,0.3)",
                color: "rgba(255,215,0,0.7)", borderRadius: 6, cursor: "pointer",
                backdropFilter: "blur(8px)",
              }}>
              ⟳ Randomize
            </button>
          )}
        </div>
      </div>

      {/* ── Winner overlay ────────────────────────────────────────────────── */}
      {winner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="flex flex-col items-center gap-4 px-12 py-10"
            style={{
              background: "rgba(5,10,25,0.97)", border: `2px solid ${winner.color}`,
              boxShadow: `0 0 80px ${winner.color}44`, borderRadius: 10,
            }}>
            <div className="text-5xl font-black tracking-widest uppercase" style={{ color: winner.color }}>{winner.name}</div>
            <div className="text-sm tracking-widest uppercase" style={{ color: "#ffd700" }}>
              🏆 wins with {computeVP(winner, longestRoadHolder)} victory points
            </div>
            <button onClick={randomize}
              className="mt-2 px-8 py-2.5 text-xs font-bold tracking-widest uppercase"
              style={{ background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.5)", color: "#ffd700", cursor: "pointer", borderRadius: 5 }}>
              ⟳ New Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
