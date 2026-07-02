"use client";

import { TreePine, Pickaxe, Wheat, Mountain, Shell } from "lucide-react";
import type { ReactNode } from "react";
import { PANEL, TXT, RESOURCE_COLORS } from "./theme";

const RESOURCES: { key: string; icon: ReactNode }[] = [
  { key: "lumber", icon: <TreePine size={17} /> },
  { key: "brick",  icon: <Pickaxe size={17} /> },
  { key: "wool",   icon: <Shell size={17} /> },
  { key: "grain",  icon: <Wheat size={17} /> },
  { key: "ore",    icon: <Mountain size={17} /> },
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
        gap: 4,
        padding: "7px 10px",
        borderRadius: 16,
        ...PANEL,
      }}
    >
      {RESOURCES.map(({ key, icon }) => {
        const count = resources[key] || 0;
        const has = count > 0;
        const color = RESOURCE_COLORS[key];

        return (
          <div
            key={key}
            title={`${key}: ${count}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 12px",
              borderRadius: 11,
              background: has ? `${color}1e` : "rgba(255,255,255,0.04)",
              border: has ? `1px solid ${color}38` : "1px solid rgba(255,255,255,0.06)",
              transition: "background 0.15s ease, border-color 0.15s ease",
              minWidth: 56,
              justifyContent: "center",
            }}
          >
            <span style={{ color: has ? color : TXT.disabled, display: "flex", alignItems: "center" }}>
              {icon}
            </span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 900,
                color: has ? TXT.primary : TXT.disabled,
                minWidth: 13,
                textAlign: "center",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {count}
            </span>
          </div>
        );
      })}

      {/* Total divider + count */}
      <div style={{ width: 1, height: 26, background: "rgba(255,255,255,0.14)", margin: "0 4px" }} />
      <div style={{ display: "flex", alignItems: "center", padding: "6px 8px" }} title={`Toplam: ${total}`}>
        <span style={{ fontSize: 15, fontWeight: 800, color: TXT.secondary, fontVariantNumeric: "tabular-nums" }}>
          {total}
        </span>
      </div>
    </div>
  );
}
