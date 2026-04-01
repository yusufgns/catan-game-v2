// Types
export type {
  ActionMode, ResourceType, Resources, DevCardType, DevCards,
  TerrainType, GamePhase, TurnPhase, GameMode,
  Player, Hex, Harbor, Intersection, Edge, BoardGraph,
  TradeOffer, GameState, PublicGameState, PublicPlayer,
} from './types';

export {
  ALL_RESOURCES, EMPTY_RESOURCES, EMPTY_DEV_CARDS,
  RESOURCE_LABEL, RESOURCE_COLOR,
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
