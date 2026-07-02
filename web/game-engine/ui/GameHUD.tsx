"use client";

import { useState, useEffect, useRef } from "react";
import PlayerCard from "./PlayerCard";
import ActionBar from "./ActionBar";
import ResourceBar from "./ResourceBar";
import DevCardBar from "./DevCardBar";
import SideMenu, { LeaveGameDialog, ChatPanel, LogPanel } from "./SideMenu";
import TurnTimer from "./TurnTimer";
import TradeDialog, { IncomingTradeBanner, MyOfferPanel } from "./TradeDialog";
import DiscardDialog from "./DiscardDialog";
import VictoryOverlay from "./VictoryOverlay";
import type { GameSnapshot } from "./useGameState";

interface GameHUDProps {
  state: GameSnapshot;
  actions: {
    rollDice: () => void;
    endTurn: () => void;
    setActionMode: (mode: string) => void;
    handleSteal: (targetId: string) => void;
    buyDevCard: () => void;
    reset: () => void;
    maritimeTrade: (give: { resource: string; amount: number }, want: string) => void;
    offerTrade: (offer: Record<string, number>, want: Record<string, number>, targetPlayer?: string) => void;
    acceptTrade: (tradeId: string, withPlayer?: string) => void;
    rejectTrade: (tradeId: string) => void;
    discardResources: (resources: Record<string, number>) => void;
  };
  computeVP: (player: any) => number;
}

