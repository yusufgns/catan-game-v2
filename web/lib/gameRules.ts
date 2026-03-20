// Catan placement rules and longest-road calculation.

import type { BoardGraph } from "./boardGraph";
import type { Player, Resources, ResourceType } from "./gameTypes";
import { TERRAIN_CONFIG } from "./hexGrid";
import type { Hex } from "./hexGrid";

// ─── Settlement ──────────────────────────────────────────────────────────────

/**
 * Distance rule: no settlement/city may exist on any directly adjacent
 * intersection. Additionally, in main-game mode the intersection must be
 * reachable via the player's own road network (unless it's the very first
 * settlement the player has ever placed — simulates the setup phase).
 */
export function canPlaceSettlement(
  intId: string,
  graph: BoardGraph,
  players: Player[],
  playerId: string,
): boolean {
  const inter = graph.intersections.get(intId);
  if (!inter) return false;

  const allBuildings = new Set(players.flatMap((p) => [...p.settlements, ...p.cities]));

  // Intersection already occupied
  if (allBuildings.has(intId)) return false;

  // Distance rule: no adjacent intersection may have a building
  for (const adjId of inter.adjacentIntersections) {
    if (allBuildings.has(adjId)) return false;
  }

  const player = players.find((p) => p.id === playerId)!;
  const totalBuildings = player.settlements.length + player.cities.length;

  // Setup phase: first two settlements are free, but at least one adjacent
  // edge must be unoccupied so the player can place their mandatory road.
  if (totalBuildings < 2) {
    const allRoads = new Set(players.flatMap((p) => p.roads));
    return inter.adjacentEdges.some((eid) => !allRoads.has(eid));
  }

  // Main game: must connect to own road network
  const myRoads = new Set(player.roads);
  return inter.adjacentEdges.some((eid) => myRoads.has(eid));
}

// ─── City ────────────────────────────────────────────────────────────────────

/** Can upgrade to city only on the player's own existing settlement. */
export function canUpgradeCity(
  intId: string,
  players: Player[],
  playerId: string,
): boolean {
  return players.find((p) => p.id === playerId)?.settlements.includes(intId) ?? false;
}

// ─── Road ────────────────────────────────────────────────────────────────────

/**
 * A road may be placed on an edge if:
 *  - The edge has no existing road.
 *  - At least one endpoint is reachable from the player's network:
 *      • The endpoint has the player's own building, OR
 *      • The endpoint has no opponent building AND the player has another
 *        road touching that endpoint.
 *
 * An opponent's settlement/city at an endpoint blocks the path through it
 * (cannot extend your road through an opponent's building).
 */
export function canPlaceRoad(
  edgeId: string,
  graph: BoardGraph,
  players: Player[],
  playerId: string,
): boolean {
  const edge = graph.edges.get(edgeId);
  if (!edge) return false;

  // Edge already has a road
  if (players.some((p) => p.roads.includes(edgeId))) return false;

  const player = players.find((p) => p.id === playerId)!;
  const myRoads = new Set(player.roads);
  const myBuildings = new Set([...player.settlements, ...player.cities]);
  const opponentBuildings = new Set(
    players
      .filter((p) => p.id !== playerId)
      .flatMap((p) => [...p.settlements, ...p.cities]),
  );

  for (const intId of edge.intersections) {
    // Directly connected to own building
    if (myBuildings.has(intId)) return true;

    // Connected via own road (endpoint must not be blocked by opponent)
    if (!opponentBuildings.has(intId)) {
      const inter = graph.intersections.get(intId)!;
      if (inter.adjacentEdges.some((eid) => eid !== edgeId && myRoads.has(eid))) {
        return true;
      }
    }
  }

  return false;
}

// ─── Longest Road ────────────────────────────────────────────────────────────

/**
 * Computes the length of the player's longest continuous road path using DFS
 * with backtracking. Rules:
 *  - The same road segment cannot be used twice in one path.
 *  - An opponent's settlement/city breaks the path (cannot cross through it).
 *  - Your own settlements/cities do NOT break the path.
 *
 * Returns the integer length (number of road segments in the longest path).
 */
