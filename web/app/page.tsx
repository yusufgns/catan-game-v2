"use client";

import { useState, useMemo } from "react";
import { HexBoard } from "@/components/board/HexBoard";
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
import { TERRAIN_CONFIG } from "@/lib/hexGrid";
import type { BoardGraph } from "@/lib/boardGraph";
import { LogCard, type LogEntry } from "@/components/ui/LogCard";
import { TradeDialog, type TradeDoneEvent } from "@/components/ui/TradeDialog";
import { playerTradeRates } from "@/lib/harborUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

type GamePhase = "setup1" | "setup2" | "main";

// ─── Initial Players ─────────────────────────────────────────────────────────

const INITIAL_PLAYERS: Player[] = [
  { id: "p1", name: "Player 1", color: "#2563eb", settlements: [], cities: [], roads: [], resources: { ...EMPTY_RESOURCES } },
  { id: "p2", name: "Player 2", color: "#dc2626", settlements: [], cities: [], roads: [], resources: { ...EMPTY_RESOURCES } },
  { id: "p3", name: "Player 3", color: "#16a34a", settlements: [], cities: [], roads: [], resources: { ...EMPTY_RESOURCES } },
  { id: "p4", name: "Player 4", color: "#d97706", settlements: [], cities: [], roads: [], resources: { ...EMPTY_RESOURCES } },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function recalcLR(
  nextPlayers: Player[],
  graph: BoardGraph,
  currentHolder: string | null,
): string | null {
  const lengths = new Map(
    nextPlayers.map((p) => [p.id, computeLongestRoad(p.id, graph, nextPlayers)]),
  );
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [hexes, setHexes] = useState<Hex[]>(BEGINNER_BOARD);
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [actionMode, setActionMode] = useState<ActionMode>("settlement"); // start in setup
  const [longestRoadHolder, setLongestRoadHolder] = useState<string | null>(null);
  const [setupConstraint, setSetupConstraint] = useState<string | null>(null);

  // Phase management
  const [phase, setPhase] = useState<GamePhase>("setup1");
  const [diceRolled, setDiceRolled] = useState(false);
  const [diceValues, setDiceValues] = useState<[number, number] | null>(null);
  // Resource gains from last dice roll, for display (playerId → gains)
  const [lastGains, setLastGains] = useState<Map<string, Partial<Record<ResourceType, number>>>>(new Map());
  // Robber: starts on desert hex (q=0,r=0 in BEGINNER_BOARD)
  const [robberHex, setRobberHex] = useState<string>(() => {
    const d = BEGINNER_BOARD.find((h) => h.type === "desert");
    return d ? `${d.q},${d.r}` : "0,0";
  });
  const [stealTargets, setStealTargets] = useState<string[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([{ type: "phase", turn: 1, label: "── Setup Round 1 ──" }]);
  const [turnCounter, setTurnCounter] = useState(1);
  const [tradeOpen, setTradeOpen] = useState(false);

  const graph = useMemo(() => buildBoardGraph(hexes), [hexes]);
  const currentPlayer = players[currentPlayerIndex];
  const isSetup = phase !== "main";

  const winner = useMemo(
    () => players.find((p) => computeVP(p, longestRoadHolder) >= 10) ?? null,
    [players, longestRoadHolder],
  );

  // ─── Log helper ─────────────────────────────────────────────────────────────

  function addLog(entry: LogEntry) {
    setLogs(prev => [...prev, entry]);
  }

  // ─── Setup turn advancement ──────────────────────────────────────────────────

  function advanceSetupTurn() {
    setSetupConstraint(null);
    if (phase === "setup1") {
      if (currentPlayerIndex === players.length - 1) {
        setPhase("setup2");
        setActionMode("settlement");
        addLog({ type: "phase", turn: turnCounter, label: "── Setup Round 2 ──" });
      } else {
        setCurrentPlayerIndex((i) => i + 1);
        setActionMode("settlement");
      }
    } else if (phase === "setup2") {
      if (currentPlayerIndex === 0) {
        setPhase("main");
        setCurrentPlayerIndex(0);
        setActionMode("idle");
        addLog({ type: "phase", turn: turnCounter, label: "── Main Game ──" });
      } else {
        setCurrentPlayerIndex((i) => i - 1);
        setActionMode("settlement");
      }
    }
  }

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function handleIntersectionClick(id: string) {
    if (actionMode === "settlement") {
      if (!canPlaceSettlement(id, graph, players, currentPlayer.id)) return;
      const nextPlayers = players.map((p) =>
        p.id === currentPlayer.id ? { ...p, settlements: [...p.settlements, id] } : p,
      );
      setPlayers(nextPlayers);
      setLongestRoadHolder(recalcLR(nextPlayers, graph, longestRoadHolder));
      addLog({ type: "build", turn: turnCounter, player: currentPlayer.name, color: currentPlayer.color, what: "settlement" });
      if (isSetup) {
        // After setup settlement: must place road adjacent to it
        setSetupConstraint(id);
        setActionMode("road");
      } else {
        setSetupConstraint(null);
        setActionMode("idle");
      }
    } else if (actionMode === "city") {
      if (!canUpgradeCity(id, players, currentPlayer.id)) return;
      const nextPlayers = players.map((p) =>
        p.id === currentPlayer.id
          ? { ...p, settlements: p.settlements.filter((s) => s !== id), cities: [...p.cities, id] }
          : p,
      );
      setPlayers(nextPlayers);
      addLog({ type: "build", turn: turnCounter, player: currentPlayer.name, color: currentPlayer.color, what: "city" });
      setActionMode("idle");
    }
  }

  function handleEdgeClick(id: string) {
    if (actionMode !== "road") return;
    // Enforce setup constraint: road must connect to last placed settlement
    if (setupConstraint) {
      const edge = graph.edges.get(id);
      if (!edge || !edge.intersections.includes(setupConstraint)) return;
    }
    if (!canPlaceRoad(id, graph, players, currentPlayer.id)) return;
    const nextPlayers = players.map((p) =>
      p.id === currentPlayer.id ? { ...p, roads: [...p.roads, id] } : p,
    );
    setPlayers(nextPlayers);
    const newLRHolder = recalcLR(nextPlayers, graph, longestRoadHolder);
    setLongestRoadHolder(newLRHolder);
    addLog({ type: "build", turn: turnCounter, player: currentPlayer.name, color: currentPlayer.color, what: "road" });
    if (newLRHolder && newLRHolder !== longestRoadHolder) {
      const lrPlayer = nextPlayers.find(p => p.id === newLRHolder)!;
      addLog({ type: "longest", turn: turnCounter, player: lrPlayer.name, color: lrPlayer.color });
    }
    if (isSetup) {
      advanceSetupTurn();
    } else {
      setSetupConstraint(null);
      setActionMode("idle");
    }
  }

  function rollDice() {
    const d1 = Math.ceil(Math.random() * 6);
    const d2 = Math.ceil(Math.random() * 6);
    const sum = d1 + d2;
    setDiceValues([d1, d2]);
    setDiceRolled(true);
    addLog({ type: "dice", turn: turnCounter, player: currentPlayer.name, color: currentPlayer.color, d1, d2 });

    if (sum !== 7) {
      const nextPlayers = distributeResources(sum, hexes, graph, players, robberHex);
      setPlayers(nextPlayers);
      // Compute gains for display + log
      const gains = new Map<string, Partial<Record<ResourceType, number>>>();
      for (const p of players) {
        const next = nextPlayers.find((n) => n.id === p.id)!;
        const diff: Partial<Record<ResourceType, number>> = {};
        for (const r of Object.keys(p.resources) as ResourceType[]) {
          const d = next.resources[r] - p.resources[r];
          if (d > 0) diff[r] = d;
        }
        if (Object.keys(diff).length > 0) {
          gains.set(p.id, diff);
          addLog({ type: "gain", turn: turnCounter, player: p.name, color: p.color, gains: diff });
        }
      }
      setLastGains(gains);
    } else {
      // 7 rolled: must move robber
      setLastGains(new Map());
      setActionMode("robber");
    }
  }

  function handleHexClick(hexKey: string) {
    if (actionMode !== "robber") return;
    setRobberHex(hexKey);
    const movedHex = hexes.find(h => `${h.q},${h.r}` === hexKey);
    const hexLabel = movedHex
      ? `${TERRAIN_CONFIG[movedHex.type].label}${movedHex.number ? ` (${movedHex.number})` : ""}`
      : hexKey;
    addLog({ type: "robber", turn: turnCounter, player: currentPlayer.name, color: currentPlayer.color, hexLabel });

    // Find opponents with buildings adjacent to the new robber hex
    const intIds = graph.hexIntersections.get(hexKey) ?? [];
    const opponentIds = new Set<string>();
    for (const intId of intIds) {
      for (const p of players) {
        if (p.id === currentPlayer.id) continue;
        if (p.settlements.includes(intId) || p.cities.includes(intId)) {
          opponentIds.add(p.id);
        }
      }
    }
    // Only target opponents who actually have resources to steal
    const targets = Array.from(opponentIds).filter((id) => {
      const p = players.find((p) => p.id === id)!;
      return Object.values(p.resources).some((v) => v > 0);
    });

    if (targets.length > 0) {
      setStealTargets(targets);
      setActionMode("steal");
    } else {
      setStealTargets([]);
      setActionMode("idle");
    }
  }

  function handleSteal(targetId: string) {
    const target = players.find((p) => p.id === targetId)!;
    const available = (Object.keys(target.resources) as ResourceType[]).filter(
      (r) => target.resources[r] > 0,
    );
    if (available.length === 0) return;
    const stolen = available[Math.floor(Math.random() * available.length)];
    const targetPlayer = players.find(p => p.id === targetId)!;
    setPlayers(
      players.map((p) => {
        if (p.id === targetId)
          return { ...p, resources: { ...p.resources, [stolen]: p.resources[stolen] - 1 } };
        if (p.id === currentPlayer.id)
          return { ...p, resources: { ...p.resources, [stolen]: p.resources[stolen] + 1 } };
        return p;
      }),
    );
    addLog({ type: "steal", turn: turnCounter, player: currentPlayer.name, color: currentPlayer.color, from: targetPlayer.name, fromColor: targetPlayer.color, resource: stolen });
    setStealTargets([]);
    setActionMode("idle");
  }

  function endTurn() {
    setActionMode("idle");
    setSetupConstraint(null);
    setDiceRolled(false);
    setDiceValues(null);
    setLastGains(new Map());
    setTurnCounter(t => t + 1);
    setCurrentPlayerIndex((i) => (i + 1) % players.length);
  }

  function handleTrade(e: TradeDoneEvent) {
    const ALL: ResourceType[] = ["lumber", "brick", "wool", "grain", "ore"];
    if (e.mode === "bank") {
      setPlayers(prev => prev.map(p => {
        if (p.id !== currentPlayer.id) return p;
        const res = { ...p.resources };
        for (const r of ALL) {
          res[r] -= (e.offer[r] ?? 0);
          res[r] += (e.want[r] ?? 0);
        }
        return { ...p, resources: res };
      }));
      addLog({
        type: "trade", turn: turnCounter,
        player: currentPlayer.name, color: currentPlayer.color,
        mode: "bank", offer: e.offer, want: e.want,
      });
    } else if (e.targetId) {
      const target = players.find(p => p.id === e.targetId);
      if (!target) return;
      setPlayers(prev => prev.map(p => {
        const res = { ...p.resources };
        if (p.id === currentPlayer.id) {
          for (const r of ALL) {
            res[r] -= (e.offer[r] ?? 0);
            res[r] += (e.want[r] ?? 0);
          }
        } else if (p.id === e.targetId) {
          for (const r of ALL) {
            res[r] += (e.offer[r] ?? 0);
            res[r] -= (e.want[r] ?? 0);
          }
        }
        return { ...p, resources: res };
      }));
      addLog({
        type: "trade", turn: turnCounter,
        player: currentPlayer.name, color: currentPlayer.color,
        mode: "player", offer: e.offer, want: e.want,
        with: target.name, withColor: target.color,
      });
    }
    setTradeOpen(false);
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
    setLastGains(new Map());
    const desert = newHexes.find((h) => h.type === "desert");
    setRobberHex(desert ? `${desert.q},${desert.r}` : "0,0");
    setStealTargets([]);
    setLogs([{ type: "phase", turn: 1, label: "── Setup Round 1 ──" }]);
    setTurnCounter(1);
    setTradeOpen(false);
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  const diceTotal = diceValues ? diceValues[0] + diceValues[1] : null;

  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 30%, #0a0a1f 0%, #05050f 70%)" }}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div style={{ background: "rgba(10,10,20,0.9)", border: "1px solid rgba(0,212,255,0.3)", padding: "6px 20px 6px 12px" }}>
            <span className="text-sm font-bold tracking-widest uppercase" style={{ color: "#00d4ff" }}>CATAN v2</span>
          </div>
          <a href="/game-3d" className="text-xs font-bold tracking-widest uppercase px-3 py-1.5"
            style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.4)", color: "#00d4ff", textDecoration: "none" }}>
            3D Map →
          </a>
        </div>

        <div className="flex gap-3 items-center">
          {/* Phase badge */}
          <div className="px-3 py-1 text-xs font-bold tracking-widest uppercase"
            style={{ background: "rgba(10,10,20,0.9)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)" }}>
            {phase === "setup1" ? "Setup Round 1" : phase === "setup2" ? "Setup Round 2" : "Main Game"}
          </div>

          {/* Current player */}
          <div className="flex items-center gap-2 px-3 py-1 text-sm font-bold"
            style={{ background: "rgba(10,10,20,0.9)", border: `1px solid ${currentPlayer.color}55`, color: currentPlayer.color }}>
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: currentPlayer.color }} />
            {currentPlayer.name}
          </div>

          {/* Longest road badge */}
          {longestRoadHolder && (
            <div className="px-3 py-1 text-xs font-bold tracking-widest uppercase"
              style={{ background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.4)", color: "#ffd700" }}>
              🏆 LR: {players.find((p) => p.id === longestRoadHolder)?.name}
            </div>
          )}

          {/* Dice result */}
          {diceValues && (
            <div className="flex items-center gap-1 px-3 py-1 text-sm font-bold"
              style={{ background: "rgba(10,10,20,0.9)", border: "1px solid rgba(255,255,255,0.2)", color: diceTotal === 7 ? "#ff4444" : "#ffffff" }}>
              🎲 {diceValues[0]} + {diceValues[1]} = <span style={{ color: diceTotal === 7 ? "#ff4444" : "#ffd700" }}>{diceTotal}</span>
            </div>
          )}

          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#00d4ff" }} />
        </div>
      </div>

      {/* Board */}
      <div className="w-full h-full flex items-center justify-center" style={{ paddingTop: "60px", paddingBottom: "160px", overflow: "hidden" }}>
        <HexBoard
          hexes={hexes}
          graph={graph}
          players={players}
          currentPlayerId={currentPlayer.id}
          actionMode={actionMode}
          setupConstraint={setupConstraint}
          robberHex={robberHex}
          onIntersectionClick={handleIntersectionClick}
          onEdgeClick={handleEdgeClick}
          onHexClick={handleHexClick}
        />
      </div>

      {/* Bottom panel */}
      <div className="fixed bottom-0 left-0 right-0 z-50"
        style={{ background: "rgba(5,5,15,0.95)", borderTop: "1px solid rgba(0,212,255,0.15)" }}>

        {/* ── Setup phase guidance ── */}
        {isSetup && (
          <div className="flex items-center justify-center gap-4 px-4 pt-3 pb-2">
            <div className="flex items-center gap-3 px-5 py-2"
              style={{ background: `${currentPlayer.color}14`, border: `1px solid ${currentPlayer.color}55` }}>
              <div className="w-2 h-2 rounded-full" style={{ background: currentPlayer.color }} />
              <span className="text-sm font-bold" style={{ color: currentPlayer.color }}>{currentPlayer.name}</span>
              <span className="text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>
                {actionMode === "settlement" ? "▸ Place a settlement" : "▸ Place a road next to your settlement"}
              </span>
            </div>
            <button onClick={randomize}
              className="px-4 py-1.5 text-xs font-bold tracking-widest uppercase"
              style={{ background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.3)", color: "rgba(255,215,0,0.7)", cursor: "pointer" }}>
              ⟳ Randomize
            </button>
          </div>
        )}

        {/* ── Main phase controls ── */}
        {!isSetup && (
          <div className="flex items-center justify-center gap-2 px-4 pt-3 pb-2">

            {/* Robber: move to a hex */}
            {actionMode === "robber" && (
              <div className="flex items-center gap-2 px-4 py-1.5"
                style={{ background: "rgba(200,30,30,0.15)", border: "1px solid rgba(200,30,30,0.5)", color: "#ff6666" }}>
                <span className="text-xs font-bold tracking-widest uppercase">☠ 7 rolled — move the robber</span>
              </div>
            )}

            {/* Steal: choose a player to steal from */}
            {actionMode === "steal" && (
              <>
                <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#ff6666" }}>☠ Steal from:</span>
                {stealTargets.map((pid) => {
                  const p = players.find((p) => p.id === pid)!;
                  return (
                    <button key={pid} onClick={() => handleSteal(pid)}
                      className="px-4 py-1.5 text-xs font-bold tracking-widest uppercase"
                      style={{ background: `${p.color}20`, border: `1px solid ${p.color}88`, color: p.color, cursor: "pointer" }}>
                      {p.name}
                    </button>
                  );
                })}
                <button onClick={() => { setStealTargets([]); setActionMode("idle"); }}
                  className="px-3 py-1.5 text-xs font-bold tracking-widest uppercase"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
                  Skip
                </button>
              </>
            )}

            {/* Roll Dice — required first */}
            {actionMode !== "robber" && actionMode !== "steal" && !diceRolled ? (
              <button onClick={rollDice}
                className="px-5 py-1.5 text-xs font-bold tracking-widest uppercase"
                style={{ background: "rgba(255,215,0,0.18)", border: "1px solid rgba(255,215,0,0.6)", color: "#ffd700", cursor: "pointer" }}>
                🎲 Roll Dice
              </button>
            ) : actionMode !== "robber" && actionMode !== "steal" ? (
              <>
                {(["settlement", "city", "road"] as ActionMode[]).map((mode) => (
                  <button key={mode}
                    onClick={() => setActionMode((prev) => (prev === mode ? "idle" : mode))}
                    className="px-4 py-1.5 text-xs font-bold tracking-widest uppercase transition-all"
                    style={{
                      background: actionMode === mode ? (mode === "road" ? "rgba(255,165,0,0.25)" : "rgba(0,255,136,0.2)") : "rgba(255,255,255,0.05)",
                      border: actionMode === mode ? (mode === "road" ? "1px solid rgba(255,165,0,0.6)" : "1px solid rgba(0,255,136,0.5)") : "1px solid rgba(255,255,255,0.1)",
                      color: actionMode === mode ? (mode === "road" ? "#ffa500" : "#00ff88") : "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                    }}>
                    + {mode}
                  </button>
                ))}

                <button
                  onClick={() => setTradeOpen(true)}
                  className="px-4 py-1.5 text-xs font-bold tracking-widest uppercase"
                  style={{
                    background: tradeOpen ? "rgba(0,212,255,0.2)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${tradeOpen ? "rgba(0,212,255,0.5)" : "rgba(255,255,255,0.1)"}`,
                    color: tradeOpen ? "#00d4ff" : "rgba(255,255,255,0.5)",
                    cursor: "pointer",
                  }}>
                  ⇄ Trade
                </button>

                <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.1)" }} />

                <button onClick={endTurn}
                  className="px-4 py-1.5 text-xs font-bold tracking-widest uppercase"
                  style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.4)", color: "#00d4ff", cursor: "pointer" }}>
                  End Turn →
                </button>
              </>
            ) : null}

            <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.1)" }} />

            <button onClick={randomize}
              className="px-4 py-1.5 text-xs font-bold tracking-widest uppercase"
              style={{ background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.3)", color: "rgba(255,215,0,0.7)", cursor: "pointer" }}>
              ⟳ Randomize
            </button>
          </div>
        )}

        {/* Player stats row */}
        <div className="flex justify-center gap-3 px-4 pb-3 flex-wrap">
          {players.map((p, i) => {
            const roadLen = computeLongestRoad(p.id, graph, players);
            const vp = computeVP(p, longestRoadHolder);
            const isActive = i === currentPlayerIndex;
            const gains = lastGains.get(p.id);
            return (
              <div key={p.id} className="flex flex-col gap-1 px-3 py-1.5 text-xs"
                style={{
                  background: isActive ? `${p.color}18` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${isActive ? p.color + "66" : "rgba(255,255,255,0.08)"}`,
                  color: isActive ? p.color : "rgba(255,255,255,0.45)",
                  transition: "all 0.2s",
                  minWidth: 160,
                }}>
                {/* Name + VP + buildings */}
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: p.color, opacity: isActive ? 1 : 0.5 }} />
                  <span className="font-bold">{p.name}</span>
                  <span className="font-bold px-1.5"
                    style={{
                      background: vp >= 10 ? "rgba(255,215,0,0.25)" : "rgba(255,255,255,0.06)",
                      border: `1px solid ${vp >= 10 ? "#ffd700" : "rgba(255,255,255,0.12)"}`,
                      color: vp >= 10 ? "#ffd700" : "inherit",
                      borderRadius: 2,
                    }}>
                    {vp} VP
                  </span>
                  <span style={{ opacity: 0.7 }}>
                    🏠{p.settlements.length} 🏙{p.cities.length} 🛣{p.roads.length}
                    {roadLen > 0 && ` (${roadLen})`}
                  </span>
                  {longestRoadHolder === p.id && <span style={{ color: "#ffd700", fontSize: 10 }}>★LR</span>}
                </div>
                {/* Resources */}
                <div className="flex gap-1.5 flex-wrap">
                  {(Object.keys(p.resources) as ResourceType[]).map((r) => {
                    const count = p.resources[r];
                    const gain = gains?.[r];
                    return (
                      <div key={r} className="flex items-center gap-0.5 px-1"
                        style={{
                          background: count > 0 ? `${RESOURCE_COLOR[r]}18` : "rgba(255,255,255,0.03)",
                          border: `1px solid ${count > 0 ? RESOURCE_COLOR[r] + "55" : "rgba(255,255,255,0.06)"}`,
                          borderRadius: 2,
                          opacity: count === 0 ? 0.45 : 1,
                        }}>
                        <span style={{ color: RESOURCE_COLOR[r], fontSize: 9, fontWeight: 700 }}>
                          {RESOURCE_LABEL[r].slice(0, 2).toUpperCase()}
                        </span>
                        <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 700, fontSize: 10, marginLeft: 2 }}>
                          {count}
                        </span>
                        {gain && (
                          <span style={{ color: RESOURCE_COLOR[r], fontSize: 9, marginLeft: 1 }}>+{gain}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Log card */}
      <LogCard entries={logs} />

      {/* Trade dialog */}
      <TradeDialog
        open={tradeOpen}
        currentPlayer={currentPlayer}
        otherPlayers={players.filter(p => p.id !== currentPlayer.id)}
        onTrade={handleTrade}
        onClose={() => setTradeOpen(false)}
      />

      {/* Winner overlay */}
      {winner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
          <div className="flex flex-col items-center gap-4 px-12 py-8"
            style={{ background: "rgba(5,5,20,0.97)", border: `2px solid ${winner.color}`, boxShadow: `0 0 60px ${winner.color}55` }}>
            <div className="text-4xl font-black tracking-widest uppercase" style={{ color: winner.color }}>{winner.name}</div>
            <div className="text-sm tracking-widest uppercase" style={{ color: "#ffd700" }}>
              🏆 wins with {computeVP(winner, longestRoadHolder)} victory points
            </div>
            <button onClick={randomize} className="mt-2 px-6 py-2 text-xs font-bold tracking-widest uppercase"
              style={{ background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.5)", color: "#ffd700", cursor: "pointer" }}>
              ⟳ New Game
            </button>
          </div>
        </div>
      )}

      {/* Bottom gradient line */}
      <div className="fixed bottom-0 left-0 right-0 h-px pointer-events-none z-50"
        style={{ background: "linear-gradient(90deg, transparent, #00d4ff44, #ffd70044, #ff00aa44, transparent)" }} />
    </div>
  );
}
