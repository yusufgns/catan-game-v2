/**
 * HUD theme — warm dark glass over the bright tropical board.
 * White-glass panels washed out against cyan water; dark panels give the
 * board room to shine while keeping text WCAG-readable at small sizes.
 */

import type { CSSProperties } from "react";

export const PANEL: CSSProperties = {
  background: "rgba(17, 22, 36, 0.82)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  border: "1px solid rgba(255,255,255,0.14)",
  boxShadow: "0 8px 28px rgba(4, 10, 22, 0.38)",
};

export const PANEL_RAISED: CSSProperties = {
  ...PANEL,
  background: "rgba(24, 30, 46, 0.9)",
  border: "1px solid rgba(255,255,255,0.2)",
};

export const TXT = {
  primary: "#f2efe6",
  secondary: "#aab3c5",
  faint: "rgba(255,255,255,0.4)",
  disabled: "rgba(255,255,255,0.28)",
} as const;

export const ACCENT = {
  gold: "#f0b429",
  goldSoft: "rgba(240, 180, 41, 0.16)",
  green: "#4ade80",
  greenSoft: "rgba(74, 222, 128, 0.14)",
  red: "#f87171",
  redSoft: "rgba(248, 113, 113, 0.14)",
} as const;

/** Vivid resource colors tuned for dark backgrounds. */
export const RESOURCE_COLORS: Record<string, string> = {
  lumber: "#4ade80",
  brick: "#fb923c",
  wool: "#bef264",
  grain: "#facc15",
  ore: "#a5b4cb",
};