export function computeLongestRoad(
  playerId: string,
  graph: BoardGraph,
  players: Player[],
): number {
  const player = players.find((p) => p.id === playerId)!;
  if (player.roads.length === 0) return 0;

  const myRoads = new Set(player.roads);
  const opponentBuildings = new Set(
    players
      .filter((p) => p.id !== playerId)
      .flatMap((p) => [...p.settlements, ...p.cities]),
  );

  // Collect all intersections that are endpoints of at least one of my roads
  const starts = new Set<string>();
  for (const eid of player.roads) {
    const e = graph.edges.get(eid)!;
    starts.add(e.intersections[0]);
    starts.add(e.intersections[1]);
  }

  function dfs(intId: string, usedEdges: Set<string>): number {
    const inter = graph.intersections.get(intId)!;
    let best = 0;

    for (const eid of inter.adjacentEdges) {
      if (!myRoads.has(eid) || usedEdges.has(eid)) continue;

      const e = graph.edges.get(eid)!;
      const nextId =
        e.intersections[0] === intId ? e.intersections[1] : e.intersections[0];

      // Opponent building blocks continuation through this intersection
      if (opponentBuildings.has(nextId)) continue;

      usedEdges.add(eid);
      const len = 1 + dfs(nextId, usedEdges);
      if (len > best) best = len;
      usedEdges.delete(eid);
    }

    return best;
  }

  let maxLen = 0;
  for (const startId of starts) {
    const len = dfs(startId, new Set());
    if (len > maxLen) maxLen = len;
  }
  return maxLen;
}

// ─── Resource Distribution ────────────────────────────────────────────────────

/**
 * Called after a dice roll (non-7).
 * Finds all land hexes whose number matches diceSum, looks up the 6
 * intersections touching each hex via graph.hexIntersections, then awards
 * resources to players who have a settlement (+1) or city (+2) there.
 *
 * Returns a new players array with updated resource counts.
 */
export function distributeResources(
  diceSum: number,
  hexes: Hex[],
  graph: BoardGraph,
  players: Player[],
  robberHex: string,
): Player[] {
  // Build a fast lookup: intersectionId → { player, isCity }
  const buildingAt = new Map<string, { player: Player; isCity: boolean }>();
  for (const p of players) {
    for (const id of p.settlements) buildingAt.set(id, { player: p, isCity: false });
    for (const id of p.cities)      buildingAt.set(id, { player: p, isCity: true  });
  }

  // Accumulate deltas per player id
  const deltas = new Map<string, Partial<Resources>>();

  for (const hex of hexes) {
    if (hex.number !== diceSum) continue;
    if (hex.type === "desert" || hex.type === "ocean") continue;
    if (`${hex.q},${hex.r}` === robberHex) continue; // robber blocks this hex

    const resource = TERRAIN_CONFIG[hex.type].resource.toLowerCase() as ResourceType;
    const intIds = graph.hexIntersections.get(`${hex.q},${hex.r}`) ?? [];

    for (const intId of intIds) {
      const building = buildingAt.get(intId);
      if (!building) continue;
      const amount = building.isCity ? 2 : 1;
      const pid = building.player.id;
      const d = deltas.get(pid) ?? {};
      d[resource] = (d[resource] ?? 0) + amount;
      deltas.set(pid, d);
    }
  }

  if (deltas.size === 0) return players; // nothing to update

  return players.map((p) => {
    const d = deltas.get(p.id);
    if (!d) return p;
    return {
      ...p,
      resources: {
        lumber: p.resources.lumber + (d.lumber ?? 0),
        brick:  p.resources.brick  + (d.brick  ?? 0),
        wool:   p.resources.wool   + (d.wool   ?? 0),
        grain:  p.resources.grain  + (d.grain  ?? 0),
        ore:    p.resources.ore    + (d.ore    ?? 0),
      },
    };
  });
}
