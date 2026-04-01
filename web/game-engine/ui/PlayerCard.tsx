"use client";

import { Crown, Home, Building2, Route } from "lucide-react";

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
        width: 240,
        borderRadius: 12,
        overflow: "hidden",
        background: isCurrentTurn
          ? "rgba(255, 255, 255, 0.85)"
          : "rgba(255, 255, 255, 0.55)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: isCurrentTurn
          ? `2px solid ${color}`
          : "2px solid rgba(255,255,255,0.3)",
        boxShadow: isCurrentTurn
          ? `0 0 20px ${color}25, 0 4px 20px rgba(0,0,0,0.08)`
          : "0 2px 12px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.03)",
        opacity: isCurrentTurn ? 1 : 0.75,
        transition: "opacity 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
      }}
    >
      {/* VP section */}
      <div
        style={{
          width: 52,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: `${color}15`,
          borderRight: `2px solid ${color}40`,
          padding: "8px 0",
          gap: 2,
        }}
      >
        <span
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: "#1a1a2e",
            lineHeight: 1,
          }}
        >
          {vp}
        </span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: "rgba(0,0,0,0.35)",
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "8px 12px 4px",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: color,
              boxShadow: `0 0 6px ${color}60`,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: "#1a1a2e",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              flex: 1,
              letterSpacing: 0.5,
            }}
          >
            {name}
          </span>
          {isCurrentTurn && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color,
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "2px 12px 8px",
            gap: 12,
          }}
        >
          <Stat icon={<Home size={12} />} value={settlements} />
          <Stat icon={<Building2 size={12} />} value={cities} />
          <Stat icon={<Route size={12} />} value={roads} />
          {isLongestRoad && (
            <div style={{ display: "flex", alignItems: "center", gap: 3, marginLeft: "auto" }}>
              <Crown size={12} style={{ color: "#d97706" }} />
              <span style={{ fontSize: 10, fontWeight: 800, color: "#d97706", letterSpacing: 0.5 }}>LR</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, value }: { icon: React.ReactNode; value: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ color: "rgba(0,0,0,0.3)", display: "flex" }}>{icon}</span>
      <span style={{ fontSize: 14, fontWeight: 800, color: "#1a1a2e" }}>{value}</span>
    </div>
  );
}
