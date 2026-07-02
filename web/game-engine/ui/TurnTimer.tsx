"use client";

import { useState, useEffect, useRef } from "react";

interface TurnTimerProps {
  deadline: number;     // server unix timestamp (ms)
  totalMs: number;      // total timer duration (ms)
  serverTime: number;   // server's Date.now() at time of GAME_STATE
  isMyTurn: boolean;
}

export default function TurnTimer({ deadline, totalMs, serverTime, isMyTurn }: TurnTimerProps) {
  const [remaining, setRemaining] = useState(totalMs);
  const offsetRef = useRef(0);

  // Calculate server-client clock offset once
  useEffect(() => {
    offsetRef.current = serverTime - Date.now();
  }, [serverTime]);

  useEffect(() => {
    const tick = () => {
      const now = Date.now() + offsetRef.current;
      const left = Math.max(0, deadline - now);
      setRemaining(left);
    };
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [deadline]);

  const fraction = totalMs > 0 ? remaining / totalMs : 0;
  const seconds = Math.ceil(remaining / 1000);

  // Color based on remaining fraction
  let color = "#22c55e"; // green
  if (fraction < 0.25) color = "#ef4444"; // red
  else if (fraction < 0.5) color = "#eab308"; // yellow

  const isPulsing = fraction < 0.25 && isMyTurn;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 12px",
      borderRadius: 10,
      background: isMyTurn ? "rgba(24, 30, 46, 0.9)" : "rgba(17, 22, 36, 0.7)",
      backdropFilter: "blur(12px)",
      border: `1.5px solid ${isMyTurn ? color : "rgba(255,255,255,0.12)"}`,
      boxShadow: isMyTurn ? `0 2px 8px ${color}30` : "none",
      transition: "all 0.3s ease",
      animation: isPulsing ? "timerPulse 1s ease-in-out infinite" : "none",
      minWidth: 120,
    }}>
      {/* Progress bar */}
      <div style={{
        flex: 1,
        height: 4,
        borderRadius: 2,
        background: "rgba(255,255,255,0.14)",
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${fraction * 100}%`,
          background: color,
          borderRadius: 2,
          transition: "width 0.1s linear, background 0.3s ease",
        }} />
      </div>

      {/* Countdown */}
      <span style={{
        fontSize: 13,
        fontWeight: 800,
        fontVariantNumeric: "tabular-nums",
        color: isMyTurn ? color : "rgba(255,255,255,0.4)",
        minWidth: 28,
        textAlign: "right",
      }}>
        {seconds}s
      </span>

      <style>{`
        @keyframes timerPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
}
