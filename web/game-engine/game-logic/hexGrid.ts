// Axial -> pixel (pointy-top)
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
// Ocean ring -- 1 hex border around the 19 land hexes
export const OCEAN_RING = [
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

// ── Board positions (axial coordinates for 19-hex Catan board) ──────────
const BOARD_POSITIONS = [
  // Row 0 (3 hexes)
  { q: 0, r: -2 }, { q: 1, r: -2 }, { q: 2, r: -2 },
  // Row 1 (4 hexes)
  { q: -1, r: -1 }, { q: 0, r: -1 }, { q: 1, r: -1 }, { q: 2, r: -1 },
  // Row 2 (5 hexes)
  { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 },
  // Row 3 (4 hexes)
  { q: -2, r: 1 }, { q: -1, r: 1 }, { q: 0, r: 1 }, { q: 1, r: 1 },
  // Row 4 (3 hexes)
  { q: -2, r: 2 }, { q: -1, r: 2 }, { q: 0, r: 2 },
];

// Terrain tiles: 4 forest, 3 hills, 4 pasture, 4 fields, 3 mountains, 1 desert
const TERRAIN_POOL: string[] = [
  "forest", "forest", "forest", "forest",
  "hills", "hills", "hills",
  "pasture", "pasture", "pasture", "pasture",
  "fields", "fields", "fields", "fields",
  "mountains", "mountains", "mountains",
  "desert",
];

// Number tokens (placed on all hexes except desert)
const NUMBER_POOL: number[] = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Generate a random Catan board (ranked/normal mode) */
export function generateRandomBoard(): { q: number; r: number; type: string; number: number | null }[] {
  const terrains = shuffle(TERRAIN_POOL);
  const numbers = shuffle(NUMBER_POOL);
  let numIdx = 0;

  return BOARD_POSITIONS.map((pos, i) => ({
    ...pos,
    type: terrains[i],
    number: terrains[i] === "desert" ? null : numbers[numIdx++],
  }));
}

/** Beginner board — fixed layout from Catan rulebook */
export const BEGINNER_BOARD = [
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

export const TERRAIN_CONFIG: Record<string, any> = {
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

// --- Harbors ---

export const HARBORS = [
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

export const HARBOR_RESOURCE_COLOR = {
  lumber: "#22c55e",
  brick:  "#f97316",
  wool:   "#a3e635",
  grain:  "#eab308",
  ore:    "#94a3b8",
};

export const HARBOR_RESOURCE_LABEL = {
  lumber: "LU",
  brick:  "BR",
  wool:   "WO",
  grain:  "GR",
  ore:    "OR",
};
