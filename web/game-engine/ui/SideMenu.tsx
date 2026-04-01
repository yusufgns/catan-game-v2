"use client";

import { useState } from "react";
import { Settings, LogOut, MessageCircle, ScrollText, ChevronLeft, ChevronRight, X } from "lucide-react";

interface SideMenuProps {
  onOpenSettings: () => void;
  onLeaveGame: () => void;
  chatOpen: boolean;
  logOpen: boolean;
  onToggleChat: () => void;
  onToggleLog: () => void;
}

const glassStyle = {
  background: "rgba(255, 255, 255, 0.7)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.5)",
  boxShadow: "0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)",
};

export default function SideMenu({
  onOpenSettings, onLeaveGame, chatOpen, logOpen, onToggleChat, onToggleLog,
}: SideMenuProps) {
  const [collapsed, setCollapsed] = useState(false);

  const buttons = [
    { icon: <Settings size={18} />, label: "Settings", onClick: onOpenSettings, active: false },
    { icon: <MessageCircle size={18} />, label: "Chat", onClick: onToggleChat, active: chatOpen },
    { icon: <ScrollText size={18} />, label: "Log", onClick: onToggleLog, active: logOpen },
    { icon: <LogOut size={18} />, label: "Leave", onClick: onLeaveGame, active: false, danger: true },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        ...glassStyle,
        borderRadius: 14,
        padding: 4,
        pointerEvents: "auto",
      }}
    >
      {!collapsed && buttons.map((btn, i) => (
        <button
          key={i}
          onClick={btn.onClick}
          title={btn.label}
          style={{
            width: 44,
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            background: btn.active
              ? "rgba(217,119,6,0.15)"
              : "transparent",
            color: btn.danger
              ? "#dc2626"
              : btn.active
                ? "#92400e"
                : "rgba(0,0,0,0.4)",
            transition: "all 0.15s ease",
          }}
        >
          {btn.icon}
        </button>
      ))}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? "Open menu" : "Close menu"}
        style={{
          width: 44,
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 10,
          border: "none",
          cursor: "pointer",
          background: "transparent",
          color: "rgba(0,0,0,0.25)",
          transition: "all 0.15s ease",
          borderTop: collapsed ? "none" : "1px solid rgba(0,0,0,0.06)",
        }}
      >
        {collapsed ? <ChevronRight size={16} /> : <X size={14} />}
      </button>
    </div>
  );
}

// ─── Leave Game Dialog ────────────────────────────────────────────────

export function LeaveGameDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.3)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 100,
      }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          ...glassStyle,
          background: "rgba(255,255,255,0.9)",
          borderRadius: 16,
          padding: "32px 40px",
          textAlign: "center",
          maxWidth: 340,
        }}
      >
        <LogOut size={28} style={{ color: "#dc2626", marginBottom: 12 }} />
        <div style={{ fontSize: 16, fontWeight: 800, color: "#1a1a2e", marginBottom: 6 }}>
          Leave Game
        </div>
        <div style={{ fontSize: 14, color: "rgba(0,0,0,0.45)", marginBottom: 24, lineHeight: 1.5 }}>
          Are you sure you want to leave? Your progress will be lost.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onCancel}
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
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: "10px 0",
              fontSize: 13,
              fontWeight: 800,
              color: "#fff",
              background: "#dc2626",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(220,38,38,0.3)",
            }}
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Chat Panel ────────────────────────────────────────────────────────

export function ChatPanel({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<{ sender: string; text: string; time: string }[]>([]);

  const sendMessage = () => {
    if (!message.trim()) return;
    setMessages(prev => [...prev, {
      sender: "You",
      text: message.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }]);
    setMessage("");
  };

  return (
    <div
      style={{
        width: 280,
        height: 360,
        display: "flex",
        flexDirection: "column",
        ...glassStyle,
        background: "rgba(255,255,255,0.85)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <MessageCircle size={14} style={{ color: "#92400e" }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: "#1a1a2e", textTransform: "uppercase", letterSpacing: 1 }}>
            Chat
          </span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.3)", display: "flex" }}>
          <X size={14} />
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {messages.length === 0 && (
          <div style={{ fontSize: 12, color: "rgba(0,0,0,0.2)", textAlign: "center", marginTop: 40 }}>
            No messages yet
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#92400e" }}>{msg.sender}</span>
              <span style={{ fontSize: 9, color: "rgba(0,0,0,0.2)" }}>{msg.time}</span>
            </div>
            <div style={{ fontSize: 13, color: "#1a1a2e", lineHeight: 1.4 }}>{msg.text}</div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: "8px 10px", borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", gap: 6 }}>
        <input
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: "8px 12px",
            fontSize: 12,
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 8,
            background: "rgba(255,255,255,0.6)",
            outline: "none",
            color: "#1a1a2e",
          }}
        />
        <button
          onClick={sendMessage}
          style={{
            padding: "8px 12px",
            fontSize: 11,
            fontWeight: 800,
            color: "#fff",
            background: "#92400e",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

// ─── Game Log Panel ────────────────────────────────────────────────────

export function LogPanel({ logs, onClose }: { logs: string[]; onClose: () => void }) {
  return (
    <div
      style={{
        width: 280,
        height: 240,
        display: "flex",
        flexDirection: "column",
        ...glassStyle,
        background: "rgba(255,255,255,0.85)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ScrollText size={14} style={{ color: "#92400e" }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: "#1a1a2e", textTransform: "uppercase", letterSpacing: 1 }}>
            Game Log
          </span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.3)", display: "flex" }}>
          <X size={14} />
        </button>
      </div>

      {/* Log entries */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {logs.length === 0 && (
          <div style={{ fontSize: 12, color: "rgba(0,0,0,0.2)", textAlign: "center", marginTop: 30 }}>
            No events yet
          </div>
        )}
        {logs.map((log, i) => (
          <div key={i} style={{ fontSize: 12, color: "rgba(0,0,0,0.5)", lineHeight: 1.4, paddingBottom: 4, borderBottom: "1px solid rgba(0,0,0,0.03)" }}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}
