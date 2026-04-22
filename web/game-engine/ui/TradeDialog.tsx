"use client";

import { useState, useMemo, useEffect } from "react";
import { X, ArrowRight, Anchor, Users } from "lucide-react";

function useCountdown(deadline: number): number {
  const [remaining, setRemaining] = useState(() => Math.max(0, deadline - Date.now()));
  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, deadline - Date.now()));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [deadline]);
  return remaining;
}

function CountdownPill({ expiresAt }: { expiresAt: number }) {
  const remaining = useCountdown(expiresAt);
  const seconds = Math.ceil(remaining / 1000);
  const urgent = remaining < 8_000;
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
      color: urgent ? "#dc2626" : "rgba(0,0,0,0.45)",
      background: urgent ? "rgba(220,38,38,0.10)" : "rgba(0,0,0,0.05)",
      padding: "2px 8px", borderRadius: 999,
    }}>
      {seconds}s
    </span>
  );
}

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

interface Player {
  id: string;
  name: string;
  color: string;
  resources: Record<string, number>;
  tradeRates: Record<string, number>;
}

interface Props {
  me: Player;
  opponents: Player[];
  onClose: () => void;
  onMaritimeTrade: (give: { resource: string; amount: number }, want: string) => void;
  onOfferTrade: (offer: Record<string, number>, want: Record<string, number>, targetPlayer?: string) => void;
}

type Tab = "bank" | "player";

export default function TradeDialog({ me, opponents, onClose, onMaritimeTrade, onOfferTrade }: Props) {
  const [tab, setTab] = useState<Tab>("bank");

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 520, maxWidth: "92vw", maxHeight: "90vh", overflow: "auto",
          padding: 20, borderRadius: 16,
          background: "rgba(255,255,255,0.96)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.18)",
          border: "1px solid rgba(0,0,0,0.06)",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: "#1a1a2e", margin: 0 }}>
            Trade
          </h2>
          <button onClick={onClose} style={btnIcon}><X size={18} /></button>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          <TabButton active={tab === "bank"} onClick={() => setTab("bank")} icon={<Anchor size={14} />} label="Bank / Harbor" />
          <TabButton active={tab === "player"} onClick={() => setTab("player")} icon={<Users size={14} />} label="Player" />
        </div>

        {tab === "bank" ? (
          <BankTab me={me} onTrade={(give, want) => { onMaritimeTrade(give, want); onClose(); }} />
        ) : (
          <PlayerTab me={me} opponents={opponents} onSubmit={(offer, want, target) => { onOfferTrade(offer, want, target); onClose(); }} />
        )}
      </div>
    </div>
  );
}

// ── Bank tab ───────────────────────────────────────────────────────────────────

