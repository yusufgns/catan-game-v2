"use client";

import { Bot } from "lucide-react";

interface ReplacedByBotDialogProps {
  gameId: string;
  onGoHome: () => void;
  onReconnect: () => void;
}

export function ReplacedByBotDialog({ gameId, onGoHome, onReconnect }: ReplacedByBotDialogProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
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
          maxWidth: 400,
        }}
      >
        <Bot size={36} style={{ color: "#6366f1", marginBottom: 12 }} />
        <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e", marginBottom: 6 }}>
          Oyundan Çıkarıldınız
        </div>
        <div style={{ fontSize: 14, color: "rgba(0,0,0,0.5)", marginBottom: 24, lineHeight: 1.6 }}>
          2 tur boyunca işlem yapmadığınız için yerinize bot oynuyor.
          Geri dönüp kontrolü alabilirsiniz.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onGoHome}
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
            Ana Sayfa
          </button>
          <button
            onClick={onReconnect}
            style={{
              flex: 1,
              padding: "10px 0",
              fontSize: 13,
              fontWeight: 800,
              color: "#fff",
              background: "#6366f1",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(99,102,241,0.3)",
            }}
          >
            Geri Bağlan
          </button>
        </div>
      </div>
    </div>
  );
}
