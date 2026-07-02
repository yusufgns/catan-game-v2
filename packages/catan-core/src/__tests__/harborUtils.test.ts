import { describe, expect, it } from 'vitest';
import { buildBoardGraph } from '../boardGraph';
import { harborIntersectionIds, playerTradeRates } from '../harborUtils';
import { BEGINNER_BOARD, HARBORS } from '../hexGrid';
import { makePlayer } from './helpers';

describe('harborIntersectionIds', () => {
  it('returns two distinct intersections per harbor', () => {
    for (let i = 0; i < HARBORS.length; i++) {
      const [a, b] = harborIntersectionIds(i);
      expect(a).not.toBe(b);
    }
  });

  it('every harbor dock lands on real land-board intersections', () => {
    // Harbors sit on ocean hexes but their dock corners must coincide with
    // coastal intersections of the 19-hex land board — otherwise no player
    // could ever own a harbor.
    const graph = buildBoardGraph(BEGINNER_BOARD);
    for (let i = 0; i < HARBORS.length; i++) {
      const [a, b] = harborIntersectionIds(i);
      expect(graph.intersections.has(a)).toBe(true);
      expect(graph.intersections.has(b)).toBe(true);
    }
  });
});

describe('playerTradeRates', () => {
  it('defaults to 4:1 for everything without harbors', () => {
    const rates = playerTradeRates(makePlayer('p1'));
    expect(rates).toEqual({ lumber: 4, brick: 4, wool: 4, grain: 4, ore: 4 });
  });

  it('a 3:1 harbor lowers all rates to 3', () => {
    const threeToOneIdx = HARBORS.findIndex(h => h.type === '3:1');
    const [intId] = harborIntersectionIds(threeToOneIdx);
    const rates = playerTradeRates(makePlayer('p1', { settlements: [intId] }));
    expect(rates).toEqual({ lumber: 3, brick: 3, wool: 3, grain: 3, ore: 3 });
  });

  it('a 2:1 harbor lowers only its own resource', () => {
    const brickIdx = HARBORS.findIndex(h => h.type === '2:1' && h.resource === 'brick');
    const [intId] = harborIntersectionIds(brickIdx);
    const rates = playerTradeRates(makePlayer('p1', { settlements: [intId] }));
    expect(rates).toEqual({ lumber: 4, brick: 2, wool: 4, grain: 4, ore: 4 });
  });

  it('harbors combine: 3:1 + 2:1 brick → brick 2, rest 3', () => {
    const threeToOneIdx = HARBORS.findIndex(h => h.type === '3:1');
    const brickIdx = HARBORS.findIndex(h => h.type === '2:1' && h.resource === 'brick');
    const [a] = harborIntersectionIds(threeToOneIdx);
    const [b] = harborIntersectionIds(brickIdx);
    const rates = playerTradeRates(makePlayer('p1', { settlements: [a], cities: [b] }));
    expect(rates).toEqual({ lumber: 3, brick: 2, wool: 3, grain: 3, ore: 3 });
  });

  it('cities grant harbor access too', () => {
    const oreIdx = HARBORS.findIndex(h => h.type === '2:1' && h.resource === 'ore');
    const [intId] = harborIntersectionIds(oreIdx);
    const rates = playerTradeRates(makePlayer('p1', { cities: [intId] }));
    expect(rates.ore).toBe(2);
  });
});
