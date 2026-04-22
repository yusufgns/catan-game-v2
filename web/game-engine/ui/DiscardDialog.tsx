"use client";

import { useState, useEffect, useMemo } from "react";
import { AlertTriangle, Plus, Minus } from "lucide-react";

const RESOURCES = ["lumber", "brick", "wool", "grain", "ore"] as const;
type Resource = (typeof RESOURCES)[number];

const RESOURCE_LABEL: Record<Resource, string> = {
  lumber: "Lumber", brick: "Brick", wool: "Wool", grain: "Grain", ore: "Ore",
};
const RESOURCE_COLOR: Record<Resource, string> = {
  lumber: "#22c55e", brick: "#f97316", wool: "#a3e635", grain: "#eab308", ore: "#94a3b8",
};
const RESOURCE_EMOJI: Record<Resource, string> = {
  lumber: "🌲", brick: "🧱", wool: "🐑", grain: "🌾", ore: "⛰️",
};

interface Props {
  required: number;
  resources: Record<string, number>;
  deadline: number | null;
  onSubmit: (selection: Record<string, number>) => void;
}

export default function DiscardDialog({ required, resources, deadline, onSubmit }: Props) {
  const [selection, setSelection] = useState<Record<Resource, number>>({
    lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0,
  });
  const [remaining, setRemaining] = useState(() => deadline ? Math.max(0, deadline - Date.now()) : 0);

  useEffect(() => {
    if (!deadline) return;
    const tick = () => setRemaining(Math.max(0, deadline - Date.now()));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [deadline]);

  const totalSelected = useMemo(() => RESOURCES.reduce((s, r) => s + selection[r], 0), [selection]);
  const totalCards = useMemo(() => RESOURCES.reduce((s, r) => s + (resources[r] ?? 0), 0), [resources]);
  const valid = totalSelected === required;
  const seconds = Math.ceil(remaining / 1000);
  const urgent = remaining < 4_000;

  const update = (r: Resource, delta: number) => {
    setSelection(prev => {
      const cap = resources[r] ?? 0;
      const next = Math.max(0, Math.min(cap, prev[r] + delta));
      return { ...prev, [r]: next };
    });
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 110,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: 540, maxWidth: "92vw",
          padding: 24, borderRadius: 16,
          background: "rgba(255,255,255,0.98)",
          border: "2px solid #dc2626",
          boxShadow: "0 24px 60px rgba(220,38,38,0.20), 0 0 0 1px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <AlertTriangle size={22} color="#dc2626" />
          <h2 style={{ fontSize: 16, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: "#1a1a2e", margin: 0 }}>
            7 Geldi — Kart Bağışı
          </h2>
          <span style={{ flex: 1 }} />
          {deadline && (
            <span style={{
              fontSize: 13, fontWeight: 900, letterSpacing: 0.5,
              color: urgent ? "#dc2626" : "#92400e",
              background: urgent ? "rgba(220,38,38,0.12)" : "rgba(217,119,6,0.10)",
              padding: "4px 12px", borderRadius: 999,
            }}>
              {seconds}s
            </span>
          )}
        </div>

        <p style={{ fontSize: 13, color: "rgba(0,0,0,0.6)", margin: "0 0 16px", lineHeight: 1.5 }}>
          Elinde <b>{totalCards}</b> kart var, {Math.floor(totalCards / 2)} tanesini bankaya bağışlamalısın.
          Süre dolarsa otomatik seçim yapılır.
        </p>

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          padding: "10px 16px", marginBottom: 14,
          borderRadius: 10,
          background: valid ? "rgba(21,128,61,0.10)" : "rgba(0,0,0,0.04)",
          border: valid ? "1px solid rgba(21,128,61,0.3)" : "1px solid rgba(0,0,0,0.06)",
        }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(0,0,0,0.5)", letterSpacing: 1, textTransform: "uppercase" }}>
            Seçilen
          </span>
          <span style={{ fontSize: 24, fontWeight: 900, color: valid ? "#15803d" : "#1a1a2e" }}>
            {totalSelected}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(0,0,0,0.4)" }}>/ {required}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
          {RESOURCES.map(r => {
            const owned = resources[r] ?? 0;
            const sel = selection[r];
            return (
              <div
                key={r}
                style={{
                  padding: "10px 4px 8px", borderRadius: 10,
                  background: sel > 0 ? `${RESOURCE_COLOR[r]}22` : "rgba(255,255,255,0.6)",
                  border: sel > 0 ? `2px solid ${RESOURCE_COLOR[r]}` : "1px solid rgba(0,0,0,0.08)",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  opacity: owned === 0 ? 0.4 : 1,
                }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>{RESOURCE_EMOJI[r]}</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: "#1a1a2e", lineHeight: 1 }}>{RESOURCE_LABEL[r]}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(0,0,0,0.4)", lineHeight: 1 }}>own {owned}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => update(r, -1)}
                    disabled={sel === 0}
                    style={stepBtn(sel === 0)}
                  ><Minus size={11} /></button>
                  <span style={{ fontSize: 14, fontWeight: 900, minWidth: 16, textAlign: "center", color: "#1a1a2e" }}>{sel}</span>
                  <button
                    type="button"
                    onClick={() => update(r, 1)}
                    disabled={sel >= owned}
                    style={stepBtn(sel >= owned)}
                  ><Plus size={11} /></button>
                </div>
              </div>
            );
          })}
        </div>

        <button
          disabled={!valid}
          onClick={() => valid && onSubmit(selection)}
          style={{
            width: "100%", marginTop: 18,
            padding: "14px 20px", borderRadius: 12,
            background: valid ? "linear-gradient(145deg, #ef4444, #dc2626)" : "rgba(0,0,0,0.08)",
            color: valid ? "#fff" : "rgba(0,0,0,0.3)",
            fontSize: 13, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase",
            border: "none", cursor: valid ? "pointer" : "not-allowed",
            boxShadow: valid ? "0 6px 20px rgba(220,38,38,0.30)" : "none",
            fontFamily: "inherit",
          }}
        >
          Bağışla
        </button>
      </div>
    </div>
  );
}

const stepBtn = (disabled: boolean): React.CSSProperties => ({
  width: 24, height: 24, borderRadius: 6, padding: 0,
  border: "1px solid rgba(0,0,0,0.15)",
  background: disabled ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.95)",
  cursor: disabled ? "not-allowed" : "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  color: disabled ? "rgba(0,0,0,0.25)" : "#1a1a2e",
  opacity: disabled ? 0.5 : 1,
});
