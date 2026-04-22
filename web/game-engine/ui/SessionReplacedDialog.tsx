"use client";

import { MonitorSmartphone } from "lucide-react";

interface SessionReplacedDialogProps {
  onGoToOtherTab: () => void;
  onReconnect: () => void;
}

export function SessionReplacedDialog({ onGoToOtherTab, onReconnect }: SessionReplacedDialogProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 200,
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.5)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)",
          borderRadius: 16,
          padding: "32px 40px",
          textAlign: "center" as const,
          maxWidth: 380,
        }}
      >
        <MonitorSmartphone size={32} style={{ color: "#f59e0b", marginBottom: 12 }} />
        <div style={{ fontSize: 17, fontWeight: 800, color: "#1a1a2e", marginBottom: 6 }}>
          Başka bir sekmede açık
        </div>
        <div style={{ fontSize: 14, color: "rgba(0,0,0,0.5)", marginBottom: 24, lineHeight: 1.6 }}>
          Bu oyun farklı bir sekmede açıldı. Devam etmek için o sekmeye geç veya burada yeniden bağlan.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onGoToOtherTab}
            style={{
              flex: 1,
              padding: "10px 0",
              fontSize: 13,
              fontWeight: 800,
              color: "rgba(0,0,0,0.5)",
              background: "rgba(0,0,0,0.05)",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            Kapat
          </button>
          <button
            onClick={onReconnect}
            style={{
              flex: 1,
              padding: "10px 0",
              fontSize: 13,
              fontWeight: 800,
              color: "#fff",
              background: "#f59e0b",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(245,158,11,0.3)",
            }}
          >
            Buradan devam et
          </button>
        </div>
      </div>
    </div>
  );
}