export default function GameHUD({ state, actions, computeVP }: GameHUDProps) {
  const {
    players, currentPlayer, currentPlayerIndex, isSetup,
    actionMode, diceRolled, diceValues, longestRoadHolder, stealTargets,
    activeTrades, myPlayerId, discardRequired, discardDeadline,
  } = state;

  const [chatOpen, setChatOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);

  // Trade is allowed for the active player after dice are rolled, not during robber phases.
  // Multiple offers may coexist; canTrade just gates opening the dialog.
  const isMyTurn = myPlayerId ? currentPlayer.id === myPlayerId : true;
  const isRobberPhase = actionMode === "robber" || actionMode === "steal";
  const canTrade = !isSetup && diceRolled && isMyTurn && !isRobberPhase;

  const myId = myPlayerId ?? currentPlayer.id;
  const me = players.find(p => p.id === myId) ?? currentPlayer;
  const opponents = players.filter(p => p.id !== myId);

  // Partition trades: ones I sent (myOpenOffers) vs ones targeting me (incomingTrades)
  const myOpenOffers = activeTrades.filter(t => t.fromPlayerId === myId);
  const incomingTrades = activeTrades.filter(t =>
    t.fromPlayerId !== myId && (t.toPlayerId === undefined || t.toPlayerId === myId)
  );

  // Game logs — sourced from server in multiplayer, state diff in local
  const [gameLogs, setGameLogs] = useState<string[]>([]);
  const prevStateRef = useRef<GameSnapshot | null>(null);

  // Listen for server logs (multiplayer)
  useEffect(() => {
    const handler = () => {
      const logs = (window as any).__catanGameLogs;
      if (logs) setGameLogs([...logs]);
    };
    (window as any).__catanGameLogsUpdated = handler;
    // Check if logs already exist (reconnect)
    if ((window as any).__catanGameLogs?.length > 0) handler();
    return () => { (window as any).__catanGameLogsUpdated = null; };
  }, []);

  // Fallback: generate logs from state diff (local mode)
  useEffect(() => {
    // Skip if server logs are being used
    if ((window as any).__catanGameLogs?.length > 0) return;

    const prev = prevStateRef.current;
    prevStateRef.current = state;
    if (!prev || !state) return;

    const logs: string[] = [];
    const cp = state.currentPlayer;
    const pp = prev.currentPlayer;

    if (state.diceRolled && !prev.diceRolled && state.diceValues) {
      const total = state.diceValues[0] + state.diceValues[1];
      logs.push(`🎲 ${pp?.name || cp?.name} zar attı: ${state.diceValues[0]}+${state.diceValues[1]}=${total}`);
      if (total === 7) logs.push(`☠️ 7 geldi — Robber hareket etmeli`);
    }

    if (state.currentPlayerIndex !== prev.currentPlayerIndex && !state.isSetup) {
      logs.push(`▸ Sıra ${cp?.name}'de`);
    }

    for (const p of state.players) {
      const prevP = prev.players.find(pp => pp.id === p.id);
      if (!prevP) continue;
      const newSettlements = p.settlements.filter(s => !prevP.settlements.includes(s));
      for (const s of newSettlements) logs.push(`🏠 ${p.name} settlement yerleştirdi`);
      const newCities = p.cities.filter(c => !prevP.cities.includes(c));
      for (const c of newCities) logs.push(`🏰 ${p.name} city yükseltti`);
      const newRoads = p.roads.filter(r => !prevP.roads.includes(r));
      if (newRoads.length > 0) logs.push(`🛤️ ${p.name} ${newRoads.length} road yerleştirdi`);
    }

    if (state.longestRoadHolder !== prev.longestRoadHolder && state.longestRoadHolder) {
      const holder = state.players.find(p => p.id === state.longestRoadHolder);
      logs.push(`🏆 ${holder?.name} en uzun yolu aldı!`);
    }

    if (state.winner && !prev.winner) {
      const winner = state.players.find(p => p.id === state.winner);
      logs.push(`👑 ${winner?.name} KAZANDI!`);
    }

    if (logs.length > 0) {
      setGameLogs(prev => [...prev, ...logs].slice(-100));
    }
  }, [state]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 60,
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* ─── Player cards (top-right) ──────────────────────────────── */}
      <div className="absolute top-6 right-6 flex flex-col gap-2 pointer-events-auto">
        {players.map((player, idx) => (
          <PlayerCard
            key={player.id}
            name={player.name}
            color={player.color}
            vp={computeVP(player)}
            settlements={player.settlements.length}
            cities={player.cities.length}
            roads={player.roads.length}
            isCurrentTurn={idx === currentPlayerIndex}
            isLongestRoad={longestRoadHolder === player.id}
          />
        ))}
      </div>

      {/* ─── Side menu (bottom-left) + panels ──────────────────────── */}
      <div className="absolute bottom-6 left-6 flex items-end gap-3" style={{ pointerEvents: "none" }}>
        <SideMenu
          onOpenSettings={() => {
            const overlay = document.getElementById("settings-overlay");
            if (overlay) {
              overlay.style.display = "";
              overlay.classList.remove("hidden");
              overlay.classList.add("visible");
            }
          }}
          onLeaveGame={() => setLeaveDialogOpen(true)}
          chatOpen={chatOpen}
          logOpen={logOpen}
          onToggleChat={() => setChatOpen(!chatOpen)}
          onToggleLog={() => setLogOpen(!logOpen)}
        />

        {/* Chat & Log panels (appear to the right of side menu, stacked) */}
        {(chatOpen || logOpen) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, pointerEvents: "auto" }}>
            {logOpen && <LogPanel logs={gameLogs} onClose={() => setLogOpen(false)} />}
            {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
          </div>
        )}
      </div>

      {/* ─── Bottom center: Steal + Dev Cards + Resources ──────────── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-auto">
        {/* Steal targets */}
        {stealTargets.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 12,
              background: "rgba(17, 22, 36, 0.85)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              border: "1px solid rgba(248,113,113,0.4)",
              boxShadow: "0 0 18px rgba(248,113,113,0.15), 0 8px 24px rgba(4,10,22,0.4)",
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: "#f87171",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Steal from
            </span>
            {stealTargets.map(targetId => {
              const target = players.find(p => p.id === targetId);
              if (!target) return null;
              return (
                <button
                  key={targetId}
                  onClick={() => actions.handleSteal(targetId)}
                  style={{
                    padding: "6px 16px",
                    fontSize: 14,
                    fontWeight: 900,
                    color: "#fff",
                    cursor: "pointer",
                    background: target.color,
                    border: "none",
                    borderRadius: 8,
                    boxShadow: `0 2px 8px ${target.color}40`,
                    minHeight: 36,
                  }}
                >
                  {target.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Dev card bar */}
        {!isSetup && (
          <DevCardBar
            devCards={currentPlayer.devCards}
            canBuy={state.canBuyDevCard}
            deckSize={state.devCardDeckSize}
            onBuy={actions.buyDevCard}
          />
        )}

        {/* Resource bar */}
        <ResourceBar resources={currentPlayer.resources} />
      </div>

      {/* ─── Right side: Dice + Action bar ─────────────────────────── */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2 pointer-events-auto">
        {/* Dice result */}
        {diceValues && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              width: 240,
              padding: "9px 20px",
              borderRadius: 12,
              background: "rgba(17, 22, 36, 0.85)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              border: state.diceTotal === 7
                ? "1px solid rgba(248,113,113,0.5)"
                : "1px solid rgba(255,255,255,0.14)",
              boxShadow: state.diceTotal === 7
                ? "0 0 18px rgba(248,113,113,0.2), 0 8px 24px rgba(4,10,22,0.4)"
                : "0 8px 28px rgba(4,10,22,0.38)",
            }}
          >
            <span style={{ fontSize: 18 }}>🎲</span>
            <span
              style={{
                fontSize: 17,
                fontWeight: 900,
                color: state.diceTotal === 7 ? "#f87171" : "#f0b429",
                letterSpacing: 1,
              }}
            >
              {diceValues[0]} + {diceValues[1]} = {state.diceTotal}
            </span>
          </div>
        )}

        {/* Turn timer */}
        {state.turnDeadline && state.turnTimerMs > 0 && (
          <TurnTimer
            deadline={state.turnDeadline}
            totalMs={state.turnTimerMs}
            serverTime={state.serverTime}
            isMyTurn={true}
          />
        )}

        <ActionBar
          isSetup={isSetup}
          actionMode={actionMode}
          diceRolled={diceRolled}
          isMyTurn={isMyTurn}
          onRoll={actions.rollDice}
          onEndTurn={actions.endTurn}
          onSetMode={actions.setActionMode}
          onTrade={() => setTradeDialogOpen(true)}
          canTrade={canTrade}
          remainingRoads={15 - currentPlayer.roads.length}
          remainingSettlements={5 - currentPlayer.settlements.length}
          remainingCities={4 - currentPlayer.cities.length}
          canAffordRoad={state.canAffordRoad}
          canAffordSettlement={state.canAffordSettlement}
          canAffordCity={state.canAffordCity}
        />
      </div>

      {/* ─── Forced discard dialog (7-roll) ────────────────────────── */}
      {discardRequired[myId] && discardRequired[myId] > 0 && (
        <div style={{ pointerEvents: "auto" }}>
          <DiscardDialog
            required={discardRequired[myId]}
            resources={me.resources}
            deadline={discardDeadline}
            onSubmit={(sel) => actions.discardResources(sel)}
          />
        </div>
      )}

      {/* ─── Other players discarding indicator (top-center small) ─── */}
      {!discardRequired[myId] && Object.keys(discardRequired).length > 0 && (
        <div
          className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            zIndex: 65, padding: "8px 16px", borderRadius: 999,
            background: "rgba(220,38,38,0.92)", color: "#fff",
            fontSize: 11, fontWeight: 800, letterSpacing: 0.8,
            display: "flex", alignItems: "center", gap: 8,
            fontFamily: "'Inter', system-ui, sans-serif",
            boxShadow: "0 6px 20px rgba(220,38,38,0.30)",
          }}
        >
          <span>⏱</span>
          <span>
            {Object.keys(discardRequired)
              .map(id => players.find(p => p.id === id)?.name ?? '?')
              .join(', ')} kart bağışlıyor…
          </span>
        </div>
      )}

      {/* ─── Trade dialog ──────────────────────────────────────────── */}
      {tradeDialogOpen && (
        <div style={{ pointerEvents: "auto" }}>
          <TradeDialog
            me={me as any}
            opponents={opponents as any}
            onClose={() => setTradeDialogOpen(false)}
            onMaritimeTrade={actions.maritimeTrade}
            onOfferTrade={actions.offerTrade}
          />
        </div>
      )}

      {/* ─── Trade panels (top-left, stacked) ──────────────────────── */}
      {(incomingTrades.length > 0 || myOpenOffers.length > 0) && (
        <div
          className="absolute top-6 left-6 pointer-events-auto flex flex-col gap-2"
          style={{ zIndex: 70, maxWidth: 360 }}
        >
          {incomingTrades.map(trade => {
            const from = players.find(p => p.id === trade.fromPlayerId);
            if (!from) return null;
            const iPreAccepted = trade.acceptedBy.includes(myId);
            const canAccept = !iPreAccepted &&
              Object.entries(trade.want).every(([r, n]) => (me.resources[r] ?? 0) >= n);
            const acceptedByPlayers = (trade.acceptedBy
              .map(id => players.find(p => p.id === id))
              .filter(Boolean) as typeof players)
              .map(p => ({ name: p.name, color: p.color }));
            return (
              <IncomingTradeBanner
                key={trade.id}
                fromName={from.name}
                fromColor={from.color}
                offer={trade.offer}
                want={trade.want}
                expiresAt={trade.expiresAt}
                canAccept={canAccept}
                preAccepted={iPreAccepted}
                acceptedByPlayers={acceptedByPlayers}
                onAccept={() => actions.acceptTrade(trade.id)}
                onReject={() => actions.rejectTrade(trade.id)}
              />
            );
          })}

          {myOpenOffers.map(trade => {
            const acceptors = (trade.acceptedBy
              .map(id => players.find(p => p.id === id))
              .filter(Boolean) as typeof players)
              .map(p => ({ id: p.id, name: p.name, color: p.color }));
            return (
              <MyOfferPanel
                key={trade.id}
                offer={trade.offer}
                want={trade.want}
                expiresAt={trade.expiresAt}
                acceptors={acceptors}
                onFinalize={(partnerId) => actions.acceptTrade(trade.id, partnerId)}
                onCancel={() => actions.rejectTrade(trade.id)}
              />
            );
          })}
        </div>
      )}

      {/* ─── Leave game dialog ─────────────────────────────────────── */}
      {leaveDialogOpen && (
        <div style={{ pointerEvents: "auto" }}>
          <LeaveGameDialog
            onConfirm={() => {
              setLeaveDialogOpen(false);
              window.location.href = "/";
            }}
            onCancel={() => setLeaveDialogOpen(false)}
          />
        </div>
      )}

      {/* ─── Winner overlay ───────────────────────────────────────── */}
      {state.winner && (() => {
        // Prefer server-computed results (includes ELO/level deltas and
        // authoritative VP — longestRoad + largestArmy + hidden dev cards).
        // Otherwise derive rows locally and sort by our best-effort VP.
        const gr = state.gameResults;
        const winnerId = typeof state.winner === 'string'
          ? state.winner
          : (state.winner?.id ?? gr?.winnerId ?? '');
        const serverResults = gr?.results;
        const finalScores = (gr as any)?.finalScores as Record<string, number> | undefined;

        let results: any[];
        if (serverResults && serverResults.length > 0) {
          results = serverResults;
        } else {
          const withVp = players.map(p => {
            const vp = finalScores?.[p.id] ?? computeVP(p);
            return { player: p, vp };
          });
          // Winner first, then descending VP among the rest.
          withVp.sort((a, b) => {
            if (a.player.id === winnerId) return -1;
            if (b.player.id === winnerId) return 1;
            return b.vp - a.vp;
          });
          results = withVp.map(({ player, vp }, idx) => ({
            playerId: player.id,
            name: player.name,
            color: player.color,
            vp,
            position: idx + 1,
            isBot: player.id.startsWith('bot_'),
          }));
        }
        return (
          <VictoryOverlay
            winnerId={winnerId}
            results={results}
            myPlayerId={myPlayerId}
            onPlayAgain={actions.reset}
            onExit={() => {
              // Best-effort: tell the server we're leaving so the banner won't
              // resurface this game. Fire-and-forget; proceed to home regardless.
              try {
                const gameId = new URLSearchParams(window.location.search).get('gameId');
                if (gameId) {
                  const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787');
                  fetch(`${API}/user/active-game/${gameId}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    keepalive: true,
                  }).catch(() => {});
                }
              } catch {}
              window.location.href = '/';
            }}
          />
        );
      })()}
    </div>
  );
}
