import { describe, expect, it } from 'vitest';
import { buildBoardGraph } from '../boardGraph';
import {
  canPlaceRoad,
  canPlaceSettlement,
  canUpgradeCity,
  computeLongestRoad,
  distributeResources,
} from '../gameRules';
import { BEGINNER_BOARD } from '../hexGrid';
import { chainEdges, edgeIdBetween, findPath, makePlayer, res } from './helpers';

const graph = buildBoardGraph(BEGINNER_BOARD);

/** Any interior intersection (3 edges) — corner of the center desert hex. */
const centerCorner = graph.hexIntersections.get('0,0')![0];
const centerInter = graph.intersections.get(centerCorner)!;

describe('canPlaceSettlement', () => {
  it('allows any free intersection during setup (first two buildings)', () => {
    const p1 = makePlayer('p1');
    expect(canPlaceSettlement(centerCorner, graph, [p1], 'p1')).toBe(true);
  });

  it('rejects unknown intersections and unknown players', () => {
    const p1 = makePlayer('p1');
    expect(canPlaceSettlement('nope', graph, [p1], 'p1')).toBe(false);
    expect(canPlaceSettlement(centerCorner, graph, [p1], 'ghost')).toBe(false);
  });

  it('rejects an occupied intersection', () => {
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2', { settlements: [centerCorner] });
    expect(canPlaceSettlement(centerCorner, graph, [p1, p2], 'p1')).toBe(false);
  });

  it('enforces the distance rule (no building adjacent to any building)', () => {
    const neighbor = centerInter.adjacentIntersections[0];
    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2', { settlements: [neighbor] });
    expect(canPlaceSettlement(centerCorner, graph, [p1, p2], 'p1')).toBe(false);
    // cities also block
    const p3 = makePlayer('p3', { cities: [neighbor], settlements: [] });
    expect(canPlaceSettlement(centerCorner, graph, [p1, p3], 'p1')).toBe(false);
  });

  it('in main game requires connection to own road network', () => {
    // Two buildings on far-apart hexes so the setup branch no longer applies
    // and the distance rule cannot interfere with the center target.
    const farA = graph.hexIntersections.get('2,-2')![0];
    const farB = graph.hexIntersections.get('-2,2')![0];
    const settlements = [farA, farB];

    // No road at target → not allowed
    const p1 = makePlayer('p1', { settlements });
    expect(canPlaceSettlement(centerCorner, graph, [p1], 'p1')).toBe(false);

    // Own road touching the target → allowed
    const roadEdge = centerInter.adjacentEdges[0];
    const p1Road = makePlayer('p1', { settlements, roads: [roadEdge] });
    expect(canPlaceSettlement(centerCorner, graph, [p1Road], 'p1')).toBe(true);

    // A road elsewhere does not help
    const farEdge = graph.intersections.get(farA)!.adjacentEdges[0];
    const p1Far = makePlayer('p1', { settlements, roads: [farEdge] });
    expect(canPlaceSettlement(centerCorner, graph, [p1Far], 'p1')).toBe(false);
  });
});

describe('canUpgradeCity', () => {
  it('only allows upgrading own settlements', () => {
    const p1 = makePlayer('p1', { settlements: [centerCorner] });
    const p2 = makePlayer('p2');
    expect(canUpgradeCity(centerCorner, [p1, p2], 'p1')).toBe(true);
    expect(canUpgradeCity(centerCorner, [p1, p2], 'p2')).toBe(false);
    expect(canUpgradeCity('nope', [p1, p2], 'p1')).toBe(false);
  });

  it('cannot upgrade an existing city again', () => {
    const p1 = makePlayer('p1', { cities: [centerCorner] });
    expect(canUpgradeCity(centerCorner, [p1], 'p1')).toBe(false);
  });
});

describe('canPlaceRoad', () => {
  const edge0 = centerInter.adjacentEdges[0];

  it('allows an edge touching own settlement', () => {
    const p1 = makePlayer('p1', { settlements: [centerCorner] });
    expect(canPlaceRoad(edge0, graph, [p1], 'p1')).toBe(true);
  });

  it('rejects unknown edges and occupied edges', () => {
    const p1 = makePlayer('p1', { settlements: [centerCorner] });
    expect(canPlaceRoad('nope', graph, [p1], 'p1')).toBe(false);
    const p2 = makePlayer('p2', { roads: [edge0] });
    expect(canPlaceRoad(edge0, graph, [p1, p2], 'p1')).toBe(false);
  });

  it('rejects an isolated edge (no own building or road nearby)', () => {
    const p1 = makePlayer('p1');
    expect(canPlaceRoad(edge0, graph, [p1], 'p1')).toBe(false);
  });

  it('allows extending own road through a free intersection', () => {
    const [a, b, c] = findPath(graph, 2);
    const p1 = makePlayer('p1', { roads: [edgeIdBetween(a, b)] });
    expect(canPlaceRoad(edgeIdBetween(b, c), graph, [p1], 'p1')).toBe(true);
  });

  it('blocks extending through an opponent settlement', () => {
    const [a, b, c] = findPath(graph, 2);
    const p1 = makePlayer('p1', { roads: [edgeIdBetween(a, b)] });
    const p2 = makePlayer('p2', { settlements: [b] });
    expect(canPlaceRoad(edgeIdBetween(b, c), graph, [p1, p2], 'p1')).toBe(false);
  });

  it('still allows building at an intersection holding OWN settlement', () => {
    const [a, b, c] = findPath(graph, 2);
    const p1 = makePlayer('p1', { roads: [edgeIdBetween(a, b)], settlements: [b] });
    expect(canPlaceRoad(edgeIdBetween(b, c), graph, [p1], 'p1')).toBe(true);
  });
});

