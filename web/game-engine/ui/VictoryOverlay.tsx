"use client";

import { Crown, Home, Building2, Route, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getRankFromElo } from "@catan/core";

interface PlayerResult {
  playerId: string;
  name: string;
  color: string;
  vp: number;
  position: number;
  isBot?: boolean;
  eloBefore?: number | null;
  eloAfter?: number | null;
  eloChange?: number;
  xpEarned?: number;
  levelBefore?: number | null;
  levelAfter?: number | null;
}

interface Props {
  winnerId: string;
  results: PlayerResult[];
  myPlayerId: string | null;
  onPlayAgain: () => void;
  onExit: () => void;
}

const POSITION_LABEL = ["", "1st", "2nd", "3rd", "4th"];

function ordinal(n: number): string {
  if (n >= 1 && n < POSITION_LABEL.length) return POSITION_LABEL[n];
  if (!Number.isFinite(n) || n < 1) return "—";
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const last = n % 10;
  return `${n}${last === 1 ? 'st' : last === 2 ? 'nd' : last === 3 ? 'rd' : 'th'}`;
}

export default function VictoryOverlay({ winnerId, results, myPlayerId, onPlayAgain, onExit }: Props) {
  const sorted = [...results].sort((a, b) => a.position - b.position);
  const winner = sorted.find(r => r.playerId === winnerId);
  const iAmWinner = myPlayerId !== null && myPlayerId === winnerId;
  const myResult = myPlayerId ? sorted.find(r => r.playerId === myPlayerId) : null;

  return (
    <div
      style={{
        position: "absolute", inset: 0, zIndex: 120,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: "rgba(8, 15, 30, 0.78)",
        backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
        pointerEvents: "auto", padding: 24,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Banner */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div
          style={{
            fontSize: 12, fontWeight: 900, letterSpacing: 5,
            textTransform: "uppercase",
            color: iAmWinner ? "#fbbf24" : "rgba(255,255,255,0.55)",
            marginBottom: 6,
          }}
        >
          {iAmWinner ? "🏆 You Won" : (myResult ? `${ordinal(myResult.position)} Place` : "Game Over")}
        </div>
        <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: 2, color: "#fff" }}>
          {winner ? winner.name.toUpperCase() : "WINNER"}
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>
          reached {winner?.vp ?? 10} Victory Points
        </div>
      </div>

      {/* Results table */}
      <div
        style={{
          width: "min(640px, 92vw)",
          display: "flex", flexDirection: "column", gap: 8,
          padding: 14, borderRadius: 16,
          background: "rgba(255, 255, 255, 0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {sorted.map(r => (
          <ResultRow
            key={r.playerId}
            r={r}
            isMe={r.playerId === myPlayerId}
            isWinner={r.playerId === winnerId}
          />
        ))}
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button
          onClick={onExit}
          style={{
            padding: "12px 24px", borderRadius: 12,
            background: "rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.75)",
            fontSize: 12, fontWeight: 900, letterSpacing: 1.5, textTransform: "uppercase",
            border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Home
        </button>
        <button
          onClick={onPlayAgain}
          style={{
            padding: "12px 36px", borderRadius: 12,
            background: "linear-gradient(145deg, #fbbf24, #d97706)",
            color: "#fff",
            fontSize: 12, fontWeight: 900, letterSpacing: 1.5, textTransform: "uppercase",
            border: "none", cursor: "pointer",
            boxShadow: "0 8px 24px rgba(217,119,6,0.35)",
            fontFamily: "inherit",
          }}
        >
          Play Again
        </button>
      </div>
    </div>
  );
}

// ── Row ──────────────────────────────────────────────────────────────────────

function ResultRow({ r, isMe, isWinner }: { r: PlayerResult; isMe: boolean; isWinner: boolean }) {
  const hasElo = r.eloBefore !== null && r.eloBefore !== undefined && !r.isBot;
  const rankBefore = hasElo ? getRankFromElo(r.eloBefore!) : null;
  const rankAfter = hasElo && r.eloAfter !== null && r.eloAfter !== undefined
    ? getRankFromElo(r.eloAfter!) : null;
  const levelChanged = r.levelBefore !== undefined && r.levelAfter !== undefined
    && r.levelBefore !== null && r.levelAfter !== null
    && r.levelAfter > r.levelBefore;

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 14px", borderRadius: 12,
        background: isMe
          ? "rgba(251,191,36,0.10)"
          : (isWinner ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.20)"),
        border: isMe ? "1.5px solid rgba(251,191,36,0.45)" : "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {/* Position */}
      <div
        style={{
          width: 32, height: 32, borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: isWinner ? "linear-gradient(145deg,#fbbf24,#d97706)" : "rgba(255,255,255,0.06)",
          color: isWinner ? "#fff" : "rgba(255,255,255,0.5)",
          fontSize: 13, fontWeight: 900,
          boxShadow: isWinner ? "0 2px 8px rgba(217,119,6,0.4)" : "none",
        }}
      >
        {isWinner ? <Crown size={16} /> : r.position}
      </div>

      {/* Name + color */}
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: 999, background: r.color,
            boxShadow: `0 0 8px ${r.color}80`,
          }} />
          <span style={{ fontSize: 14, fontWeight: 800, color: "#fff", letterSpacing: 0.3 }}>
            {r.name}
          </span>
          {r.isBot && (
            <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 1 }}>
              BOT
            </span>
          )}
          {isMe && (
            <span style={{ fontSize: 9, fontWeight: 800, color: "#fbbf24", letterSpacing: 1 }}>
              YOU
            </span>
          )}
        </div>
        {hasElo && rankBefore && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: rankBefore.color, letterSpacing: 0.5 }}>
              {rankBefore.tierLabel}{rankBefore.divisionLabel ? ` ${rankBefore.divisionLabel}` : ''}
            </span>
            {r.levelAfter !== null && r.levelAfter !== undefined && (
              <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.45)" }}>
                · Lv {r.levelAfter}{levelChanged && <span style={{ color: "#22c55e" }}> ↑</span>}
              </span>
            )}
          </div>
        )}
      </div>

      {/* VP */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 44 }}>
        <span style={{ fontSize: 18, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{r.vp}</span>
        <span style={{ fontSize: 8, fontWeight: 800, color: "rgba(255,255,255,0.35)", letterSpacing: 1, marginTop: 2 }}>
          VP
        </span>
      </div>

      {/* ELO change */}
      <div style={{ minWidth: 80, textAlign: "right" }}>
        {hasElo ? (
          <EloBadge change={r.eloChange ?? 0} before={r.eloBefore!} after={r.eloAfter ?? r.eloBefore!} />
        ) : (
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 700 }}>—</span>
        )}
      </div>
    </div>
  );
}

function EloBadge({ change, before, after }: { change: number; before: number; after: number }) {
  const up = change > 0;
  const down = change < 0;
  const color = up ? "#22c55e" : down ? "#ef4444" : "rgba(255,255,255,0.4)";
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Icon size={13} color={color} />
        <span style={{ fontSize: 13, fontWeight: 900, color, letterSpacing: 0.3 }}>
          {up ? '+' : ''}{change}
        </span>
      </div>
      <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 0.3 }}>
        {before} → {after}
      </span>
    </div>
  );
}
