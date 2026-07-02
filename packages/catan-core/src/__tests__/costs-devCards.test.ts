import { describe, expect, it } from 'vitest';
import {
  CITY_COST,
  DEV_CARD_COST,
  ROAD_COST,
  SETTLEMENT_COST,
  canAfford,
  deductCost,
} from '../costs';
import { createDevCardDeck } from '../devCards';
import { res } from './helpers';

describe('build costs (official Catan)', () => {
  it('match the rulebook', () => {
    expect(ROAD_COST).toEqual({ lumber: 1, brick: 1 });
    expect(SETTLEMENT_COST).toEqual({ lumber: 1, brick: 1, wool: 1, grain: 1 });
    expect(CITY_COST).toEqual({ grain: 2, ore: 3 });
    expect(DEV_CARD_COST).toEqual({ wool: 1, grain: 1, ore: 1 });
  });
});

describe('canAfford', () => {
  it('accepts exact resources and rejects one-short', () => {
    expect(canAfford(res({ grain: 2, ore: 3 }), CITY_COST)).toBe(true);
    expect(canAfford(res({ grain: 2, ore: 2 }), CITY_COST)).toBe(false);
    expect(canAfford(res({ grain: 1, ore: 3 }), CITY_COST)).toBe(false);
  });

  it('empty cost is always affordable', () => {
    expect(canAfford(res({}), {})).toBe(true);
  });
});

describe('deductCost', () => {
  it('subtracts the cost and leaves the rest', () => {
    const after = deductCost(res({ lumber: 2, brick: 1, ore: 1 }), ROAD_COST);
    expect(after).toEqual(res({ lumber: 1, brick: 0, ore: 1 }));
  });

  it('does not mutate the input', () => {
    const before = res({ lumber: 2, brick: 1 });
    deductCost(before, ROAD_COST);
    expect(before).toEqual(res({ lumber: 2, brick: 1 }));
  });
});

describe('createDevCardDeck', () => {
  it('has the official 25-card composition', () => {
    const deck = createDevCardDeck();
    expect(deck).toHaveLength(25);
    const count = (t: string) => deck.filter(c => c === t).length;
    expect(count('knight')).toBe(14);
    expect(count('victoryPoint')).toBe(5);
    expect(count('roadBuilding')).toBe(2);
    expect(count('yearOfPlenty')).toBe(2);
    expect(count('monopoly')).toBe(2);
  });

  it('is shuffled (two decks rarely identical)', () => {
    // 25! orderings — 5 consecutive identical draws would indicate a broken shuffle
    const same = Array.from({ length: 5 }, () =>
      createDevCardDeck().join(','),
    );
    expect(new Set(same).size).toBeGreaterThan(1);
  });
});
