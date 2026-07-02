import { describe, expect, it } from 'vitest';
import { calculateVP, checkWinner } from '../victory';
import { makePlayer, makeState } from './helpers';

describe('calculateVP', () => {
  it('scores settlements 1, cities 2', () => {
    const p = makePlayer('p1', { settlements: ['a', 'b'], cities: ['c'] });
    expect(calculateVP(p, makeState([p]))).toBe(4);
  });

  it('adds hidden victory point cards', () => {
    const p = makePlayer('p1', {
      settlements: ['a'],
      devCards: { knight: 3, victoryPoint: 2, roadBuilding: 0, yearOfPlenty: 0, monopoly: 0 },
    });
    expect(calculateVP(p, makeState([p]))).toBe(3);
  });

  it('adds +2 for longest road and +2 for largest army — only for the holder', () => {
    const p1 = makePlayer('p1', { settlements: ['a'] });
    const p2 = makePlayer('p2', { settlements: ['b'] });
    const state = makeState([p1, p2], { longestRoadHolder: 'p1', largestArmyHolder: 'p1' });
    expect(calculateVP(p1, state)).toBe(5);
    expect(calculateVP(p2, state)).toBe(1);
  });

  it('knights alone give no VP', () => {
    const p = makePlayer('p1', { knightsPlayed: 5 });
    expect(calculateVP(p, makeState([p]))).toBe(0);
  });
});

describe('checkWinner', () => {
  it('returns null below 10 VP', () => {
    const p = makePlayer('p1', { settlements: ['a', 'b', 'c'], cities: ['d', 'e', 'f'] }); // 3+6=9
    expect(checkWinner(makeState([p]))).toBeNull();
  });

  it('returns the player id at exactly 10 VP', () => {
    const p = makePlayer('p1', { settlements: ['a', 'b'], cities: ['c', 'd', 'e', 'f'] }); // 2+8=10
    expect(checkWinner(makeState([p]))).toBe('p1');
  });

  it('special cards can complete the win', () => {
    // 2 settlements + 2 cities = 6, +2 LR +2 LA = 10
    const p = makePlayer('p1', { settlements: ['a', 'b'], cities: ['c', 'd'] });
    const state = makeState([p], { longestRoadHolder: 'p1', largestArmyHolder: 'p1' });
    expect(checkWinner(state)).toBe('p1');
  });
});