function BankTab({ me, onTrade }: { me: Player; onTrade: (give: { resource: string; amount: number }, want: string) => void }) {
  const [give, setGive] = useState<Resource | null>(null);
  const [want, setWant] = useState<Resource | null>(null);

  const giveAmount = give ? me.tradeRates[give] : 0;
  const canTrade =
    give !== null && want !== null && give !== want && (me.resources[give] ?? 0) >= giveAmount;

  return (
    <div>
      <div style={sectionLabel}>Give (current rates)</div>
      <div style={resGrid}>
        {RESOURCES.map(r => {
          const rate = me.tradeRates[r] ?? 4;
          const own = me.resources[r] ?? 0;
          const enough = own >= rate;
          const active = give === r;
          return (
            <button
              key={r}
              disabled={!enough}
              onClick={() => setGive(active ? null : r)}
              style={resButton(RESOURCE_COLOR[r], active, !enough)}
            >
              <span style={{ fontSize: 18 }}>{RESOURCE_EMOJI[r]}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#1a1a2e" }}>{RESOURCE_LABEL[r]}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: rate <= 2 ? "#15803d" : rate <= 3 ? "#d97706" : "rgba(0,0,0,0.4)" }}>
                {rate}:1 · own {own}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, margin: "18px 0" }}>
        <Box label="Give">
          {give ? `${giveAmount} ${RESOURCE_EMOJI[give]}` : "—"}
        </Box>
        <ArrowRight size={20} color="rgba(0,0,0,0.35)" />
        <Box label="Receive">
          {want ? `1 ${RESOURCE_EMOJI[want]}` : "—"}
        </Box>
      </div>

      <div style={sectionLabel}>Want</div>
      <div style={resGrid}>
        {RESOURCES.map(r => {
          const active = want === r;
          const disabled = give === r;
          return (
            <button
              key={r}
              disabled={disabled}
              onClick={() => setWant(active ? null : r)}
              style={resButton(RESOURCE_COLOR[r], active, disabled)}
            >
              <span style={{ fontSize: 18 }}>{RESOURCE_EMOJI[r]}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#1a1a2e" }}>{RESOURCE_LABEL[r]}</span>
            </button>
          );
        })}
      </div>

      <button
        disabled={!canTrade}
        onClick={() => canTrade && onTrade({ resource: give!, amount: giveAmount }, want!)}
        style={primaryBtn(canTrade)}
      >
        Trade with Bank
      </button>
    </div>
  );
}

// ── Player tab ─────────────────────────────────────────────────────────────────

function PlayerTab({
  me, opponents, onSubmit,
}: {
  me: Player; opponents: Player[];
  onSubmit: (offer: Record<string, number>, want: Record<string, number>, targetPlayer?: string) => void;
}) {
  const [offer, setOffer] = useState<Record<Resource, number>>({ lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0 });
  const [want, setWant] = useState<Record<Resource, number>>({ lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0 });
  const [target, setTarget] = useState<string | "all">("all");

  const offerTotal = useMemo(() => RESOURCES.reduce((s, r) => s + offer[r], 0), [offer]);
  const wantTotal = useMemo(() => RESOURCES.reduce((s, r) => s + want[r], 0), [want]);
  const overlap = RESOURCES.some(r => offer[r] > 0 && want[r] > 0);
  const enoughOwned = RESOURCES.every(r => offer[r] <= (me.resources[r] ?? 0));
  const valid = offerTotal > 0 && wantTotal > 0 && !overlap && enoughOwned;

  return (
    <div>
      <div style={sectionLabel}>You give</div>
      <ResourceCounter values={offer} setValues={setOffer} max={r => me.resources[r] ?? 0} />

      <div style={{ height: 12 }} />

      <div style={sectionLabel}>You want</div>
      <ResourceCounter values={want} setValues={setWant} />

      <div style={{ height: 16 }} />

      <div style={sectionLabel}>Target</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        <TargetButton active={target === "all"} onClick={() => setTarget("all")} color="#64748b" label="Anyone" />
        {opponents.map(o => (
          <TargetButton key={o.id} active={target === o.id} onClick={() => setTarget(o.id)} color={o.color} label={o.name} />
        ))}
      </div>

      {overlap && <ErrorRow text="Cannot give and want the same resource" />}
      {!enoughOwned && <ErrorRow text="You don't have enough to give" />}

      <button
        disabled={!valid}
        onClick={() => {
          const cleanOffer = Object.fromEntries(RESOURCES.filter(r => offer[r] > 0).map(r => [r, offer[r]]));
          const cleanWant = Object.fromEntries(RESOURCES.filter(r => want[r] > 0).map(r => [r, want[r]]));
          onSubmit(cleanOffer, cleanWant, target === "all" ? undefined : target);
        }}
        style={primaryBtn(valid)}
      >
        Send Offer
      </button>
    </div>
  );
}

function ResourceCounter({
  values, setValues, max,
}: {
  values: Record<Resource, number>;
  setValues: (v: Record<Resource, number>) => void;
  max?: (r: Resource) => number;
}) {
  return (
    <div style={resGrid}>
      {RESOURCES.map(r => {
        const v = values[r];
        const cap = max ? max(r) : 99;
        const owned = max ? max(r) : null;
        return (
          <div
            key={r}
            style={{
              ...resButton(RESOURCE_COLOR[r], v > 0, false),
              cursor: "default",
              padding: "8px 4px 6px",
              gap: 3,
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>{RESOURCE_EMOJI[r]}</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: "#1a1a2e", lineHeight: 1 }}>{RESOURCE_LABEL[r]}</span>
            {owned !== null && (
              <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(0,0,0,0.4)", lineHeight: 1 }}>own {owned}</span>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setValues({ ...values, [r]: Math.max(0, v - 1) })}
                style={stepBtn}
              >−</button>
              <span style={{ fontSize: 14, fontWeight: 900, minWidth: 16, textAlign: "center", color: "#1a1a2e" }}>{v}</span>
              <button
                type="button"
                onClick={() => setValues({ ...values, [r]: Math.min(cap, v + 1) })}
                style={stepBtn}
                disabled={v >= cap}
              >+</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Atoms ──────────────────────────────────────────────────────────────────────

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: "10px 12px", borderRadius: 10,
        border: active ? "2px solid #d97706" : "1px solid rgba(0,0,0,0.08)",
        background: active ? "rgba(217,119,6,0.10)" : "rgba(0,0,0,0.02)",
        color: active ? "#92400e" : "rgba(0,0,0,0.5)",
        fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}
    >
      {icon} {label}
    </button>
  );
}

function TargetButton({ active, onClick, color, label }: { active: boolean; onClick: () => void; color: string; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 14px", borderRadius: 8,
        border: active ? `2px solid ${color}` : "1px solid rgba(0,0,0,0.08)",
        background: active ? `${color}22` : "rgba(0,0,0,0.02)",
        color: active ? color : "rgba(0,0,0,0.6)",
        fontSize: 12, fontWeight: 800, cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function Box({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      padding: "10px 16px", borderRadius: 10, background: "rgba(0,0,0,0.04)",
      minWidth: 96, textAlign: "center",
    }}>
      <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(0,0,0,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: "#1a1a2e", marginTop: 2 }}>{children}</div>
    </div>
  );
}

function ErrorRow({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 11, color: "#dc2626", fontWeight: 700, marginBottom: 8, textAlign: "center" }}>
      {text}
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 800, letterSpacing: 1.2,
  textTransform: "uppercase", color: "rgba(0,0,0,0.45)", marginBottom: 8,
};
const resGrid: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6,
};
const resButton = (color: string, active: boolean, disabled: boolean): React.CSSProperties => ({
  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
  padding: "8px 4px", borderRadius: 10,
  border: active ? `2px solid ${color}` : "1px solid rgba(0,0,0,0.08)",
  background: active ? `${color}22` : "rgba(255,255,255,0.6)",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.4 : 1,
  transition: "all 0.12s ease",
});
const primaryBtn = (enabled: boolean): React.CSSProperties => ({
  width: "100%", marginTop: 16,
  padding: "12px 20px", borderRadius: 12,
  background: enabled ? "linear-gradient(145deg, #fbbf24, #d97706)" : "rgba(0,0,0,0.08)",
  color: enabled ? "#fff" : "rgba(0,0,0,0.3)",
  fontSize: 13, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase",
  border: "none", cursor: enabled ? "pointer" : "not-allowed",
  boxShadow: enabled ? "0 4px 16px rgba(217,119,6,0.3)" : "none",
});
const btnIcon: React.CSSProperties = {
  background: "rgba(0,0,0,0.06)", border: "none", borderRadius: 8,
  width: 32, height: 32, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  color: "#1a1a2e", padding: 0,
};
const stepBtn: React.CSSProperties = {
  width: 22, height: 22, borderRadius: 6, padding: 0,
  border: "1px solid rgba(0,0,0,0.15)", background: "rgba(255,255,255,0.95)",
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 16, fontWeight: 900, lineHeight: 1, color: "#1a1a2e",
  fontFamily: "system-ui, sans-serif",
};

// ── Incoming offer banner ────────────────────────────────────────────────────

interface IncomingProps {
  fromName: string;
  fromColor: string;
  offer: Record<string, number>;
  want: Record<string, number>;
  expiresAt: number;
  canAccept: boolean;
  preAccepted: boolean;
  acceptedByPlayers: { name: string; color: string }[];
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingTradeBanner({
  fromName, fromColor, offer, want, expiresAt,
  canAccept, preAccepted, acceptedByPlayers,
  onAccept, onReject,
}: IncomingProps) {
  return (
    <div style={panelBox(fromColor)}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={pillBadge(fromColor)}>{fromName}</span>
        <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(0,0,0,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>
          offers
        </span>
        <span style={{ flex: 1 }} />
        <CountdownPill expiresAt={expiresAt} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <ResourceLine values={offer} />
        <ArrowRight size={14} color="rgba(0,0,0,0.35)" />
        <ResourceLine values={want} />
      </div>

      {acceptedByPlayers.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(0,0,0,0.45)", letterSpacing: 1, textTransform: "uppercase" }}>
            Accepted
          </span>
          {acceptedByPlayers.map(p => (
            <span key={p.name} style={pillBadge(p.color)}>✓ {p.name}</span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 6 }}>
        {preAccepted ? (
          <>
            <span style={{
              flex: 1, padding: "8px 12px", borderRadius: 8,
              background: "rgba(34,197,94,0.12)", color: "#15803d",
              fontSize: 11, fontWeight: 900, letterSpacing: 0.5,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              ✓ Waiting for {fromName}
            </span>
            <button onClick={onReject} style={btnSecondary}>Withdraw</button>
          </>
        ) : (
          <>
            <button disabled={!canAccept} onClick={onAccept} style={btnPrimary(canAccept)}>
              Accept
            </button>
            <button onClick={onReject} style={btnSecondary}>Decline</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── My offer panel (offerer view) ────────────────────────────────────────────

interface MyOfferProps {
  offer: Record<string, number>;
  want: Record<string, number>;
  expiresAt: number;
  acceptors: { id: string; name: string; color: string }[];
  onFinalize: (partnerId: string) => void;
  onCancel: () => void;
}

export function MyOfferPanel({ offer, want, expiresAt, acceptors, onFinalize, onCancel }: MyOfferProps) {
  return (
    <div style={panelBox("#d97706")}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: "#92400e", letterSpacing: 1, textTransform: "uppercase" }}>
          Your offer
        </span>
        <CountdownPill expiresAt={expiresAt} />
        <span style={{ flex: 1 }} />
        <button onClick={onCancel} style={btnSecondary}>Cancel</button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <ResourceLine values={offer} />
        <ArrowRight size={14} color="rgba(0,0,0,0.35)" />
        <ResourceLine values={want} />
      </div>

      {acceptors.length === 0 ? (
        <div style={{ fontSize: 11, color: "rgba(0,0,0,0.45)", fontWeight: 600, textAlign: "center", padding: "6px 0" }}>
          Waiting for someone to accept…
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(0,0,0,0.45)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
            Choose partner to confirm
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {acceptors.map(a => (
              <button
                key={a.id}
                onClick={() => onFinalize(a.id)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px", borderRadius: 8,
                  background: `${a.color}18`, border: `1.5px solid ${a.color}`,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 900, color: a.color }}>{a.name}</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: a.color, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Trade →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ResourceLine({ values }: { values: Record<string, number> }) {
  const items = RESOURCES.filter(r => (values[r] ?? 0) > 0);
  if (items.length === 0) return <span style={{ fontSize: 11, color: "rgba(0,0,0,0.4)" }}>—</span>;
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 800, color: "#1a1a2e" }}>
      {items.map(r => (
        <span key={r} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
          {values[r]}<span style={{ fontSize: 14 }}>{RESOURCE_EMOJI[r]}</span>
        </span>
      ))}
    </span>
  );
}

const panelBox = (accent: string): React.CSSProperties => ({
  padding: "12px 14px", borderRadius: 12,
  background: "rgba(255,255,255,0.96)",
  backdropFilter: "blur(20px)",
  border: `2px solid ${accent}`,
  boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
  fontFamily: "'Inter', system-ui, sans-serif",
});
const pillBadge = (color: string): React.CSSProperties => ({
  fontSize: 11, fontWeight: 900, color: "#fff",
  background: color, padding: "3px 10px", borderRadius: 999, letterSpacing: 0.3,
});
const btnPrimary = (enabled: boolean): React.CSSProperties => ({
  flex: 1, padding: "8px 14px", borderRadius: 8, border: "none",
  background: enabled ? "#15803d" : "rgba(0,0,0,0.08)",
  color: enabled ? "#fff" : "rgba(0,0,0,0.3)",
  fontSize: 12, fontWeight: 900, letterSpacing: 0.5,
  cursor: enabled ? "pointer" : "not-allowed",
});
const btnSecondary: React.CSSProperties = {
  padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)",
  background: "rgba(0,0,0,0.03)", color: "rgba(0,0,0,0.55)",
  fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
};
