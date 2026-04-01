"use client";

import { Home, Building2, Dice5, ChevronRight, ArrowLeftRight, Route } from "lucide-react";
import type { ReactNode } from "react";

interface ActionBarProps {
  isSetup: boolean;
  actionMode: string;
  diceRolled: boolean;
  onRoll: () => void;
  onEndTurn: () => void;
  onSetMode: (mode: string) => void;
  remainingRoads?: number;
  remainingSettlements?: number;
  remainingCities?: number;
  canAffordRoad?: boolean;
  canAffordSettlement?: boolean;
  canAffordCity?: boolean;
}

export default function ActionBar({
  isSetup, actionMode, diceRolled, onRoll, onEndTurn, onSetMode,
  remainingRoads = 15, remainingSettlements = 5, remainingCities = 4,
  canAffordRoad = true, canAffordSettlement = true, canAffordCity = true,
}: ActionBarProps) {
  if (isSetup) {
    return (
      <div
        style={{
          padding: "12px 24px",
          borderRadius: 12,
          background: "rgba(255, 255, 255, 0.75)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.6)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: "#92400e",
          }}
        >
          {actionMode === "settlement" ? "Place Settlement" : "Place Road"}
        </span>
      </div>
    );
  }

  const isRobberPhase = actionMode === "robber" || actionMode === "steal";
  const canEndTurn = diceRolled && !isRobberPhase;

  const builds: { mode: string; label: string; count: number; icon: ReactNode; affordable: boolean }[] = [
    { mode: "road", label: "Road", count: remainingRoads, icon: <Route size={20} />, affordable: canAffordRoad },
    { mode: "settlement", label: "Settle", count: remainingSettlements, icon: <Home size={20} />, affordable: canAffordSettlement },
    { mode: "city", label: "City", count: remainingCities, icon: <Building2 size={20} />, affordable: canAffordCity },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
      {/* Action row — same width as build row: 3×72 + 2×6 = 228 */}
      <div
        style={{
          display: "flex",
          width: 228,
          borderRadius: 12,
          overflow: "hidden",
          background: "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.5)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)",
        }}
      >
        {/* Trade */}
        <button
          style={{
            flex: 1,
            height: 56,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            background: "rgba(217,119,6,0.08)",
            border: "none",
            borderRight: "1px solid rgba(0,0,0,0.06)",
            cursor: "pointer",
          }}
        >
          <ArrowLeftRight size={18} style={{ color: "#92400e" }} />
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, color: "#92400e", textTransform: "uppercase" }}>
            Trade
          </span>
        </button>

        {/* Roll */}
        <button
          onClick={!diceRolled ? onRoll : undefined}
          style={{
            flex: 1.5,
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            background: diceRolled ? "transparent" : "rgba(34,197,94,0.12)",
            border: "none",
            borderRight: "1px solid rgba(0,0,0,0.06)",
            cursor: diceRolled ? "default" : "pointer",
            transition: "background 0.15s ease",
          }}
        >
          <Dice5 size={20} style={{ color: diceRolled ? "rgba(0,0,0,0.25)" : "#15803d" }} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 900,
              color: diceRolled ? "rgba(0,0,0,0.25)" : "#15803d",
              letterSpacing: 1,
            }}
          >
            {diceRolled ? "ROLLED" : "ROLL"}
          </span>
        </button>

        {/* End Turn */}
        <button
          onClick={canEndTurn ? onEndTurn : undefined}
          style={{
            flex: 1,
            height: 56,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            background: canEndTurn ? "rgba(34,197,94,0.12)" : "transparent",
            border: "none",
            cursor: canEndTurn ? "pointer" : "default",
            opacity: canEndTurn ? 1 : 0.3,
            transition: "all 0.15s ease",
          }}
        >
          <ChevronRight size={20} style={{ color: canEndTurn ? "#15803d" : "rgba(0,0,0,0.2)" }} />
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: 1,
              color: canEndTurn ? "#15803d" : "rgba(0,0,0,0.2)",
              textTransform: "uppercase",
            }}
          >
            End
          </span>
        </button>
      </div>

      {/* Build buttons */}
      <div style={{ display: "flex", gap: 6 }}>
        {builds.map(b => {
          const active = actionMode === b.mode;
          const disabled = !b.affordable && !isSetup;
          return (
            <button
              key={b.mode}
              onClick={disabled ? undefined : () => onSetMode(b.mode)}
              style={{
                position: "relative",
                width: 72,
                height: 56,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                background: active
                  ? "rgba(255, 255, 255, 0.9)"
                  : "rgba(255, 255, 255, 0.6)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: active
                  ? "2px solid #d97706"
                  : "1px solid rgba(255,255,255,0.5)",
                borderRadius: 12,
                cursor: disabled ? "default" : "pointer",
                boxShadow: active
                  ? "0 0 20px rgba(217,119,6,0.15), 0 4px 16px rgba(0,0,0,0.08)"
                  : "0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)",
                transition: "all 0.15s ease",
                opacity: disabled ? 0.35 : 1,
              }}
            >
              <span style={{ color: active ? "#92400e" : "rgba(0,0,0,0.3)", display: "flex" }}>
                {b.icon}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 1.2,
                  color: active ? "#92400e" : "rgba(0,0,0,0.3)",
                  textTransform: "uppercase",
                }}
              >
                {b.label}
              </span>
              {/* Count badge */}
              <div
                style={{
                  position: "absolute",
                  top: -7,
                  right: -7,
                  minWidth: 24,
                  height: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  padding: "0 6px",
                  background: active ? "#d97706" : "rgba(0,0,0,0.5)",
                  boxShadow: active
                    ? "0 2px 8px rgba(217,119,6,0.4)"
                    : "0 2px 6px rgba(0,0,0,0.15)",
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 900, color: "#fff" }}>
                  {b.count}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
