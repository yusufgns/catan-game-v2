import type { DevCardType, Resources, ResourceType, PublicGameState, DevCards } from './types';

// ── Client → Server ───────────────────────────────────────────────────────────

export type ClientMessage =
  | { type: "ROLL_DICE" }
  | { type: "BUILD_ROAD"; edgeId: string }
  | { type: "BUILD_SETTLEMENT"; intersectionId: string }
  | { type: "BUILD_CITY"; intersectionId: string }
  | { type: "BUY_DEV_CARD" }
  | { type: "PLAY_DEV_CARD"; cardType: DevCardType; payload?: DevCardPayload }
  | { type: "OFFER_TRADE"; offer: Partial<Resources>; want: Partial<Resources>; targetPlayer?: string }
  | { type: "ACCEPT_TRADE"; tradeId: string }
  | { type: "REJECT_TRADE"; tradeId: string }
  | { type: "MARITIME_TRADE"; give: { resource: ResourceType; amount: number }; want: ResourceType }
  | { type: "MOVE_ROBBER"; hexId: string; stealFrom: string | null }
  | { type: "DISCARD_RESOURCES"; resources: Partial<Resources> }
  | { type: "END_TURN" };

export type DevCardPayload =
  | { robberHex: string; stealFrom: string | null }          // knight
  | { edges: [string, string] }                               // roadBuilding
  | { resources: [ResourceType, ResourceType] }                // yearOfPlenty
  | { resource: ResourceType };                                // monopoly

// ── Server → Client ───────────────────────────────────────────────────────────

export type ServerMessage =
  | { type: "GAME_STATE"; state: PublicGameState }
  | { type: "PRIVATE_STATE"; resources: Resources; devCards: DevCards }
  | { type: "ERROR"; code: string; message: string }
  | { type: "DICE_ROLLED"; values: [number, number]; total: number; playerId: string }
  | { type: "RESOURCES_PRODUCED"; production: Record<string, Partial<Resources>> }
  | { type: "TRADE_OFFERED"; tradeId: string; from: string; offer: Partial<Resources>; want: Partial<Resources> }
  | { type: "TRADE_RESOLVED"; tradeId: string; accepted: boolean }
  | { type: "ROBBER_MOVED"; hexId: string; stealFrom: string | null; stolenResource?: ResourceType }
  | { type: "BUILDING_PLACED"; playerId: string; buildingType: string; locationId: string }
  | { type: "DEV_CARD_PLAYED"; playerId: string; cardType: DevCardType }
  | { type: "TURN_ENDED"; nextPlayerIndex: number; turnNumber: number }
  | { type: "GAME_OVER"; winnerId: string; finalScores: Record<string, number> }
  | { type: "PLAYER_CONNECTED"; playerId: string }
  | { type: "PLAYER_DISCONNECTED"; playerId: string };

// ── Lobby Messages ────────────────────────────────────────────────────────────

export type LobbyClientMessage =
  | { type: "READY"; ready: boolean }
  | { type: "CHANGE_COLOR"; color: string }
  | { type: "START_GAME" }
  | { type: "CHAT"; message: string };

export type LobbyServerMessage =
  | { type: "LOBBY_STATE"; players: LobbyPlayer[]; hostId: string; settings: Record<string, unknown> }
  | { type: "PLAYER_JOINED"; player: LobbyPlayer }
  | { type: "PLAYER_LEFT"; playerId: string }
  | { type: "PLAYER_READY"; playerId: string; ready: boolean }
  | { type: "GAME_STARTING"; gameId: string }
  | { type: "CHAT"; playerId: string; message: string }
  | { type: "ERROR"; code: string; message: string };

export interface LobbyPlayer {
  id: string;
  name: string;
  color: string;
  ready: boolean;
  isHost: boolean;
}
