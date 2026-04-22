import type { GameState } from '../types';
import type { ClientMessage } from '../protocol';

export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface BotConfig {
  difficulty: BotDifficulty;
  thinkDelayMs: number;
  name: string;
}

export interface BotStrategy {
  decide(state: GameState, playerId: string): ClientMessage;
}

export const BOT_NAMES = [
  'KHAN', 'MARCO', 'VIKING', 'CLEOPATRA', 'CAESAR', 'SAMURAI',
  'PHARAOH', 'SHOGUN', 'SULTAN', 'EMPRESS',
];

export const BOT_THINK_DELAY: Record<BotDifficulty, number> = {
  easy: 500,
  medium: 1500,
  hard: 3000,
};
