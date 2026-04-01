"use client";

import { TreePine, Pickaxe, Wheat, Mountain, Shell } from "lucide-react";
import type { ReactNode } from "react";

const RESOURCES: { key: string; icon: ReactNode; color: string }[] = [
  { key: "lumber", icon: <TreePine size={16} />,  color: "#15803d" },
  { key: "brick",  icon: <Pickaxe size={16} />,   color: "#c2410c" },
  { key: "wool",   icon: <Shell size={16} />,      color: "#4d7c0f" },
  { key: "grain",  icon: <Wheat size={16} />,      color: "#a16207" },
  { key: "ore",    icon: <Mountain size={16} />,   color: "#64748b" },
];

interface ResourceBarProps {
  resources: Record<string, number>;
}

export default function ResourceBar({ resources }: ResourceBarProps) {
  const total = Object.values(resources).reduce((a, b) => a + b, 0);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 3,
        padding: "6px 8px",
        background: "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.5)",
        borderRadius: 14,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)",
      }}
    >
      {RESOURCES.map(({ key, icon, color }) => {
        const count = resources[key] || 0;
        const hasResources = count > 0;

        return (
          <div
            key={key}
            title={`${key}: ${count}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 12px",
              borderRadius: 10,
              background: hasResources ? `${color}12` : "transparent",
              border: hasResources ? `1px solid ${color}20` : "1px solid transparent",
              transition: "background 0.15s ease, border-color 0.15s ease",
              minWidth: 52,
              justifyContent: "center",
            }}
          >
            <span style={{ color: hasResources ? color : "rgba(0,0,0,0.15)", display: "flex", alignItems: "center" }}>
              {icon}
            </span>
            <span
              style={{
                fontSize: 15,
                fontWeight: 900,
                color: hasResources ? "#1a1a2e" : "rgba(0,0,0,0.15)",
                minWidth: 12,
                textAlign: "center",
              }}
            >
              {count}
            </span>
          </div>
        );
      })}

      {/* Total divider + count */}
      <div
        style={{
          width: 1,
          height: 24,
          background: "rgba(0,0,0,0.08)",
          margin: "0 4px",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", padding: "6px 8px" }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: "rgba(0,0,0,0.3)" }}>
          {total}
        </span>
      </div>
    </div>
  );
}
