import type { GameState } from '../types';
import type { ClientMessage } from '../protocol';
import { canPlaceSettlement, canUpgradeCity, canPlaceRoad } from '../gameRules';
import { canAfford } from '../costs';
import { SETTLEMENT_COST, CITY_COST, ROAD_COST, DEV_CARD_COST } from '../costs';
import { playerTradeRates } from '../harborUtils';
import type { BotStrategy } from './types';

/**
 * Easy bot — picks random valid moves. No strategy.
 */
export const easyBot: BotStrategy = {
  decide(state: GameState, playerId: string): ClientMessage {
    const player = state.players.find(p => p.id === playerId)!;
    const graph = null as any; // Graph must be passed via extended interface in actual usage

    // Setup phase: place settlement then road
    if (state.phase === 'setup1' || state.phase === 'setup2') {
      if (!state.setupConstraint) {
        // Need to place settlement — pick random valid
        return { type: 'BUILD_SETTLEMENT', intersectionId: '__random__' };
      } else {
        // Need to place road adjacent to last settlement
        return { type: 'BUILD_ROAD', edgeId: '__random__' };
      }
    }

    // Main phase
    if (!state.diceRolled) {
      return { type: 'ROLL_DICE' };
    }

    // Random build decision
    const actions: ClientMessage[] = [];

    if (canAfford(player.resources, SETTLEMENT_COST as any)) {
      actions.push({ type: 'BUILD_SETTLEMENT', intersectionId: '__random__' });
    }
    if (canAfford(player.resources, CITY_COST as any) && player.settlements.length > 0) {
      actions.push({ type: 'BUILD_CITY', intersectionId: '__random__' });
    }
    if (canAfford(player.resources, ROAD_COST as any)) {
      actions.push({ type: 'BUILD_ROAD', edgeId: '__random__' });
    }
    if (canAfford(player.resources, DEV_CARD_COST as any) && state.devCardDeck.length > 0) {
      actions.push({ type: 'BUY_DEV_CARD' });
    }

    // 30% chance to end turn even if can build
    if (actions.length === 0 || Math.random() < 0.3) {
      return { type: 'END_TURN' };
    }

    return actions[Math.floor(Math.random() * actions.length)];
  },
};
