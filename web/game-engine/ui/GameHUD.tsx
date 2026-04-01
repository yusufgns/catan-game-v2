"use client";

import { useState } from "react";
import PlayerCard from "./PlayerCard";
import ActionBar from "./ActionBar";
import ResourceBar from "./ResourceBar";
import DevCardBar from "./DevCardBar";
import SideMenu, { LeaveGameDialog, ChatPanel, LogPanel } from "./SideMenu";
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
  };
  computeVP: (player: any) => number;
}

export default function GameHUD({ state, actions, computeVP }: GameHUDProps) {
  const {
    players, currentPlayer, currentPlayerIndex, isSetup,
    actionMode, diceRolled, diceValues, longestRoadHolder, stealTargets,
  } = state;

  const [chatOpen, setChatOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  // Placeholder game logs
  const [gameLogs] = useState<string[]>(() => []);

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
              background: "rgba(255, 255, 255, 0.75)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(220,38,38,0.15)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: "rgba(0,0,0,0.4)",
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
              width: 228,
              padding: "8px 20px",
              borderRadius: 12,
              background: "rgba(255, 255, 255, 0.75)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: state.diceTotal === 7
                ? "1px solid rgba(220,38,38,0.25)"
                : "1px solid rgba(255,255,255,0.5)",
              boxShadow: state.diceTotal === 7
                ? "0 0 16px rgba(220,38,38,0.08), 0 4px 16px rgba(0,0,0,0.06)"
                : "0 4px 16px rgba(0,0,0,0.06)",
            }}
          >
            <span style={{ fontSize: 18 }}>🎲</span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 900,
                color: state.diceTotal === 7 ? "#dc2626" : "#78350f",
                letterSpacing: 1,
              }}
            >
              {diceValues[0]} + {diceValues[1]} = {state.diceTotal}
            </span>
          </div>
        )}

        <ActionBar
          isSetup={isSetup}
          actionMode={actionMode}
          diceRolled={diceRolled}
          onRoll={actions.rollDice}
          onEndTurn={actions.endTurn}
          onSetMode={actions.setActionMode}
          remainingRoads={15 - currentPlayer.roads.length}
          remainingSettlements={5 - currentPlayer.settlements.length}
          remainingCities={4 - currentPlayer.cities.length}
          canAffordRoad={state.canAffordRoad}
          canAffordSettlement={state.canAffordSettlement}
          canAffordCity={state.canAffordCity}
        />
      </div>

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
      {state.winner && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.4)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              textAlign: "center",
              padding: "48px 64px",
              borderRadius: 20,
              background: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              boxShadow: "0 24px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)",
              border: "1px solid rgba(255,255,255,0.6)",
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 900,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: "#d97706",
                marginBottom: 12,
              }}
            >
              Victory
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 900,
                color: "#1a1a2e",
                letterSpacing: 2,
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              {state.winner.name}
            </div>
            <div
              style={{
                fontSize: 15,
                color: "rgba(0,0,0,0.4)",
                marginBottom: 32,
              }}
            >
              reached 10 Victory Points
            </div>
            <button
              onClick={actions.reset}
              style={{
                padding: "12px 40px",
                fontSize: 15,
                fontWeight: 900,
                color: "#fff",
                cursor: "pointer",
                background: "linear-gradient(145deg, #fbbf24, #d97706)",
                border: "none",
                borderRadius: 12,
                boxShadow: "0 4px 16px rgba(217,119,6,0.3)",
                letterSpacing: 1,
                textTransform: "uppercase",
                minHeight: 48,
              }}
            >
              New Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
