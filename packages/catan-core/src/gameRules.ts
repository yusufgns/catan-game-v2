import { TERRAIN_RESOURCE } from './hexGrid';
import type { BoardGraph, Hex, Player, Resources, ResourceType } from './types';

// ── Settlement ────────────────────────────────────────────────────────────────

export function canPlaceSettlement(intId: string, graph: BoardGraph, players: Player[], playerId: string): boolean {
  const inter = graph.intersections.get(intId);
  if (!inter) return false;

  const allBuildings = new Set(players.flatMap(p => [...p.settlements, ...p.cities]));
  if (allBuildings.has(intId)) return false;

  // Distance rule
  for (const adjId of inter.adjacentIntersections) {
    if (allBuildings.has(adjId)) return false;
  }

  const player = players.find(p => p.id === playerId);
  if (!player) return false;
  const totalBuildings = player.settlements.length + player.cities.length;

  // Setup: first two are free, but need an available edge for mandatory road
  if (totalBuildings < 2) {
    const allRoads = new Set(players.flatMap(p => p.roads));
    return inter.adjacentEdges.some(eid => !allRoads.has(eid));
  }

  // Main game: must connect to own road network
  const myRoads = new Set(player.roads);
  return inter.adjacentEdges.some(eid => myRoads.has(eid));
}

// ── City ──────────────────────────────────────────────────────────────────────

export function canUpgradeCity(intId: string, players: Player[], playerId: string): boolean {
  const player = players.find(p => p.id === playerId);
  return player ? player.settlements.includes(intId) : false;
}

// ── Road ──────────────────────────────────────────────────────────────────────

export function canPlaceRoad(edgeId: string, graph: BoardGraph, players: Player[], playerId: string): boolean {
  const edge = graph.edges.get(edgeId);
  if (!edge) return false;

  if (players.some(p => p.roads.includes(edgeId))) return false;

  const player = players.find(p => p.id === playerId);
  if (!player) return false;
  const myRoads = new Set(player.roads);
  const myBuildings = new Set([...player.settlements, ...player.cities]);
  const opponentBuildings = new Set(
    players.filter(p => p.id !== playerId).flatMap(p => [...p.settlements, ...p.cities]),
  );

  for (const intId of edge.intersections) {
    if (myBuildings.has(intId)) return true;
    if (!opponentBuildings.has(intId)) {
      const inter = graph.intersections.get(intId);
      if (inter && inter.adjacentEdges.some(eid => eid !== edgeId && myRoads.has(eid))) {
        return true;
      }
    }
  }
  return false;
}

// ── Longest Road ──────────────────────────────────────────────────────────────

export function computeLongestRoad(playerId: string, graph: BoardGraph, players: Player[]): number {
  const player = players.find(p => p.id === playerId);
  if (!player || player.roads.length === 0) return 0;

  const myRoads = new Set(player.roads);
  const opponentBuildings = new Set(
    players.filter(p => p.id !== playerId).flatMap(p => [...p.settlements, ...p.cities]),
  );

  const starts = new Set<string>();
  for (const eid of player.roads) {
    const e = graph.edges.get(eid);
    if (e) { starts.add(e.intersections[0]); starts.add(e.intersections[1]); }
  }

  function dfs(intId: string, usedEdges: Set<string>): number {
    const inter = graph.intersections.get(intId);
    if (!inter) return 0;
    let best = 0;
    for (const eid of inter.adjacentEdges) {
      if (!myRoads.has(eid) || usedEdges.has(eid)) continue;
      const e = graph.edges.get(eid);
      if (!e) continue;
      const nextId = e.intersections[0] === intId ? e.intersections[1] : e.intersections[0];
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

// ── Resource Distribution ─────────────────────────────────────────────────────

export function distributeResources(
  diceSum: number, hexes: Hex[], graph: BoardGraph, players: Player[], robberHex: string,
): Player[] {
  const buildingAt = new Map<string, { player: Player; isCity: boolean }>();
  for (const p of players) {
    for (const id of p.settlements) buildingAt.set(id, { player: p, isCity: false });
    for (const id of p.cities)      buildingAt.set(id, { player: p, isCity: true });
  }

  const deltas = new Map<string, Partial<Resources>>();

  for (const hex of hexes) {
    if (hex.number !== diceSum) continue;
    if (hex.type === "desert" || hex.type === "ocean") continue;
    if (`${hex.q},${hex.r}` === robberHex) continue;

    const resource = TERRAIN_RESOURCE[hex.type];
    if (!resource) continue;
    const intIds = graph.hexIntersections.get(`${hex.q},${hex.r}`) ?? [];

    for (const intId of intIds) {
      const building = buildingAt.get(intId);
      if (!building) continue;
      const amount = building.isCity ? 2 : 1;
      const pid = building.player.id;
      const d = deltas.get(pid) ?? {};
      d[resource as ResourceType] = ((d[resource as ResourceType] ?? 0) + amount);
      deltas.set(pid, d);
    }
  }

  if (deltas.size === 0) return players;

  return players.map(p => {
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
