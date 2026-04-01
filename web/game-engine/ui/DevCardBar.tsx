"use client";

import { Shield, Star, Diamond, Route, Gift, Plus } from "lucide-react";
import type { ReactNode } from "react";

const DEV_CARD_TYPES: { key: string; label: string; icon: ReactNode }[] = [
  { key: "knight",       label: "KNIGHT",   icon: <Shield size={20} /> },
  { key: "victoryPoint", label: "V.POINT",  icon: <Star size={20} /> },
  { key: "monopoly",     label: "MONO",     icon: <Diamond size={20} /> },
  { key: "roadBuilding", label: "ROADS",    icon: <Route size={20} /> },
  { key: "yearOfPlenty", label: "PLENTY",   icon: <Gift size={20} /> },
];

const CARD_WIDTH = 64;

interface DevCardBarProps {
  devCards: Record<string, number>;
  canBuy: boolean;
  deckSize: number;
  onBuy: () => void;
}

export default function DevCardBar({ devCards, canBuy, deckSize, onBuy }: DevCardBarProps) {
  // Only show cards the player owns (count > 0)
  const ownedCards = DEV_CARD_TYPES.filter(({ key }) => (devCards[key] || 0) > 0);

  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 4 }}>
      {/* Owned dev cards */}
      {ownedCards.map(({ key, label, icon }) => {
        const count = devCards[key] || 0;
        return (
          <div
            key={key}
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              width: CARD_WIDTH,
              padding: "10px 0",
              borderRadius: 10,
              background: "rgba(26,26,46,0.85)",
              border: "1px solid rgba(26,26,46,0.9)",
            }}
          >
            <span
              style={{
                fontSize: 8,
                fontWeight: 800,
                letterSpacing: 1,
                color: "rgba(255,255,255,0.45)",
                textTransform: "uppercase",
                textAlign: "center",
                lineHeight: 1.2,
              }}
            >
              {label}
            </span>
            <span style={{ color: "rgba(255,255,255,0.55)", display: "flex" }}>
              {icon}
            </span>
            {/* Count badge */}
            {count > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  minWidth: 22,
                  height: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 7,
                  padding: "0 5px",
                  background: "#dc2626",
                  boxShadow: "0 2px 6px rgba(220,38,38,0.4)",
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 900, color: "#fff" }}>{count}</span>
              </div>
            )}
          </div>
        );
      })}

      {/* Buy button — same width as cards */}
      <button
        onClick={canBuy ? onBuy : undefined}
        disabled={!canBuy}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          width: CARD_WIDTH,
          padding: "10px 0",
          borderRadius: 10,
          background: canBuy
            ? "rgba(255, 255, 255, 0.75)"
            : "rgba(255, 255, 255, 0.45)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: canBuy
            ? "1.5px solid rgba(34,197,94,0.4)"
            : "1.5px dashed rgba(0,0,0,0.12)",
          cursor: canBuy ? "pointer" : "default",
          opacity: canBuy ? 1 : 0.6,
          transition: "all 0.15s ease",
        }}
      >
        <Plus size={18} style={{ color: canBuy ? "#15803d" : "rgba(0,0,0,0.2)" }} />
        <span
          style={{
            fontSize: 8,
            fontWeight: 800,
            letterSpacing: 0.5,
            color: canBuy ? "#15803d" : "rgba(0,0,0,0.25)",
            textTransform: "uppercase",
            textAlign: "center",
            lineHeight: 1.3,
          }}
        >
          DEV
          <br />
          CARD
        </span>
      </button>
    </div>
  );
}
