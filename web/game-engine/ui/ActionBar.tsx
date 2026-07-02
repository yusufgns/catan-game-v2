"use client";

import { Home, Building2, Dice5, ChevronRight, ArrowLeftRight, Route } from "lucide-react";
import type { ReactNode } from "react";
import { ACCENT, PANEL, PANEL_RAISED, TXT } from "./theme";

interface ActionBarProps {
  isSetup: boolean;
  actionMode: string;
  diceRolled: boolean;
  isMyTurn?: boolean;
  onRoll: () => void;
  onEndTurn: () => void;
  onSetMode: (mode: string) => void;
  onTrade?: () => void;
  canTrade?: boolean;
  remainingRoads?: number;
  remainingSettlements?: number;
  remainingCities?: number;
  canAffordRoad?: boolean;
  canAffordSettlement?: boolean;
  canAffordCity?: boolean;
}

export default function ActionBar({
  isSetup, actionMode, diceRolled, isMyTurn = true,
  onRoll, onEndTurn, onSetMode, onTrade, canTrade = false,
  remainingRoads = 15, remainingSettlements = 5, remainingCities = 4,
  canAffordRoad = true, canAffordSettlement = true, canAffordCity = true,
}: ActionBarProps) {
  if (isSetup) {
    return (
      <div style={{ padding: "14px 26px", borderRadius: 13, ...PANEL_RAISED }}>
        <span
          style={{
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: ACCENT.gold,
          }}
        >
          {actionMode === "settlement" ? "Place Settlement" : "Place Road"}
        </span>
      </div>
    );
  }

  const isRobberPhase = actionMode === "robber" || actionMode === "steal";
  const canEndTurn = diceRolled && !isRobberPhase && isMyTurn;
  const canRoll = !diceRolled && isMyTurn;

  const builds: { mode: string; label: string; count: number; icon: ReactNode; affordable: boolean }[] = [
    { mode: "road", label: "Road", count: remainingRoads, icon: <Route size={20} />, affordable: canAffordRoad },
    { mode: "settlement", label: "Settle", count: remainingSettlements, icon: <Home size={20} />, affordable: canAffordSettlement },
    { mode: "city", label: "City", count: remainingCities, icon: <Building2 size={20} />, affordable: canAffordCity },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
      {/* Action row — same width as build row: 3×76 + 2×6 = 240 */}
      <div
        style={{
          display: "flex",
          width: 240,
          borderRadius: 13,
          overflow: "hidden",
          ...PANEL,
        }}
      >
        {/* Trade */}
        <button
          onClick={canTrade ? onTrade : undefined}
          aria-label="Trade"
          style={{
            flex: 1,
            height: 58,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            background: canTrade ? ACCENT.goldSoft : "transparent",
            border: "none",
            borderRight: "1px solid rgba(255,255,255,0.1)",
            cursor: canTrade ? "pointer" : "default",
            opacity: canTrade ? 1 : 0.45,
            transition: "all 0.15s ease",
          }}
        >
          <ArrowLeftRight size={18} style={{ color: canTrade ? ACCENT.gold : TXT.disabled }} />
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8, color: canTrade ? ACCENT.gold : TXT.disabled, textTransform: "uppercase" }}>
            Trade
          </span>
        </button>

        {/* Roll */}
        <button
          onClick={canRoll ? onRoll : undefined}
          aria-label="Roll dice"
          style={{
            flex: 1.5,
            height: 58,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: canRoll ? ACCENT.greenSoft : "transparent",
            border: "none",
            borderRight: "1px solid rgba(255,255,255,0.1)",
            cursor: canRoll ? "pointer" : "default",
            transition: "background 0.15s ease",
          }}
        >
          <Dice5 size={21} style={{ color: canRoll ? ACCENT.green : TXT.disabled }} />
          <span
            style={{
              fontSize: 13,
              fontWeight: 900,
              color: canRoll ? ACCENT.green : TXT.disabled,
              letterSpacing: 1,
            }}
          >
            {diceRolled ? "ROLLED" : "ROLL"}
          </span>
        </button>

        {/* End Turn */}
        <button
          onClick={canEndTurn ? onEndTurn : undefined}
          aria-label="End turn"
          style={{
            flex: 1,
            height: 58,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            background: canEndTurn ? ACCENT.greenSoft : "transparent",
            border: "none",
            cursor: canEndTurn ? "pointer" : "default",
            opacity: canEndTurn ? 1 : 0.45,
            transition: "all 0.15s ease",
          }}
        >
          <ChevronRight size={20} style={{ color: canEndTurn ? ACCENT.green : TXT.disabled }} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 0.8,
              color: canEndTurn ? ACCENT.green : TXT.disabled,
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
              aria-label={`Build ${b.label}`}
              style={{
                position: "relative",
                width: 76,
                height: 58,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                ...(active ? PANEL_RAISED : PANEL),
                border: active
                  ? `2px solid ${ACCENT.gold}`
                  : "1px solid rgba(255,255,255,0.14)",
                borderRadius: 13,
                cursor: disabled ? "default" : "pointer",
                boxShadow: active
                  ? `0 0 20px ${ACCENT.gold}33, 0 6px 20px rgba(4,10,22,0.4)`
                  : (PANEL.boxShadow as string),
                transition: "all 0.15s ease",
                opacity: disabled ? 0.45 : 1,
              }}
            >
              <span style={{ color: active ? ACCENT.gold : TXT.secondary, display: "flex" }}>
                {b.icon}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 0.8,
                  color: active ? ACCENT.gold : TXT.secondary,
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
                  background: active ? ACCENT.gold : "rgba(8, 12, 22, 0.92)",
                  border: active ? "none" : "1px solid rgba(255,255,255,0.2)",
                  boxShadow: active
                    ? `0 2px 8px ${ACCENT.gold}66`
                    : "0 2px 6px rgba(0,0,0,0.3)",
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 900, color: active ? "#1a1206" : TXT.primary }}>
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
