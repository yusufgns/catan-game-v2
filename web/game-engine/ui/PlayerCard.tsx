"use client";

import { Crown, Home, Building2, Route } from "lucide-react";
import { PANEL, PANEL_RAISED, TXT, ACCENT } from "./theme";

interface PlayerCardProps {
  name: string;
  color: string;
  vp: number;
  settlements: number;
  roads: number;
  cities: number;
  isCurrentTurn: boolean;
  isLongestRoad: boolean;
}

export default function PlayerCard({
  name, color, vp, settlements, roads, cities, isCurrentTurn, isLongestRoad,
}: PlayerCardProps) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "stretch",
        width: 244,
        borderRadius: 13,
        overflow: "hidden",
        ...(isCurrentTurn ? PANEL_RAISED : PANEL),
        border: isCurrentTurn
          ? `2px solid ${color}`
          : "1px solid rgba(255,255,255,0.12)",
        boxShadow: isCurrentTurn
          ? `0 0 22px ${color}44, 0 8px 24px rgba(4,10,22,0.4)`
          : (PANEL.boxShadow as string),
        opacity: isCurrentTurn ? 1 : 0.82,
        transition: "opacity 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
      }}
    >
      {/* VP section */}
      <div
        style={{
          width: 54,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: `${color}26`,
          borderRight: `2px solid ${color}55`,
          padding: "8px 0",
          gap: 2,
        }}
      >
        <span style={{ fontSize: 23, fontWeight: 900, color: TXT.primary, lineHeight: 1 }}>
          {vp}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: TXT.faint,
            textTransform: "uppercase",
            letterSpacing: 1.5,
          }}
        >
          VP
        </span>
      </div>

      {/* Info section */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Name row */}
        <div style={{ display: "flex", alignItems: "center", padding: "8px 12px 4px", gap: 8 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: color,
              boxShadow: `0 0 8px ${color}aa`,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: name ? TXT.primary : TXT.faint,
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              flex: 1,
              letterSpacing: 0.5,
              fontStyle: name ? "normal" : "italic",
            }}
          >
            {name || "Player"}
          </span>
          {isCurrentTurn && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 900,
                color: "#1a1206",
                background: color,
                borderRadius: 5,
                padding: "2px 7px",
                textTransform: "uppercase",
                letterSpacing: 1,
                flexShrink: 0,
              }}
            >
              TURN
            </span>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", alignItems: "center", padding: "2px 12px 8px", gap: 12 }}>
          <Stat icon={<Home size={13} />} value={settlements} label="settlements" />
          <Stat icon={<Building2 size={13} />} value={cities} label="cities" />
          <Stat icon={<Route size={13} />} value={roads} label="roads" />
          {isLongestRoad && (
            <div title="Longest Road" style={{ display: "flex", alignItems: "center", gap: 3, marginLeft: "auto" }}>
              <Crown size={13} style={{ color: ACCENT.gold }} />
              <span style={{ fontSize: 10, fontWeight: 800, color: ACCENT.gold, letterSpacing: 0.5 }}>LR</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div title={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ color: TXT.faint, display: "flex" }}>{icon}</span>
      <span style={{ fontSize: 14, fontWeight: 800, color: TXT.primary, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}
