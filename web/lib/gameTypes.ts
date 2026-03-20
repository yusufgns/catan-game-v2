export type ActionMode = "idle" | "settlement" | "city" | "road" | "robber" | "steal";

export type ResourceType = "lumber" | "brick" | "wool" | "grain" | "ore";

export type Resources = Record<ResourceType, number>;

export const EMPTY_RESOURCES: Resources = {
  lumber: 0,
  brick: 0,
  wool: 0,
  grain: 0,
  ore: 0,
};

export const RESOURCE_LABEL: Record<ResourceType, string> = {
  lumber: "Lumber",
  brick: "Brick",
  wool: "Wool",
  grain: "Grain",
  ore: "Ore",
};

export const RESOURCE_COLOR: Record<ResourceType, string> = {
  lumber: "#22c55e",
  brick: "#f97316",
  wool: "#a3e635",
  grain: "#eab308",
  ore:   "#94a3b8",
};

export interface Player {
  id: string;
  name: string;
  color: string;
  settlements: string[]; // intersection ids
  cities: string[];      // intersection ids
  roads: string[];       // edge ids
  resources: Resources;
}
