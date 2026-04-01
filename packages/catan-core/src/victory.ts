import type { Player, GameState } from './types';

export function calculateVP(player: Player, state: GameState): number {
  return (
    player.settlements.length +
    player.cities.length * 2 +
    (player.devCards?.victoryPoint ?? 0) +
    (state.longestRoadHolder === player.id ? 2 : 0) +
    (state.largestArmyHolder === player.id ? 2 : 0)
  );
}

export function checkWinner(state: GameState): string | null {
  for (const player of state.players) {
    if (calculateVP(player, state) >= 10) return player.id;
  }
  return null;
}
