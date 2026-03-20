// Generates a randomised Catan board while keeping the correct tile counts.
// Terrain counts and number token distribution follow the standard Catan rules.

import { BEGINNER_BOARD, type Hex, type TerrainType } from "./hexGrid";

// Standard Catan tile distribution (19 land tiles)
const TERRAIN_POOL: TerrainType[] = [
  "forest",    "forest",    "forest",    "forest",   // 4 × Lumber
  "hills",     "hills",     "hills",                 // 3 × Brick
  "pasture",   "pasture",   "pasture",   "pasture",  // 4 × Wool
  "fields",    "fields",    "fields",    "fields",   // 4 × Grain
  "mountains", "mountains", "mountains",             // 3 × Ore
  "desert",                                          // 1 × Desert (no token)
];

// Standard number token distribution (18 tokens for 18 non-desert tiles)
const NUMBER_POOL = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Axial hex neighbours (6 directions)
const HEX_DIRS: [number, number][] = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1],
];

function hexKey(q: number, r: number) { return `${q},${r}`; }

// Check: no two "hot" numbers (6 or 8) on adjacent hexes
function hasAdjacentHotNumbers(board: Hex[]): boolean {
  const hotSet = new Map<string, number>();
  for (const h of board) {
    if (h.number === 6 || h.number === 8) {
      hotSet.set(hexKey(h.q, h.r), h.number);
    }
  }
  for (const h of board) {
    if (!(h.number === 6 || h.number === 8)) continue;
    for (const [dq, dr] of HEX_DIRS) {
      const nk = hexKey(h.q + dq, h.r + dr);
      if (hotSet.has(nk)) return true;
    }
  }
  return false;
}

export function generateRandomBoard(): Hex[] {
  const positions = BEGINNER_BOARD.map(({ q, r }) => ({ q, r }));

  // Retry until no adjacent 6/8 (typically < 5 attempts)
  for (let attempt = 0; attempt < 200; attempt++) {
    const types = shuffle(TERRAIN_POOL);
    const numbers = shuffle(NUMBER_POOL);

    let numIdx = 0;
    const board = positions.map((pos, i) => {
      const type = types[i];
      const number = type === "desert" ? null : numbers[numIdx++];
      return { ...pos, type, number } as Hex;
    });

    if (!hasAdjacentHotNumbers(board)) return board;
  }

  // Fallback: return last attempt (extremely unlikely to reach here)
  const types = shuffle(TERRAIN_POOL);
  const numbers = shuffle(NUMBER_POOL);
  let numIdx = 0;
  return positions.map((pos, i) => {
    const type = types[i];
    const number = type === "desert" ? null : numbers[numIdx++];
    return { ...pos, type, number } as Hex;
  });
}
