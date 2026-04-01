export type ActionMode = "idle" | "settlement" | "city" | "road" | "robber" | "steal";
export type ResourceType = "lumber" | "brick" | "wool" | "grain" | "ore";
export type Resources = Record<ResourceType, number>;

export type DevCardType = "knight" | "victoryPoint" | "roadBuilding" | "yearOfPlenty" | "monopoly";
export type DevCards = Record<DevCardType, number>;

export const EMPTY_DEV_CARDS: DevCards = {
  knight: 0,
  victoryPoint: 0,
  roadBuilding: 0,
  yearOfPlenty: 0,
  monopoly: 0,
};

/** Cost: 1 wool + 1 grain + 1 ore */
export const DEV_CARD_COST: Partial<Resources> = {
  wool: 1,
  grain: 1,
  ore: 1,
};

/** Full dev card deck: 14 Knight, 5 VP, 2 Road Building, 2 Year of Plenty, 2 Monopoly */
export function createDevCardDeck(): DevCardType[] {
  const deck: DevCardType[] = [
    ...Array(14).fill("knight"),
    ...Array(5).fill("victoryPoint"),
    ...Array(2).fill("roadBuilding"),
    ...Array(2).fill("yearOfPlenty"),
    ...Array(2).fill("monopoly"),
  ];
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  settlements: string[];
  cities: string[];
  roads: string[];
  resources: Resources;
  devCards: DevCards;
}

export const EMPTY_RESOURCES: Resources = {
  lumber: 0,
  brick: 0,
  wool: 0,
  grain: 0,
  ore: 0,
};

export const RESOURCE_LABEL: Record<string, string> = {
  lumber: "Lumber",
  brick: "Brick",
  wool: "Wool",
  grain: "Grain",
  ore: "Ore",
};

export const RESOURCE_COLOR: Record<string, string> = {
  lumber: "#22c55e",
  brick: "#f97316",
  wool: "#a3e635",
  grain: "#eab308",
  ore:   "#94a3b8",
};
