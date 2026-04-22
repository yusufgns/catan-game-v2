// Types
export type {
  ActionMode, ResourceType, Resources, DevCardType, DevCards,
  TerrainType, GamePhase, TurnPhase, GameMode,
  Player, Hex, Harbor, Intersection, Edge, BoardGraph,
  TradeOffer, GameState, PublicGameState, PublicPlayer,
} from './types';

export {
  ALL_RESOURCES, EMPTY_RESOURCES, EMPTY_DEV_CARDS,
  RESOURCE_LABEL, RESOURCE_COLOR, TRADE_TTL_MS,
  DISCARD_TIMEOUT_MS, DISCARD_THRESHOLD,
} from './types';

// Hex grid
export {
  hexToPixel, hexCornersArray,
  OCEAN_RING, BEGINNER_BOARD, NUMBER_PIPS,
  HARBORS, HARBOR_RESOURCE_COLOR, TERRAIN_RESOURCE,
  generateRandomBoard,
} from './hexGrid';

// Board graph
export { BOARD_HEX_SIZE, buildBoardGraph } from './boardGraph';

// Game rules
export {
  canPlaceSettlement, canUpgradeCity, canPlaceRoad,
  computeLongestRoad, distributeResources,
} from './gameRules';

// Harbor utilities
export { harborIntersectionIds, playerTradeRates } from './harborUtils';

// Trade rules
export type { TradeError, TradeContext } from './tradeRules';
export {
  validateMaritimeTrade, validateOfferTrade,
  validatePreAcceptTrade, validateFinalizeTrade,
  tradeSignature,
} from './tradeRules';

// Dev cards
export { createDevCardDeck } from './devCards';

// Costs
export {
  ROAD_COST, SETTLEMENT_COST, CITY_COST, DEV_CARD_COST,
  canAfford, deductCost,
} from './costs';

// Victory
export { calculateVP, checkWinner } from './victory';

// Protocol
export type {
  ClientMessage, ServerMessage, DevCardPayload,
  LobbyClientMessage, LobbyServerMessage, LobbyPlayer,
} from './protocol';

// Rank
export type { RankTier, RankInfo, PlacementInfo, PlayerGameResult } from './rank';
export {
  getRankFromElo, getPlacementInfo, calculatePlacementElo, RANK_TIERS,
  computeEloChanges, xpForResult, levelForXp,
} from './rank';

// Bot
export type { BotDifficulty, BotConfig, BotStrategy } from './bot/types';
export { BOT_NAMES, BOT_THINK_DELAY } from './bot/types';
export {
  scoreIntersection, evaluatePosition, rankNeededResources,
  resourceValueMap, shouldBotAcceptTrade,
} from './bot/evaluate';
export { easyBot } from './bot/easyBot';
export { createMediumBot } from './bot/mediumBot';
export { createHardBot } from './bot/hardBot';
