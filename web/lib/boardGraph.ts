// Builds the intersection + edge graph for a Catan board.
// Each land hex contributes 6 corners (intersections) and 6 edges.
// Shared corners/edges between adjacent hexes are deduplicated by coordinate key.

import { hexToPixel, hexCornersArray } from "./hexGrid";

export const BOARD_HEX_SIZE = 72;

function ikey(x: number, y: number): string {
  return `${Math.round(x)},${Math.round(y)}`;
}

function ekey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

export interface Intersection {
  id: string;
  x: number;
  y: number;
  adjacentIntersections: string[]; // ids of directly-connected intersections
  adjacentEdges: string[];         // edge ids touching this intersection
}

export interface Edge {
  id: string;
  intersections: [string, string]; // the two endpoint intersection ids
  mx: number; // midpoint x (SVG user coords)
  my: number; // midpoint y
}

export interface BoardGraph {
  intersections: Map<string, Intersection>;
  edges: Map<string, Edge>;
  /** Maps "q,r" → the 6 intersection ids that touch that hex. */
  hexIntersections: Map<string, string[]>;
}

export function buildBoardGraph(hexes: Array<{ q: number; r: number }>): BoardGraph {
  const intersections = new Map<string, Intersection>();
  const edges = new Map<string, Edge>();
  const hexIntersections = new Map<string, string[]>();

  for (const hex of hexes) {
    const { x, y } = hexToPixel(hex.q, hex.r, BOARD_HEX_SIZE);
    const corners = hexCornersArray(x, y, BOARD_HEX_SIZE);
    // Record which intersection ids belong to this hex
    hexIntersections.set(`${hex.q},${hex.r}`, corners.map(c => ikey(c.x, c.y)));

    // Register intersections
    for (const c of corners) {
      const id = ikey(c.x, c.y);
      if (!intersections.has(id)) {
        intersections.set(id, {
          id,
          x: c.x,
          y: c.y,
          adjacentIntersections: [],
          adjacentEdges: [],
        });
      }
    }

    // Register the 6 edges of this hex (pairs of consecutive corners)
    for (let i = 0; i < 6; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % 6];
      const aId = ikey(a.x, a.y);
      const bId = ikey(b.x, b.y);
      const eid = ekey(aId, bId);

      if (!edges.has(eid)) {
        edges.set(eid, {
          id: eid,
          intersections: [aId, bId],
          mx: (a.x + b.x) / 2,
          my: (a.y + b.y) / 2,
        });

        // Update adjacency lists (guard against duplicates from shared edges)
        const intA = intersections.get(aId)!;
        const intB = intersections.get(bId)!;

        if (!intA.adjacentIntersections.includes(bId)) {
          intA.adjacentIntersections.push(bId);
          intA.adjacentEdges.push(eid);
        }
        if (!intB.adjacentIntersections.includes(aId)) {
          intB.adjacentIntersections.push(aId);
          intB.adjacentEdges.push(eid);
        }
      }
    }
  }

  return { intersections, edges, hexIntersections };
}
