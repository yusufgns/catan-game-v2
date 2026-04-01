// ── Core Types ─────────────────────────────────────────────────────────────────

export type ActionMode = "idle" | "settlement" | "city" | "road" | "robber" | "steal";
export type ResourceType = "lumber" | "brick" | "wool" | "grain" | "ore";
export type Resources = Record<ResourceType, number>;

export type DevCardType = "knight" | "victoryPoint" | "roadBuilding" | "yearOfPlenty" | "monopoly";
export type DevCards = Record<DevCardType, number>;

export type TerrainType = "forest" | "hills" | "pasture" | "fields" | "mountains" | "desert" | "ocean";
export type GamePhase = "setup1" | "setup2" | "main" | "ended";
export type TurnPhase = "roll" | "robber_discard" | "robber_move" | "trade" | "build" | "done";
export type GameMode = "classic" | "ranked" | "custom";

export const ALL_RESOURCES: ResourceType[] = ["lumber", "brick", "wool", "grain", "ore"];

export const EMPTY_RESOURCES: Resources = {
  lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0,
};

export const EMPTY_DEV_CARDS: DevCards = {
  knight: 0, victoryPoint: 0, roadBuilding: 0, yearOfPlenty: 0, monopoly: 0,
};

export const RESOURCE_LABEL: Record<ResourceType, string> = {
  lumber: "Lumber", brick: "Brick", wool: "Wool", grain: "Grain", ore: "Ore",
};

export const RESOURCE_COLOR: Record<ResourceType, string> = {
  lumber: "#22c55e", brick: "#f97316", wool: "#a3e635", grain: "#eab308", ore: "#94a3b8",
};

// ── Player ────────────────────────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  color: string;
  settlements: string[];
  cities: string[];
  roads: string[];
  resources: Resources;
  devCards: DevCards;
  knightsPlayed: number;
  hasPlayedDevCardThisTurn: boolean;
}

// ── Hex / Board ───────────────────────────────────────────────────────────────

export interface Hex {
  q: number;
  r: number;
  type: string;
  number: number | null;
}

export interface Harbor {
  q: number;
  r: number;
  edge: number;
  type: "2:1" | "3:1";
  resource?: ResourceType;
}

export interface Intersection {
  id: string;
  x: number;
  y: number;
  adjacentIntersections: string[];
  adjacentEdges: string[];
}

export interface Edge {
  id: string;
  intersections: [string, string];
  mx: number;
  my: number;
}

export interface BoardGraph {
  intersections: Map<string, Intersection>;
  edges: Map<string, Edge>;
  hexIntersections: Map<string, string[]>;
}

// ── Game State ────────────────────────────────────────────────────────────────

export interface TradeOffer {
  id: string;
  fromPlayerId: string;
  toPlayerId?: string; // undefined = open to all
  offer: Partial<Resources>;
  want: Partial<Resources>;
}

export interface GameState {
  id: string;
  mode: GameMode;
  phase: GamePhase;
  currentPlayerIndex: number;
  turnNumber: number;
  players: Player[];
  hexes: Hex[];
  robberHex: string;
  longestRoadHolder: string | null;
  largestArmyHolder: string | null;
  devCardDeck: DevCardType[];
  setupConstraint: string | null;
  diceRolled: boolean;
  diceValues: [number, number] | null;
  stealTargets: string[];
  activeTrade: TradeOffer | null;
  winner: string | null;
}

/** Public game state sent to clients (no hidden info) */
export interface PublicGameState extends Omit<GameState, "devCardDeck" | "players"> {
  devCardDeckSize: number;
  players: PublicPlayer[];
}

export interface PublicPlayer extends Omit<Player, "devCards"> {
  devCardCount: number;
}
