import { describe, expect, it } from 'vitest';
import {
  calculatePlacementElo,
  computeEloChanges,
  getPlacementInfo,
  getRankFromElo,
  levelForXp,
  xpForResult,
  type PlayerGameResult,
} from '../rank';

describe('getPlacementInfo', () => {
  it('is placing until 10 games', () => {
    expect(getPlacementInfo(0)).toEqual({ isPlacing: true, gamesPlayed: 0, gamesRequired: 10 });
    expect(getPlacementInfo(9).isPlacing).toBe(true);
    expect(getPlacementInfo(10).isPlacing).toBe(false);
    expect(getPlacementInfo(25).gamesPlayed).toBe(10); // clamped
  });
});

describe('calculatePlacementElo', () => {
  it('maps win-rate linearly from Bronze IV (800) to Silver I (1399)', () => {
    expect(calculatePlacementElo(0)).toBe(800);
    expect(calculatePlacementElo(10)).toBe(1399);
    expect(calculatePlacementElo(5)).toBe(1100); // 800 + 0.5 * 599 = 1099.5 → round
  });

  it('clamps out-of-range win counts', () => {
    expect(calculatePlacementElo(-3)).toBe(800);
    expect(calculatePlacementElo(15)).toBe(1399);
  });
});

describe('getRankFromElo', () => {
  it('shows Unranked during placement regardless of elo', () => {
    const info = getRankFromElo(1500, 4);
    expect(info.tier).toBe('unranked');
    expect(info.elo).toBe(1500);
  });

  it('ranks normally once placement is done or unspecified', () => {
    expect(getRankFromElo(1500, 10).tier).toBe('gold');
    expect(getRankFromElo(1500).tier).toBe('gold');
  });

  it('assigns tiers by elo band', () => {
    expect(getRankFromElo(0).tier).toBe('wood');
    expect(getRankFromElo(799).tier).toBe('wood');
    expect(getRankFromElo(800).tier).toBe('bronze');
    expect(getRankFromElo(1099).tier).toBe('bronze');
    expect(getRankFromElo(1100).tier).toBe('silver');
    expect(getRankFromElo(1400).tier).toBe('gold');
    expect(getRankFromElo(1700).tier).toBe('platinum');
    expect(getRankFromElo(2000).tier).toBe('diamond');
    expect(getRankFromElo(2300).tier).toBe('master');
    expect(getRankFromElo(2600).tier).toBe('grandmaster');
  });

  it('divisions run IV (bottom) → I (top) within a tier', () => {
    // bronze: 800-1099, division size 75
    expect(getRankFromElo(800).divisionLabel).toBe('IV');
    expect(getRankFromElo(880).divisionLabel).toBe('III');
    expect(getRankFromElo(955).divisionLabel).toBe('II');
    expect(getRankFromElo(1030).divisionLabel).toBe('I');
    expect(getRankFromElo(1099).divisionLabel).toBe('I');
  });

  it('stars increase within a division (0..4 before rolling over)', () => {
    // bronze IV: 800-874, star size 15
    expect(getRankFromElo(800).stars).toBe(0);
    expect(getRankFromElo(815).stars).toBe(1);
    expect(getRankFromElo(874).stars).toBe(4);
  });

  it('grandmaster is a single maxed division and survives very high elo', () => {
    const gm = getRankFromElo(2700);
    expect(gm.divisionLabel).toBe('I');
    expect(gm.stars).toBe(5);
    // extreme elo must still be grandmaster, not wrap around to wood
    expect(getRankFromElo(12000).tier).toBe('grandmaster');
  });

  it('clamps negative elo to wood', () => {
    expect(getRankFromElo(-50).tier).toBe('wood');
    expect(getRankFromElo(-50).elo).toBe(0);
  });
});

describe('computeEloChanges', () => {
  function result(playerId: string, overrides: Partial<PlayerGameResult> = {}): PlayerGameResult {
    return { playerId, eloBefore: 1000, vp: 5, position: 2, gamesPlayed: 30, ...overrides };
  }

  it('returns 0 for degenerate games (fewer than 2 players)', () => {
    expect(computeEloChanges([result('p1', { position: 1 })])).toEqual({ p1: 0 });
    expect(computeEloChanges([])).toEqual({});
  });

  it('equal-elo 1v1: winner gains, loser loses less when VP is close (loss softening)', () => {
    const changes = computeEloChanges([
      result('w', { position: 1, vp: 10 }),
      result('l', { position: 2, vp: 5 }),
    ]);
    // k=24, expected 0.5 → winner +12; loser -12 × (0.5 + (5/10)×0.5) = -9
    expect(changes.w).toBe(12);
    expect(changes.l).toBe(-9);
  });

  it('placement players swing harder (K=60)', () => {
    const changes = computeEloChanges([
      result('w', { position: 1, vp: 10, gamesPlayed: 0 }),
      result('l', { position: 2, vp: 8, gamesPlayed: 0 }),
    ]);
    // K=60 → winner +30; loser -30 × (0.5 + 0.8×0.5) = -27
    expect(changes.w).toBe(30);
    expect(changes.l).toBe(-27);
  });

  it('dominant win (13+ VP) gets a 1.2× bonus', () => {
    const changes = computeEloChanges([
      result('w', { position: 1, vp: 13 }),
      result('l', { position: 2, vp: 5 }),
    ]);
    expect(changes.w).toBe(14); // 12 × 1.2 = 14.4 → 14
  });

  it('underdog win (below-average elo) gets a 1.3× bonus', () => {
    const changes = computeEloChanges([
      result('w', { position: 1, vp: 10, eloBefore: 1000 }),
      result('l', { position: 2, vp: 5, eloBefore: 1200 }),
    ]);
    // expected = 1/(1+10^0.5) ≈ 0.2403; 24 × 0.7597 × 1.3 ≈ 23.7 → 24
    expect(changes.w).toBe(24);
  });

  it('4-player game: better positions earn more; winner positive, last negative', () => {
    const changes = computeEloChanges([
      result('a', { position: 1, vp: 10 }),
      result('b', { position: 2, vp: 8 }),
      result('c', { position: 3, vp: 6 }),
      result('d', { position: 4, vp: 3 }),
    ]);
    expect(changes.a).toBeGreaterThan(0);
    expect(changes.d).toBeLessThan(0);
    expect(changes.a).toBeGreaterThan(changes.b);
    expect(changes.b).toBeGreaterThan(changes.c);
    expect(changes.c).toBeGreaterThan(changes.d);
  });

  it('higher-rated players gain less from expected wins', () => {
    const strongWin = computeEloChanges([
      result('w', { position: 1, vp: 10, eloBefore: 1400 }),
      result('l', { position: 2, vp: 5, eloBefore: 1000 }),
    ]);
    const evenWin = computeEloChanges([
      result('w', { position: 1, vp: 10 }),
      result('l', { position: 2, vp: 5 }),
    ]);
    expect(strongWin.w).toBeLessThan(evenWin.w);
  });
});

describe('xp & levels', () => {
  it('100 XP for a win, 40 otherwise', () => {
    expect(xpForResult(1)).toBe(100);
    expect(xpForResult(2)).toBe(40);
    expect(xpForResult(4)).toBe(40);
  });

  it('levels up every 500 XP starting from level 1', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(499)).toBe(1);
    expect(levelForXp(500)).toBe(2);
    expect(levelForXp(2600)).toBe(6);
  });
});