describe('computeLongestRoad', () => {
  it('returns 0 for no roads', () => {
    expect(computeLongestRoad('p1', graph, [makePlayer('p1')])).toBe(0);
  });

  it('counts a straight chain fully', () => {
    const path = findPath(graph, 5);
    const p1 = makePlayer('p1', { roads: chainEdges(path) });
    expect(computeLongestRoad('p1', graph, [p1])).toBe(5);
  });

  it('picks the longest branch of a fork, not the sum', () => {
    // Build a Y: b is the junction — edges (a,b), (b,c), plus a second edge off b.
    const [a, b, c] = findPath(graph, 2);
    const bInter = graph.intersections.get(b)!;
    const d = bInter.adjacentIntersections.find(x => x !== a && x !== c)!;
    const roads = [edgeIdBetween(a, b), edgeIdBetween(b, c), edgeIdBetween(b, d)];
    const p1 = makePlayer('p1', { roads });
    expect(computeLongestRoad('p1', graph, [p1])).toBe(2);
  });

  it('counts a closed loop of 6 around a hex as 6', () => {
    const corners = graph.hexIntersections.get('0,0')!;
    const roads = corners.map((c, i) => edgeIdBetween(c, corners[(i + 1) % 6]));
    const p1 = makePlayer('p1', { roads });
    expect(computeLongestRoad('p1', graph, [p1])).toBe(6);
  });

  it('is split by an opponent settlement in the middle', () => {
    const path = findPath(graph, 4); // a-b-c-d-e
    const mid = path[2];
    const p1 = makePlayer('p1', { roads: chainEdges(path) });
    const p2 = makePlayer('p2', { settlements: [mid] });
    expect(computeLongestRoad('p1', graph, [p1, p2])).toBe(2);
  });

  it('is NOT split by own settlement', () => {
    const path = findPath(graph, 4);
    const p1 = makePlayer('p1', { roads: chainEdges(path), settlements: [path[2]] });
    expect(computeLongestRoad('p1', graph, [p1])).toBe(4);
  });
});

describe('distributeResources', () => {
  // Beginner board: (2,0) = mountains 8, (-2,1) = forest 8, (0,-1) = hills 6.
  const oreCorner = graph.hexIntersections.get('2,0')![0];
  const lumberCorner = graph.hexIntersections.get('-2,1')![0];
  const NO_ROBBER = '0,0'; // desert

  it('pays 1 resource per settlement on a matching hex', () => {
    const p1 = makePlayer('p1', { settlements: [oreCorner] });
    const [after] = distributeResources(8, BEGINNER_BOARD, graph, [p1], NO_ROBBER);
    expect(after.resources).toEqual(res({ ore: 1 }));
  });

  it('pays 2 resources per city', () => {
    const p1 = makePlayer('p1', { cities: [oreCorner] });
    const [after] = distributeResources(8, BEGINNER_BOARD, graph, [p1], NO_ROBBER);
    expect(after.resources.ore).toBe(2);
  });

  it('pays multiple players from multiple hexes on the same roll', () => {
    const p1 = makePlayer('p1', { settlements: [oreCorner] });
    const p2 = makePlayer('p2', { settlements: [lumberCorner] });
    const [a1, a2] = distributeResources(8, BEGINNER_BOARD, graph, [p1, p2], NO_ROBBER);
    expect(a1.resources.ore).toBe(1);
    expect(a2.resources.lumber).toBe(1);
  });

  it('skips the hex occupied by the robber', () => {
    const p1 = makePlayer('p1', { settlements: [oreCorner] });
    const [after] = distributeResources(8, BEGINNER_BOARD, graph, [p1], '2,0');
    expect(after.resources.ore).toBe(0);
  });

  it('robber on one hex does not block the other same-number hex', () => {
    const p1 = makePlayer('p1', { settlements: [oreCorner, lumberCorner] });
    const [after] = distributeResources(8, BEGINNER_BOARD, graph, [p1], '2,0');
    expect(after.resources.ore).toBe(0);
    expect(after.resources.lumber).toBe(1);
  });

  it('ignores rolls that match no producing building', () => {
    const p1 = makePlayer('p1', { settlements: [oreCorner] });
    const players = [p1];
    const result = distributeResources(6, BEGINNER_BOARD, graph, players, NO_ROBBER);
    // no deltas → same array reference (documented fast path)
    expect(result).toBe(players);
  });

  it('a corner shared by two hexes pays only from the hex whose number was rolled', () => {
    // Find a corner shared by hills-6 (0,-1) and pasture-4 (1,-1)
    const hills6 = new Set(graph.hexIntersections.get('0,-1')!);
    const shared = graph.hexIntersections.get('1,-1')!.find(id => hills6.has(id))!;
    const p1 = makePlayer('p1', { settlements: [shared] });

    const [afterSix] = distributeResources(6, BEGINNER_BOARD, graph, [p1], NO_ROBBER);
    expect(afterSix.resources.brick).toBe(1);
    expect(afterSix.resources.wool).toBe(0);

    const [afterFour] = distributeResources(4, BEGINNER_BOARD, graph, [p1], NO_ROBBER);
    expect(afterFour.resources.wool).toBe(1);
    expect(afterFour.resources.brick).toBe(0);
  });

  it('does not mutate input players', () => {
    const p1 = makePlayer('p1', { settlements: [oreCorner] });
    distributeResources(8, BEGINNER_BOARD, graph, [p1], NO_ROBBER);
    expect(p1.resources.ore).toBe(0);
  });
});
