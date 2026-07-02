import { describe, expect, it } from 'vitest';
import {
  BEGINNER_BOARD,
  NUMBER_PIPS,
  OCEAN_RING,
  TERRAIN_RESOURCE,
  generateRandomBoard,
  hexCornersArray,
  hexToPixel,
} from '../hexGrid';
import type { Hex } from '../types';

const EXPECTED_TERRAIN_COUNTS: Record<string, number> = {
  forest: 4, hills: 3, pasture: 4, fields: 4, mountains: 3, desert: 1,
};
const EXPECTED_NUMBER_POOL = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

function terrainCounts(hexes: Hex[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const h of hexes) counts[h.type] = (counts[h.type] ?? 0) + 1;
  return counts;
}

function sortedNumbers(hexes: Hex[]): number[] {
  return hexes.filter(h => h.number !== null).map(h => h.number!).sort((a, b) => a - b);
}

describe('hexToPixel (pointy-top axial)', () => {
  it('maps origin to (0,0)', () => {
    expect(hexToPixel(0, 0, 72)).toEqual({ x: 0, y: 0 });
  });

  it('maps +q purely horizontally and +r diagonally', () => {
    const q1 = hexToPixel(1, 0, 72);
    expect(q1.x).toBeCloseTo(72 * Math.sqrt(3));
    expect(q1.y).toBeCloseTo(0);

    const r1 = hexToPixel(0, 1, 72);
    expect(r1.x).toBeCloseTo((72 * Math.sqrt(3)) / 2);
    expect(r1.y).toBeCloseTo(108); // size * 3/2
  });
});

describe('hexCornersArray', () => {
  it('returns 6 corners at distance `size` from the center', () => {
    const corners = hexCornersArray(10, 20, 72);
    expect(corners).toHaveLength(6);
    for (const c of corners) {
      expect(Math.hypot(c.x - 10, c.y - 20)).toBeCloseTo(72);
    }
  });
});

describe('BEGINNER_BOARD', () => {
  it('has 19 hexes with the official terrain distribution', () => {
    expect(BEGINNER_BOARD).toHaveLength(19);
    expect(terrainCounts(BEGINNER_BOARD)).toEqual(EXPECTED_TERRAIN_COUNTS);
  });

  it('uses the official number token pool; desert has no number', () => {
    expect(sortedNumbers(BEGINNER_BOARD)).toEqual(EXPECTED_NUMBER_POOL);
    const desert = BEGINNER_BOARD.find(h => h.type === 'desert')!;
    expect(desert.number).toBeNull();
  });

  it('never places 6 and 8 on adjacent hexes (red-number rule)', () => {
    const AXIAL_NEIGHBORS = [
      [1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1],
    ];
    const reds = BEGINNER_BOARD.filter(h => h.number === 6 || h.number === 8);
    for (const a of reds) {
      for (const b of reds) {
        if (a === b) continue;
        const isNeighbor = AXIAL_NEIGHBORS.some(([dq, dr]) => a.q + dq === b.q && a.r + dr === b.r);
        expect(isNeighbor).toBe(false);
      }
    }
  });
});

describe('generateRandomBoard', () => {
  it('always produces a valid board (positions, terrain pool, number pool)', () => {
    const expectedPositions = new Set(BEGINNER_BOARD.map(h => `${h.q},${h.r}`));
    for (let i = 0; i < 30; i++) {
      const board = generateRandomBoard();
      expect(board).toHaveLength(19);
      expect(new Set(board.map(h => `${h.q},${h.r}`))).toEqual(expectedPositions);
      expect(terrainCounts(board)).toEqual(EXPECTED_TERRAIN_COUNTS);
      expect(sortedNumbers(board)).toEqual(EXPECTED_NUMBER_POOL);
      expect(board.find(h => h.type === 'desert')!.number).toBeNull();
      // 7 never appears on a token
      expect(board.every(h => h.number !== 7)).toBe(true);
    }
  });
});

describe('constants', () => {
  it('NUMBER_PIPS follows dice probability (6/8 hottest, 2/12 coldest)', () => {
    expect(NUMBER_PIPS[6]).toBe(5);
    expect(NUMBER_PIPS[8]).toBe(5);
    expect(NUMBER_PIPS[2]).toBe(1);
    expect(NUMBER_PIPS[12]).toBe(1);
    expect(NUMBER_PIPS[7]).toBeUndefined();
  });

  it('TERRAIN_RESOURCE maps producing terrains and nulls desert/ocean', () => {
    expect(TERRAIN_RESOURCE).toEqual({
      forest: 'lumber', hills: 'brick', pasture: 'wool',
      fields: 'grain', mountains: 'ore', desert: null, ocean: null,
    });
  });

  it('OCEAN_RING has 18 ocean hexes without numbers', () => {
    expect(OCEAN_RING).toHaveLength(18);
    expect(OCEAN_RING.every(h => h.type === 'ocean' && h.number === null)).toBe(true);
  });
});
