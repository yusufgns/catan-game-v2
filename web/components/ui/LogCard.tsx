"use client";

import { useState, useEffect, useRef } from "react";
import { RESOURCE_COLOR, RESOURCE_LABEL, type ResourceType } from "@/lib/gameTypes";

// ─── Log entry types ──────────────────────────────────────────────────────────

export type LogEntry =
  | { type: "dice";    turn: number; player: string; color: string; d1: number; d2: number }
  | { type: "gain";    turn: number; player: string; color: string; gains: Partial<Record<ResourceType, number>> }
  | { type: "robber";  turn: number; player: string; color: string; hexLabel: string }
  | { type: "steal";   turn: number; player: string; color: string; from: string; fromColor: string; resource: ResourceType }
  | { type: "build";   turn: number; player: string; color: string; what: "settlement" | "city" | "road" }
  | { type: "longest"; turn: number; player: string; color: string }
  | { type: "trade";   turn: number; player: string; color: string; mode: "bank" | "player"; offer: Partial<Record<ResourceType, number>>; want: Partial<Record<ResourceType, number>>; with?: string; withColor?: string }
  | { type: "phase";   turn: number; label: string };

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  entries: LogEntry[];
}

function EntryRow({ e }: { e: LogEntry }) {
  if (e.type === "phase") {
    return (
      <div style={{ textAlign: "center", padding: "4px 0", color: "rgba(255,255,255,0.3)", fontSize: 9, letterSpacing: 2, textTransform: "uppercase", borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 2 }}>
        {e.label}
      </div>
    );
  }

  const playerChip = (name: string, color: string) => (
    <span style={{ color, fontWeight: 700 }}>{name}</span>
  );

  let icon = "";
  let content: React.ReactNode = null;

  switch (e.type) {
    case "dice": {
      const total = e.d1 + e.d2;
      icon = "🎲";
      content = (
        <>
          {playerChip(e.player, e.color)} rolled{" "}
          <span style={{ color: total === 7 ? "#ff4444" : "#ffd700", fontWeight: 700 }}>
            {e.d1}+{e.d2}={total}
          </span>
          {total === 7 && <span style={{ color: "#ff4444" }}> ☠</span>}
        </>
      );
      break;
    }
    case "gain": {
      icon = "📦";
      const parts = (Object.keys(e.gains) as ResourceType[]).map((r) => (
        <span key={r} style={{ color: RESOURCE_COLOR[r], fontWeight: 700 }}>
          +{e.gains[r]} {RESOURCE_LABEL[r].slice(0, 2)}
        </span>
      ));
      content = <>{playerChip(e.player, e.color)} got {parts.reduce<React.ReactNode[]>((acc, el, i) => i === 0 ? [el] : [...acc, <span key={i} style={{ color: "rgba(255,255,255,0.3)" }}>, </span>, el], [])}</>;
      break;
    }
    case "robber": {
      icon = "☠";
      content = <>{playerChip(e.player, e.color)} moved robber → <span style={{ color: "rgba(255,255,255,0.65)" }}>{e.hexLabel}</span></>;
      break;
    }
    case "steal": {
      icon = "🗡";
      content = (
        <>
          {playerChip(e.player, e.color)} stole{" "}
          <span style={{ color: RESOURCE_COLOR[e.resource], fontWeight: 700 }}>
            {RESOURCE_LABEL[e.resource]}
          </span>{" "}
          from {playerChip(e.from, e.fromColor)}
        </>
      );
      break;
    }
    case "build": {
      const labels = { settlement: "🏠 Settlement", city: "🏙 City", road: "🛣 Road" };
      icon = "";
      content = <>{playerChip(e.player, e.color)} built <span style={{ color: "rgba(255,255,255,0.7)" }}>{labels[e.what]}</span></>;
      break;
    }
    case "longest": {
      icon = "🏆";
      content = <>{playerChip(e.player, e.color)} <span style={{ color: "#ffd700" }}>claimed Longest Road</span></>;
      break;
    }
    case "trade": {
      icon = "⇄";
      const offerParts = (Object.keys(e.offer) as ResourceType[])
        .filter(r => (e.offer[r] ?? 0) > 0)
        .map(r => <span key={r} style={{ color: RESOURCE_COLOR[r], fontWeight: 700 }}>{e.offer[r]}{RESOURCE_LABEL[r].slice(0,2)}</span>);
      const wantParts = (Object.keys(e.want) as ResourceType[])
        .filter(r => (e.want[r] ?? 0) > 0)
        .map(r => <span key={r} style={{ color: RESOURCE_COLOR[r], fontWeight: 700 }}>{e.want[r]}{RESOURCE_LABEL[r].slice(0,2)}</span>);
      content = (
        <>
          {playerChip(e.player, e.color)} traded{" "}
          {offerParts}{" "}→{" "}
          {wantParts}{" "}
          {e.mode === "bank"
            ? <span style={{ color: "rgba(255,255,255,0.4)" }}>w/ Bank</span>
            : e.with ? <span>w/ {playerChip(e.with, e.withColor ?? "#fff")}</span> : null}
        </>
      );
      break;
    }
  }

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 5,
      padding: "3px 0",
      fontSize: 10,
      lineHeight: 1.45,
      color: "rgba(255,255,255,0.6)",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
    }}>
      <span style={{ minWidth: 14, opacity: 0.75, fontSize: 10 }}>{icon}</span>
      <div>{content}</div>
    </div>
  );
}

export function LogCard({ entries }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new entry
  useEffect(() => {
    if (!collapsed && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length, collapsed]);

  return (
    <div style={{
      position: "fixed",
      right: 12,
      top: 56,
      width: 230,
      zIndex: 40,
      background: "rgba(5,5,18,0.92)",
      border: "1px solid rgba(0,212,255,0.18)",
      backdropFilter: "blur(8px)",
    }}>
      {/* Header */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "6px 10px",
          borderBottom: collapsed ? "none" : "1px solid rgba(0,212,255,0.12)",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#00d4ff" }}>
          Game Log
        </span>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>
          {collapsed ? "▼ show" : "▲ hide"}
        </span>
      </div>

      {/* Entries */}
      {!collapsed && (
        <div
          ref={scrollRef}
          style={{
            maxHeight: 340,
            overflowY: "auto",
            padding: "4px 10px 6px",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(0,212,255,0.2) transparent",
          }}
        >
          {entries.length === 0 ? (
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", padding: "8px 0", textAlign: "center" }}>
              No events yet
            </div>
          ) : (
            entries.map((e, i) => <EntryRow key={i} e={e} />)
          )}
        </div>
      )}
    </div>
  );
}
