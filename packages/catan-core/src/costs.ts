import type { Resources } from './types';

export const ROAD_COST: Partial<Resources> = { lumber: 1, brick: 1 };
export const SETTLEMENT_COST: Partial<Resources> = { lumber: 1, brick: 1, wool: 1, grain: 1 };
export const CITY_COST: Partial<Resources> = { grain: 2, ore: 3 };
export const DEV_CARD_COST: Partial<Resources> = { wool: 1, grain: 1, ore: 1 };

export function canAfford(resources: Resources, cost: Partial<Resources>): boolean {
  for (const [key, amount] of Object.entries(cost)) {
    if ((resources[key as keyof Resources] ?? 0) < (amount ?? 0)) return false;
  }
  return true;
}

export function deductCost(resources: Resources, cost: Partial<Resources>): Resources {
  const result = { ...resources };
  for (const [key, amount] of Object.entries(cost)) {
    result[key as keyof Resources] -= amount ?? 0;
  }
  return result;
}
