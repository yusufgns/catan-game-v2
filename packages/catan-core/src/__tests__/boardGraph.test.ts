import { describe, expect, it } from 'vitest';
import { buildBoardGraph } from '../boardGraph';
import { BEGINNER_BOARD } from '../hexGrid';

describe('buildBoardGraph (19-hex land board)', () => {
  const graph = buildBoardGraph(BEGINNER_BOARD);

  it('has exactly 54 intersections and 72 edges (standard Catan)', () => {
    expect(graph.intersections.size).toBe(54);
    expect(graph.edges.size).toBe(72);
  });

  it('maps every hex to exactly 6 corners', () => {
    expect(graph.hexIntersections.size).toBe(19);
    for (const [, corners] of graph.hexIntersections) {
      expect(corners).toHaveLength(6);
      // all corners must exist as intersections
      for (const id of corners) expect(graph.intersections.has(id)).toBe(true);
    }
  });

  it('has symmetric intersection adjacency', () => {
    for (const [id, inter] of graph.intersections) {
      for (const adjId of inter.adjacentIntersections) {
        const adj = graph.intersections.get(adjId)!;
        expect(adj.adjacentIntersections).toContain(id);
      }
    }
  });

  it('every edge connects two existing, mutually adjacent intersections', () => {
    for (const [, edge] of graph.edges) {
      const [a, b] = edge.intersections;
      expect(a).not.toBe(b);
      const ia = graph.intersections.get(a)!;
      const ib = graph.intersections.get(b)!;
      expect(ia.adjacentIntersections).toContain(b);
      expect(ib.adjacentIntersections).toContain(a);
    }
  });

  it('every intersection has 2 or 3 adjacent edges, matching adjacent intersections', () => {
    for (const [, inter] of graph.intersections) {
      expect(inter.adjacentEdges.length).toBeGreaterThanOrEqual(2);
      expect(inter.adjacentEdges.length).toBeLessThanOrEqual(3);
      expect(inter.adjacentEdges.length).toBe(inter.adjacentIntersections.length);
    }
  });

  it('interior intersections (3 edges) exist — center hex corners are all interior', () => {
    const centerCorners = graph.hexIntersections.get('0,0')!;
    for (const id of centerCorners) {
      expect(graph.intersections.get(id)!.adjacentEdges).toHaveLength(3);
    }
  });

  it('total corner references: 54 intersections cover 19×6 hex corners via sharing', () => {
    const allRefs = [...graph.hexIntersections.values()].flat();
    expect(allRefs).toHaveLength(19 * 6);
    expect(new Set(allRefs).size).toBe(54);
  });
});
