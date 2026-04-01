import type { Hex, Harbor, ResourceType } from './types';

// Axial -> pixel (pointy-top)
export function hexToPixel(q: number, r: number, size: number): { x: number; y: number } {
  return {
    x: size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r),
    y: size * (3 / 2) * r,
  };
}

export function hexCornersArray(cx: number, cy: number, size: number): { x: number; y: number }[] {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return { x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) };
  });
}

// ── Ocean ring ────────────────────────────────────────────────────────────────

export const OCEAN_RING: Hex[] = [
  { q: -1, r: -2, type: "ocean", number: null },
  { q: 0,  r: -3, type: "ocean", number: null },
  { q: 1,  r: -3, type: "ocean", number: null },
  { q: 2,  r: -3, type: "ocean", number: null },
  { q: 3,  r: -3, type: "ocean", number: null },
  { q: 3,  r: -2, type: "ocean", number: null },
  { q: 3,  r: -1, type: "ocean", number: null },
  { q: 3,  r: 0,  type: "ocean", number: null },
  { q: 2,  r: 1,  type: "ocean", number: null },
  { q: 1,  r: 2,  type: "ocean", number: null },
  { q: 0,  r: 3,  type: "ocean", number: null },
  { q: -1, r: 3,  type: "ocean", number: null },
  { q: -2, r: 3,  type: "ocean", number: null },
  { q: -3, r: 3,  type: "ocean", number: null },
  { q: -3, r: 2,  type: "ocean", number: null },
  { q: -3, r: 1,  type: "ocean", number: null },
  { q: -3, r: 0,  type: "ocean", number: null },
  { q: -2, r: -1, type: "ocean", number: null },
];

// ── Board positions ───────────────────────────────────────────────────────────

const BOARD_POSITIONS = [
  { q: 0, r: -2 }, { q: 1, r: -2 }, { q: 2, r: -2 },
  { q: -1, r: -1 }, { q: 0, r: -1 }, { q: 1, r: -1 }, { q: 2, r: -1 },
  { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 },
  { q: -2, r: 1 }, { q: -1, r: 1 }, { q: 0, r: 1 }, { q: 1, r: 1 },
  { q: -2, r: 2 }, { q: -1, r: 2 }, { q: 0, r: 2 },
];

const TERRAIN_POOL: string[] = [
  "forest", "forest", "forest", "forest",
  "hills", "hills", "hills",
  "pasture", "pasture", "pasture", "pasture",
  "fields", "fields", "fields", "fields",
  "mountains", "mountains", "mountains",
  "desert",
];

const NUMBER_POOL: number[] = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateRandomBoard(): Hex[] {
  const terrains = shuffle(TERRAIN_POOL);
  const numbers = shuffle(NUMBER_POOL);
  let numIdx = 0;
  return BOARD_POSITIONS.map((pos, i) => ({
    ...pos,
    type: terrains[i],
    number: terrains[i] === "desert" ? null : numbers[numIdx++],
  }));
}

export const BEGINNER_BOARD: Hex[] = [
  { q: 0, r: -2, type: "mountains", number: 10 },
  { q: 1, r: -2, type: "pasture",   number: 2  },
  { q: 2, r: -2, type: "forest",    number: 9  },
  { q: -1, r: -1, type: "fields",   number: 12 },
  { q: 0,  r: -1, type: "hills",    number: 6  },
  { q: 1,  r: -1, type: "pasture",  number: 4  },
  { q: 2,  r: -1, type: "hills",    number: 10 },
  { q: -2, r: 0, type: "fields",    number: 9  },
  { q: -1, r: 0, type: "forest",    number: 11 },
  { q: 0,  r: 0, type: "desert",    number: null },
  { q: 1,  r: 0, type: "forest",    number: 3  },
  { q: 2,  r: 0, type: "mountains", number: 8  },
  { q: -2, r: 1, type: "forest",    number: 8  },
  { q: -1, r: 1, type: "mountains", number: 3  },
  { q: 0,  r: 1, type: "fields",    number: 4  },
  { q: 1,  r: 1, type: "pasture",   number: 5  },
  { q: -2, r: 2, type: "hills",     number: 5  },
  { q: -1, r: 2, type: "fields",    number: 6  },
  { q: 0,  r: 2, type: "pasture",   number: 11 },
];

export const NUMBER_PIPS: Record<number, number> = {
  2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1,
};

// ── Harbors ───────────────────────────────────────────────────────────────────

export const HARBORS: Harbor[] = [
  { q: -2, r: -1, edge: 0, type: "2:1", resource: "brick" as ResourceType },
  { q:  1, r: -3, edge: 1, type: "2:1", resource: "lumber" as ResourceType },
  { q:  3, r: -3, edge: 2, type: "3:1" },
  { q:  3, r: -1, edge: 3, type: "2:1", resource: "wool" as ResourceType },
  { q:  2, r:  1, edge: 3, type: "3:1" },
  { q:  0, r:  3, edge: 4, type: "3:1" },
  { q: -2, r:  3, edge: 5, type: "2:1", resource: "grain" as ResourceType },
  { q: -3, r:  2, edge: 0, type: "3:1" },
  { q: -3, r:  0, edge: 0, type: "2:1", resource: "ore" as ResourceType },
];

export const HARBOR_RESOURCE_COLOR: Record<string, string> = {
  lumber: "#22c55e", brick: "#f97316", wool: "#a3e635", grain: "#eab308", ore: "#94a3b8",
};

// ── Terrain → Resource mapping ────────────────────────────────────────────────

export const TERRAIN_RESOURCE: Record<string, ResourceType | null> = {
  forest: "lumber", hills: "brick", pasture: "wool",
  fields: "grain", mountains: "ore", desert: null, ocean: null,
};
