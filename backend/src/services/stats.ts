import { eq, sql } from 'drizzle-orm';
import { gamePlayers, userStats, users } from '../db/schema';
import type { Database } from '../db/client';

interface GameResult {
  gameId: string;
  winnerId: string;
  players: {
    userId: string;
    vp: number;
    settlements: number;
    cities: number;
    roads: number;
    longestRoad: boolean;
    largestArmy: boolean;
    devCardsPlayed: number;
  }[];
}

/** Record post-game stats and adjust ELO */
export async function recordGameResult(db: Database, result: GameResult) {
  for (const p of result.players) {
    // Update game_players with final stats
    await db.update(gamePlayers).set({
      vpFinal: p.vp,
      settlements: p.settlements,
      cities: p.cities,
      roads: p.roads,
      longestRoad: p.longestRoad,
      largestArmy: p.largestArmy,
      devCardsPlayed: p.devCardsPlayed,
    }).where(
      sql`${gamePlayers.gameId} = ${result.gameId} AND ${gamePlayers.userId} = ${p.userId}`
    );

    // Update user_stats
    const isWinner = p.userId === result.winnerId;
    await db.update(userStats).set({
      gamesPlayed: sql`${userStats.gamesPlayed} + 1`,
      gamesWon: isWinner ? sql`${userStats.gamesWon} + 1` : userStats.gamesWon,
      totalVp: sql`${userStats.totalVp} + ${p.vp}`,
      longestRoads: p.longestRoad ? sql`${userStats.longestRoads} + 1` : userStats.longestRoads,
      largestArmies: p.largestArmy ? sql`${userStats.largestArmies} + 1` : userStats.largestArmies,
      updatedAt: new Date(),
    }).where(eq(userStats.userId, p.userId));

    // ELO adjustment
    const eloChange = isWinner ? 25 : -15;
    await db.update(users).set({
      eloRating: sql`${users.eloRating} + ${eloChange}`,
      updatedAt: new Date(),
    }).where(eq(users.id, p.userId));
  }
}
