export type TerrainType = "forest" | "hills" | "pasture" | "fields" | "mountains" | "desert" | "ocean";

export interface Hex {
  q: number;
  r: number;
  type: TerrainType;
  number: number | null;
}

// Axial → pixel (pointy-top)
export function hexToPixel(q: number, r: number, size: number): { x: number; y: number } {
  return {
    x: size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r),
    y: size * (3 / 2) * r,
  };
}

// 6 corner positions of a pointy-top hex
export function hexCorners(cx: number, cy: number, size: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return `${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`;
  }).join(" ");
}

export function hexCornersArray(cx: number, cy: number, size: number): { x: number; y: number }[] {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return { x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) };
  });
}

// Standard Catan beginner board layout
// Ocean ring — 1 hex border around the 19 land hexes
export const OCEAN_RING: Hex[] = [
  // Top row
  { q: -1, r: -2, type: "ocean", number: null },
  { q: 0,  r: -3, type: "ocean", number: null },
  { q: 1,  r: -3, type: "ocean", number: null },
  { q: 2,  r: -3, type: "ocean", number: null },
  { q: 3,  r: -3, type: "ocean", number: null },
  // Right side
  { q: 3,  r: -2, type: "ocean", number: null },
  { q: 3,  r: -1, type: "ocean", number: null },
  { q: 3,  r: 0,  type: "ocean", number: null },
  // Bottom-right
  { q: 2,  r: 1,  type: "ocean", number: null },
  { q: 1,  r: 2,  type: "ocean", number: null },
  // Bottom row
  { q: 0,  r: 3,  type: "ocean", number: null },
  { q: -1, r: 3,  type: "ocean", number: null },
  { q: -2, r: 3,  type: "ocean", number: null },
  { q: -3, r: 3,  type: "ocean", number: null },
  // Left side
  { q: -3, r: 2,  type: "ocean", number: null },
  { q: -3, r: 1,  type: "ocean", number: null },
  { q: -3, r: 0,  type: "ocean", number: null },
  // Top-left
  { q: -2, r: -1, type: "ocean", number: null },
];

export const BEGINNER_BOARD: Hex[] = [
  // Row 0 (top, 3 hexes)
  { q: 0, r: -2, type: "mountains", number: 10 },
  { q: 1, r: -2, type: "pasture",   number: 2  },
  { q: 2, r: -2, type: "forest",    number: 9  },
  // Row 1 (4 hexes)
  { q: -1, r: -1, type: "fields",   number: 12 },
  { q: 0,  r: -1, type: "hills",    number: 6  },
  { q: 1,  r: -1, type: "pasture",  number: 4  },
  { q: 2,  r: -1, type: "hills",    number: 10 },
  // Row 2 (middle, 5 hexes)
  { q: -2, r: 0, type: "fields",    number: 9  },
  { q: -1, r: 0, type: "forest",    number: 11 },
  { q: 0,  r: 0, type: "desert",    number: null },
  { q: 1,  r: 0, type: "forest",    number: 3  },
  { q: 2,  r: 0, type: "mountains", number: 8  },
  // Row 3 (4 hexes)
  { q: -2, r: 1, type: "forest",    number: 8  },
  { q: -1, r: 1, type: "mountains", number: 3  },
  { q: 0,  r: 1, type: "fields",    number: 4  },
  { q: 1,  r: 1, type: "pasture",   number: 5  },
  // Row 4 (bottom, 3 hexes)
  { q: -2, r: 2, type: "hills",     number: 5  },
  { q: -1, r: 2, type: "fields",    number: 6  },
  { q: 0,  r: 2, type: "pasture",   number: 11 },
];

export const TERRAIN_CONFIG: Record<TerrainType, {
  label: string;
  resource: string;
  glowColor: string;
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
}> = {
  forest: {
    label: "Forest",
    resource: "Lumber",
    glowColor: "#00ff88",
    gradientFrom: "#1a6b35",
    gradientTo: "#2d9e50",
    accentColor: "#22c55e",
  },
  hills: {
    label: "Hills",
    resource: "Brick",
    glowColor: "#ff6b00",
    gradientFrom: "#8b3e12",
    gradientTo: "#c25a1a",
    accentColor: "#f97316",
  },
  pasture: {
    label: "Pasture",
    resource: "Wool",
    glowColor: "#a8ff00",
    gradientFrom: "#4a7a12",
    gradientTo: "#6aaa1a",
    accentColor: "#84cc16",
  },
  fields: {
    label: "Fields",
    resource: "Grain",
    glowColor: "#ffd700",
    gradientFrom: "#7a6000",
    gradientTo: "#b08c00",
    accentColor: "#eab308",
  },
  mountains: {
    label: "Mountains",
    resource: "Ore",
    glowColor: "#00d4ff",
    gradientFrom: "#1a4a6b",
    gradientTo: "#2a6e9e",
    accentColor: "#06b6d4",
  },
  desert: {
    label: "Desert",
    resource: "None",
    glowColor: "#ff4444",
    gradientFrom: "#6b4a1a",
    gradientTo: "#9e6e28",
    accentColor: "#ef4444",
  },
  ocean: {
    label: "Ocean",
    resource: "",
    glowColor: "#0044ff",
    gradientFrom: "#000d1a",
    gradientTo: "#001a33",
    accentColor: "#3b82f6",
  },
};

export const NUMBER_PIPS: Record<number, number> = {
  2: 1, 3: 2, 4: 3, 5: 4, 6: 5,
  8: 5, 9: 4, 10: 3, 11: 2, 12: 1,
};

// ─── Harbors ──────────────────────────────────────────────────────────────────

export type HarborResource = "lumber" | "brick" | "wool" | "grain" | "ore";

export interface Harbor {
  q: number;
  r: number;
  edge: number; // 0-5, which edge of the ocean hex faces the land
  type: "2:1" | "3:1";
  resource?: HarborResource;
}

export const HARBORS: Harbor[] = [
  { q: -2, r: -1, edge: 0, type: "2:1", resource: "brick"  },
  { q:  1, r: -3, edge: 1, type: "2:1", resource: "lumber" },
  { q:  3, r: -3, edge: 2, type: "3:1"                     },
  { q:  3, r: -1, edge: 3, type: "2:1", resource: "wool"   },
  { q:  2, r:  1, edge: 3, type: "3:1"                     },
  { q:  0, r:  3, edge: 4, type: "3:1"                     },
  { q: -2, r:  3, edge: 5, type: "2:1", resource: "grain"  },
  { q: -3, r:  2, edge: 0, type: "3:1"                     },
  { q: -3, r:  0, edge: 0, type: "2:1", resource: "ore"    },
];

export const HARBOR_RESOURCE_COLOR: Record<HarborResource, string> = {
  lumber: "#22c55e",
  brick:  "#f97316",
  wool:   "#a3e635",
  grain:  "#eab308",
  ore:    "#94a3b8",
};

export const HARBOR_RESOURCE_LABEL: Record<HarborResource, string> = {
  lumber: "LU",
  brick:  "BR",
  wool:   "WO",
  grain:  "GR",
  ore:    "OR",
};
