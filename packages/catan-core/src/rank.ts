export type RankTier = 'unranked' | 'wood' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master' | 'grandmaster';

export interface RankInfo {
  tier: RankTier;
  tierLabel: string;
  division: number;       // 1-4 (I=1, II=2, III=3, IV=4)
  divisionLabel: string;  // "I", "II", "III", "IV"
  stars: number;          // 0-5
  maxStars: number;       // 5
  color: string;          // tier color
  elo: number;
}

const TIERS: { tier: RankTier; label: string; min: number; max: number; color: string }[] = [
  { tier: 'wood',         label: 'Wood',         min: 0,    max: 799,  color: '#8B6914' },
  { tier: 'bronze',       label: 'Bronze',       min: 800,  max: 1099, color: '#CD7F32' },
  { tier: 'silver',       label: 'Silver',       min: 1100, max: 1399, color: '#C0C0C0' },
  { tier: 'gold',         label: 'Gold',         min: 1400, max: 1699, color: '#FFD700' },
  { tier: 'platinum',     label: 'Platinum',     min: 1700, max: 1999, color: '#00CED1' },
  { tier: 'diamond',      label: 'Diamond',      min: 2000, max: 2299, color: '#B9F2FF' },
  { tier: 'master',       label: 'Master',       min: 2300, max: 2599, color: '#9B59B6' },
  { tier: 'grandmaster',  label: 'Grandmaster',  min: 2600, max: Infinity, color: '#FF4500' },
];

const DIVISION_LABELS = ['I', 'II', 'III', 'IV'];

export interface PlacementInfo {
  isPlacing: boolean;
  gamesPlayed: number;
  gamesRequired: number;
}

/** Check if user is still in placement matches */
export function getPlacementInfo(placementGames: number): PlacementInfo {
  return {
    isPlacing: placementGames < 10,
    gamesPlayed: Math.min(placementGames, 10),
    gamesRequired: 10,
  };
}

/**
 * Calculate placement ELO after 10 games.
 * Based on win rate during placement:
 * - Best case (10/10 wins): Silver I (1399 ELO)
 * - Worst case (0/10 wins): Bronze IV (800 ELO)
 * - Linear interpolation between
 */
export function calculatePlacementElo(wins: number, totalGames: number = 10): number {
  const MIN_ELO = 800;   // Bronze IV
  const MAX_ELO = 1399;  // Silver I
  const winRate = Math.max(0, Math.min(1, wins / totalGames));
  return Math.round(MIN_ELO + winRate * (MAX_ELO - MIN_ELO));
}

export function getRankFromElo(elo: number, placementGames?: number): RankInfo {
  // If still in placement, show unranked
  if (placementGames !== undefined && placementGames < 10) {
    return {
      tier: 'unranked' as RankTier,
      tierLabel: 'Unranked',
      division: 0,
      divisionLabel: '',
      stars: 0,
      maxStars: 0,
      color: '#717182',
      elo,
    };
  }

  // Clamp elo
  const clampedElo = Math.max(0, elo);

  // Find tier
  const tierData = TIERS.find(t => clampedElo >= t.min && clampedElo <= t.max) || TIERS[0];

  // Grandmaster has no divisions — just show GM
  if (tierData.tier === 'grandmaster') {
    return {
      tier: 'grandmaster', tierLabel: 'Grandmaster',
      division: 1, divisionLabel: 'I',
      stars: 5, maxStars: 5,
      color: tierData.color, elo: clampedElo,
    };
  }

  // Calculate division (IV=4 is lowest, I=1 is highest within tier)
  const tierRange = tierData.max - tierData.min + 1;
  const divisionSize = tierRange / 4;
  const posInTier = clampedElo - tierData.min;
  const divIndex = Math.min(3, Math.floor(posInTier / divisionSize)); // 0-3
  const division = 4 - divIndex; // IV=4(lowest) → I=1(highest)

  // Calculate stars within division
  const posInDiv = posInTier - divIndex * divisionSize;
  const starSize = divisionSize / 5;
  const stars = Math.min(5, Math.floor(posInDiv / starSize));

  return {
    tier: tierData.tier,
    tierLabel: tierData.label,
    division,
    divisionLabel: DIVISION_LABELS[division - 1],
    stars,
    maxStars: 5,
    color: tierData.color,
    elo: clampedElo,
  };
}

export { TIERS as RANK_TIERS };

// ── Post-Game ELO Calculation ────────────────────────────────────────────────

export interface PlayerGameResult {
  playerId: string;
  eloBefore: number;
  vp: number;
  /** 1 = winner, 2 = second, ... */
  position: number;
  /** Total ranked games played before this one (for K-factor). */
  gamesPlayed: number;
}

/** Per-player outcome score in a 4-player game: winner=1, last=0, linear in between. */
function positionScore(position: number, players: number): number {
  if (players <= 1) return 1;
  return Math.max(0, (players - position) / (players - 1));
}

function kFactor(gamesPlayed: number, elo: number): number {
  if (gamesPlayed < 10) return 60;        // placement
  if (gamesPlayed < 30) return 40;        // fresh
  if (elo >= 2000) return 16;             // stable top
  return 24;                              // normal
}

/**
 * Compute ELO changes for all players in a finished ranked game.
 * Uses pairwise 1v1 averaging (per `docs/ranked-system.md`):
 * - For each player, compute ΔR against every other player (expected vs actual)
 * - Final ΔR = mean of pairwise deltas
 * - VP-modifier softens losses proportional to closeness to winner's VP
 * - Dominant win (13+ VP) × 1.2, underdog win (below-avg ELO) × 1.3
 */
export function computeEloChanges(results: PlayerGameResult[]): Record<string, number> {
  const n = results.length;
  const out: Record<string, number> = {};
  if (n < 2) {
    for (const r of results) out[r.playerId] = 0;
    return out;
  }

  const winnerVp = Math.max(...results.map(r => r.vp));
  const avgElo = results.reduce((a, r) => a + r.eloBefore, 0) / n;

  for (const player of results) {
    const k = kFactor(player.gamesPlayed, player.eloBefore);
    let sum = 0;
    let pairs = 0;

    for (const opp of results) {
      if (opp.playerId === player.playerId) continue;
      const expected = 1 / (1 + Math.pow(10, (opp.eloBefore - player.eloBefore) / 400));

      // Pairwise actual score — higher position wins vs lower position
      let actual: number;
      if (player.position < opp.position) actual = 1;
      else if (player.position > opp.position) actual = 0;
      else actual = 0.5;

      let delta = k * (actual - expected);

      // Loss modifier: being close to winner's VP softens the hit
      if (player.position > 1 && delta < 0) {
        const closeness = winnerVp > 0 ? player.vp / winnerVp : 0;
        const modifier = 0.5 + closeness * 0.5;
        delta *= modifier;
      }

      sum += delta;
      pairs++;
    }

    let change = pairs > 0 ? sum / pairs : 0;

    // Bonuses on winners
    if (player.position === 1) {
      if (player.vp >= 13) change *= 1.2;                    // dominant win
      if (player.eloBefore < avgElo - 50) change *= 1.3;     // underdog win
    }

    out[player.playerId] = Math.round(change);
  }
  return out;
}

/** Simple XP/level formula: 100 XP per win, 40 per loss, level-up every 500 XP. */
export function xpForResult(position: number): number {
  return position === 1 ? 100 : 40;
}
export function levelForXp(totalXp: number): number {
  return 1 + Math.floor(totalXp / 500);
}
