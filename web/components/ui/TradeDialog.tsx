"use client";

import { useState, useMemo } from "react";
import type { Player, ResourceType, Resources } from "@/lib/gameTypes";
import { RESOURCE_LABEL, RESOURCE_COLOR } from "@/lib/gameTypes";
import { playerTradeRates } from "@/lib/harborUtils";

const ALL: ResourceType[] = ["lumber", "brick", "wool", "grain", "ore"];

const ICON: Record<ResourceType, string> = {
  lumber: "🌲",
  brick:  "🧱",
  wool:   "🐑",
  grain:  "🌾",
  ore:    "🪨",
};

type TradeMode = "bank" | "player";

export interface TradeDoneEvent {
  mode: TradeMode;
  offer: Partial<Record<ResourceType, number>>;
  want: Partial<Record<ResourceType, number>>;
  targetId?: string;
}

interface Props {
  currentPlayer: Player;
  otherPlayers: Player[];
  onTrade: (e: TradeDoneEvent) => void;
  onClose: () => void;
}

// ── Resource counter card ─────────────────────────────────────────────────────

function ResCard({
  resource, count, max, hint, onInc, onDec,
}: {
  resource: ResourceType; count: number; max: number; hint?: string;
  onInc: () => void; onDec: () => void;
}) {
  const col = RESOURCE_COLOR[resource];
  const active = count > 0;
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
      padding: "6px 8px",
      background: active ? `${col}1a` : "rgba(255,255,255,0.04)",
      border: `1px solid ${active ? col + "55" : "rgba(255,255,255,0.09)"}`,
      borderRadius: 6, minWidth: 58, cursor: "default",
      transition: "all 0.15s",
    }}>
      {/* inc */}
      <button
        onClick={onInc} disabled={count >= max}
        style={{
          width: 22, height: 16, fontSize: 11, lineHeight: 1,
          background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 3,
          color: count < max ? col : "rgba(255,255,255,0.15)",
          cursor: count < max ? "pointer" : "default",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>▲</button>

      {/* icon + count */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 16 }}>{ICON[resource]}</div>
        <div style={{
          fontSize: 12, fontWeight: 800,
          color: active ? col : "rgba(255,255,255,0.25)",
        }}>{count}</div>
        {hint && (
          <div style={{ fontSize: 8, color: active ? col + "99" : "rgba(255,255,255,0.2)", marginTop: 1 }}>
            {hint}
          </div>
        )}
      </div>

      {/* dec */}
      <button
        onClick={onDec} disabled={count <= 0}
        style={{
          width: 22, height: 16, fontSize: 11, lineHeight: 1,
          background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 3,
          color: count > 0 ? col : "rgba(255,255,255,0.15)",
          cursor: count > 0 ? "pointer" : "default",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>▼</button>
    </div>
  );
}

// ── Inner dialog (remounts on open → fresh state each time) ──────────────────

function Inner({ currentPlayer, otherPlayers, onTrade, onClose }: Props) {
  const [mode, setMode] = useState<TradeMode>("bank");
  const [targetId, setTargetId] = useState(otherPlayers[0]?.id ?? "");
  const [offer, setOffer] = useState<Partial<Record<ResourceType, number>>>({});
  const [want, setWant]   = useState<Partial<Record<ResourceType, number>>>({});

  const rates = useMemo(() => playerTradeRates(currentPlayer), [currentPlayer]);
  const target = otherPlayers.find(p => p.id === targetId);

  // ── Offer adjustments ────────────────────────────────────────────────────
  function adjOffer(r: ResourceType, d: number) {
    const next = Math.max(0, Math.min(currentPlayer.resources[r], (offer[r] ?? 0) + d));
    setOffer({ ...offer, [r]: next });
  }

  // ── Want adjustments ─────────────────────────────────────────────────────
  function adjWant(r: ResourceType, d: number) {
    const next = Math.max(0, (want[r] ?? 0) + d);
    setWant({ ...want, [r]: next });
  }

  // ── Bank validation ───────────────────────────────────────────────────────
  const bankCredits = useMemo(() => {
    let total = 0;
    for (const r of ALL) {
      const o = offer[r] ?? 0;
      if (o === 0) continue;
      if (o % rates[r] !== 0) return -1;
      total += o / rates[r];
    }
    return total;
  }, [offer, rates]);

  const totalWanted = ALL.reduce((s, r) => s + (want[r] ?? 0), 0);

  const bankValid  = bankCredits > 0 && bankCredits === totalWanted;
  const playerValid = (() => {
    const totalOffer = ALL.reduce((s, r) => s + (offer[r] ?? 0), 0);
    if (totalOffer === 0 || totalWanted === 0) return false;
    for (const r of ALL) {
      if ((offer[r] ?? 0) > currentPlayer.resources[r]) return false;
    }
    return true;
  })();

  const isValid = mode === "bank" ? bankValid : playerValid;

  function execute() {
    if (!isValid) return;
    onTrade({ mode, offer, want, targetId: mode === "player" ? targetId : undefined });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: "fixed", left: "50%", top: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 200,
      width: 460,
      background: "rgba(4,4,16,0.97)",
      border: "1px solid rgba(0,212,255,0.22)",
      backdropFilter: "blur(14px)",
      boxShadow: "0 8px 48px rgba(0,0,0,0.85)",
      padding: "14px 16px 16px",
      fontFamily: "Arial, sans-serif",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#00d4ff" }}>
          Trade
        </span>
        <div style={{ display: "flex", gap: 5 }}>
          {(["bank", "player"] as TradeMode[]).map(m => (
            <button key={m}
              onClick={() => { setMode(m); setOffer({}); setWant({}); }}
              style={{
                padding: "3px 12px", fontSize: 10, fontWeight: 700,
                letterSpacing: 1, textTransform: "uppercase", cursor: "pointer",
                borderRadius: 4,
                background: mode === m ? "rgba(0,212,255,0.15)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${mode === m ? "rgba(0,212,255,0.5)" : "rgba(255,255,255,0.1)"}`,
                color: mode === m ? "#00d4ff" : "rgba(255,255,255,0.35)",
              }}>
              {m === "bank" ? "🏦 Bank" : "👥 Player"}
            </button>
          ))}
        </div>
        <button onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", fontSize: 16 }}>
          ✕
        </button>
      </div>

      {/* Your harbors / trade rates — always visible */}
      <div style={{ marginBottom: 10 }}>
        <div style={{
          fontSize: 8, letterSpacing: 2, textTransform: "uppercase",
          color: "rgba(255,255,255,0.25)", marginBottom: 5,
        }}>
          Your Trade Rates
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {ALL.map(r => {
            const rate = rates[r];
            const hasHarbor = rate < 4;
            return (
              <div key={r} style={{
                display: "flex", alignItems: "center", gap: 4,
                fontSize: 10, fontWeight: 700, padding: "3px 10px",
                borderRadius: 4,
                background: hasHarbor ? `${RESOURCE_COLOR[r]}1a` : "rgba(255,255,255,0.04)",
                border: `1.5px solid ${hasHarbor ? RESOURCE_COLOR[r] + "66" : "rgba(255,255,255,0.08)"}`,
                color: hasHarbor ? RESOURCE_COLOR[r] : "rgba(255,255,255,0.28)",
                position: "relative",
              }}>
                <span style={{ fontSize: 13 }}>{ICON[r]}</span>
                <span>{rate}:1</span>
                {hasHarbor && (
                  <span style={{
                    fontSize: 7, fontWeight: 800, letterSpacing: 1,
                    padding: "1px 3px", borderRadius: 2,
                    background: `${RESOURCE_COLOR[r]}33`,
                    color: RESOURCE_COLOR[r],
                  }}>
                    PORT
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Player target row */}
      {mode === "player" && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: 1 }}>WITH:</span>
          {otherPlayers.map(p => (
            <button key={p.id}
              onClick={() => { setTargetId(p.id); setWant({}); }}
              style={{
                padding: "3px 10px", fontSize: 10, fontWeight: 700,
                cursor: "pointer", borderRadius: 4,
                background: targetId === p.id ? `${p.color}22` : "rgba(255,255,255,0.05)",
                border: `1px solid ${targetId === p.id ? p.color + "66" : "rgba(255,255,255,0.1)"}`,
                color: targetId === p.id ? p.color : "rgba(255,255,255,0.35)",
              }}>
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* ── You Offer ── */}
      <div style={{ marginBottom: 10 }}>
        <div style={{
          fontSize: 9, letterSpacing: 2, textTransform: "uppercase",
          color: "rgba(255,110,110,0.85)", marginBottom: 6,
          display: "flex", alignItems: "center", gap: 5,
        }}>
          <span style={{ fontSize: 11 }}>▲</span> You Offer
          <span style={{ color: "rgba(255,255,255,0.25)", fontWeight: 400 }}>
            (you have: {ALL.map(r => currentPlayer.resources[r] > 0 ? `${ICON[r]}${currentPlayer.resources[r]}` : null).filter(Boolean).join(" ") || "—"})
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {ALL.map(r => (
            <ResCard
              key={r} resource={r}
              count={offer[r] ?? 0}
              max={currentPlayer.resources[r]}
              hint={mode === "bank" && rates[r] < 4 ? `${rates[r]}:1` : undefined}
              onInc={() => adjOffer(r, 1)}
              onDec={() => adjOffer(r, -1)}
            />
          ))}
        </div>
        {mode === "bank" && bankCredits < 0 && (
          <div style={{ fontSize: 9, marginTop: 5, color: "rgba(255,100,100,0.7)" }}>
            Must offer multiples of each resource&apos;s trade rate
          </div>
        )}
      </div>

      {/* ── You Receive ── */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontSize: 9, letterSpacing: 2, textTransform: "uppercase",
          color: "rgba(90,255,140,0.85)", marginBottom: 6,
          display: "flex", alignItems: "center", gap: 5,
        }}>
          <span style={{ fontSize: 11 }}>▼</span> You Receive
          {mode === "bank" && bankCredits > 0 && (
            <span style={{
              color: totalWanted === bankCredits ? "#00ff88" : "rgba(255,215,0,0.8)",
              fontWeight: 700,
            }}>
              {totalWanted} / {bankCredits} slot{bankCredits !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {ALL.map(r => (
            <ResCard
              key={r} resource={r}
              count={want[r] ?? 0}
              max={99}
              onInc={() => adjWant(r, 1)}
              onDec={() => adjWant(r, -1)}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={onClose}
          style={{
            padding: "5px 18px", fontSize: 10, fontWeight: 700, letterSpacing: 2,
            textTransform: "uppercase", cursor: "pointer", borderRadius: 4,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.4)",
          }}>
          Cancel
        </button>
        <button onClick={execute} disabled={!isValid}
          style={{
            padding: "5px 22px", fontSize: 10, fontWeight: 700, letterSpacing: 2,
            textTransform: "uppercase", cursor: isValid ? "pointer" : "default", borderRadius: 4,
            background: isValid ? "rgba(0,212,255,0.18)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${isValid ? "rgba(0,212,255,0.5)" : "rgba(255,255,255,0.1)"}`,
            color: isValid ? "#00d4ff" : "rgba(255,255,255,0.2)",
          }}>
          ⇄ Trade
        </button>
      </div>
    </div>
  );
}

// ── Public export — remounts Inner each time dialog opens (fresh state) ───────

export function TradeDialog(props: Props & { open: boolean }) {
  if (!props.open) return null;
  return <Inner {...props} />;
}
