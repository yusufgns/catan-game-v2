/**
 * 3D coordinate conversion for Catan hex board.
 * Maps 2D hex/pixel coordinates to Three.js world space.
 * Convention: X = right, Y = up, Z = into screen (2D y → -Z)
 */

import { hexToPixel } from "./hexGrid";

export const HEX_SIZE_3D = 1;
const PIXEL_TO_WORLD = HEX_SIZE_3D / 72; // 2D uses BOARD_HEX_SIZE=72

/** Convert 2D pixel (x,y) to 3D position [x, y, z] */
export function pixelToWorld3D(px: number, py: number): [number, number, number] {
  return [
    px * PIXEL_TO_WORLD,
    0,
    -py * PIXEL_TO_WORLD,
  ];
}

/** Convert hex (q,r) to 3D position [x, y, z] */
export function hexToWorld3D(q: number, r: number): [number, number, number] {
  const { x, y } = hexToPixel(q, r, 72);
  return pixelToWorld3D(x, y);
}

/** Get road rotation (0 | 60 | 120) from edge direction in degrees */
export function edgeAngleToRoadRotation(angleDeg: number): 0 | 60 | 120 {
  const normalized = (Math.round(angleDeg / 60) * 60) % 180;
  if (normalized <= 30 || normalized >= 150) return 0;
  if (normalized <= 90) return 60;
  return 120;
}
