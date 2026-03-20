import { hexToPixel, hexCornersArray, HARBORS } from "@/lib/hexGrid";
import type { Player, ResourceType } from "@/lib/gameTypes";

const ALL: ResourceType[] = ["lumber", "brick", "wool", "grain", "ore"];

function ikey(x: number, y: number) {
  return `${Math.round(x)},${Math.round(y)}`;
}

const HEX_SIZE = 72;

/** Returns the two intersection IDs touched by a harbor's dock edge. */
export function harborIntersectionIds(harborIndex: number): [string, string] {
  const h = HARBORS[harborIndex];
  const { x: cx, y: cy } = hexToPixel(h.q, h.r, HEX_SIZE);
  const corners = hexCornersArray(cx, cy, HEX_SIZE);
  const c1 = corners[h.edge];
  const c2 = corners[(h.edge + 1) % 6];
  return [ikey(c1.x, c1.y), ikey(c2.x, c2.y)];
}

/** Compute best trade rate per resource for a player based on harbor access. */
export function playerTradeRates(player: Player): Record<ResourceType, number> {
  const rates: Record<ResourceType, number> = {
    lumber: 4, brick: 4, wool: 4, grain: 4, ore: 4,
  };

  const playerInts = new Set([...player.settlements, ...player.cities]);

  for (let i = 0; i < HARBORS.length; i++) {
    const harbor = HARBORS[i];
    const [id1, id2] = harborIntersectionIds(i);
    if (!playerInts.has(id1) && !playerInts.has(id2)) continue;

    if (harbor.type === "3:1") {
      for (const r of ALL) {
        if (rates[r] > 3) rates[r] = 3;
      }
    } else if (harbor.resource) {
      const r = harbor.resource as ResourceType;
      if (rates[r] > 2) rates[r] = 2;
    }
  }

  return rates;
}
