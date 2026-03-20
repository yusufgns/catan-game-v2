"use client";

import {
  hexCornersArray,
  hexToPixel,
  HARBOR_RESOURCE_COLOR,
  HARBOR_RESOURCE_LABEL,
  type Harbor,
} from "@/lib/hexGrid";

interface HarborMarkerProps {
  harbor: Harbor;
  size: number;
}

/**
 * SVG sailing ship marker for a harbor.
 * Two dock planks extend from the two edge corners to the ship.
 * Ship has hull + sails + flag banner with trade ratio.
 */
export function HarborMarker({ harbor, size }: HarborMarkerProps) {
  const { x: cx, y: cy } = hexToPixel(harbor.q, harbor.r, size);
  const corners = hexCornersArray(cx, cy, size);
  const c1 = corners[harbor.edge];
  const c2 = corners[(harbor.edge + 1) % 6];
  const emx = (c1.x + c2.x) / 2;
  const emy = (c1.y + c2.y) / 2;

  // Ship position: 60% from edge midpoint toward ocean hex center
  const sx = emx + (cx - emx) * 0.60;
  const sy = emy + (cy - emy) * 0.60;

  const color = harbor.resource ? HARBOR_RESOURCE_COLOR[harbor.resource] : "#d4a820";
  const ratioText = harbor.type === "2:1" ? "2:1" : "3:1";
  const labelText = harbor.resource ? HARBOR_RESOURCE_LABEL[harbor.resource] : "?";

  const s = size * 0.012;
  const dockColor = "rgba(160,110,40,0.85)";
  const dockHighlight = "rgba(200,150,60,0.5)";

  return (
    <g>
      {/* Dock plank 1 — from corner 1 to ship */}
      <line x1={c1.x} y1={c1.y} x2={sx} y2={sy}
        stroke={dockColor} strokeWidth={size * 0.04} strokeLinecap="round" />
      <line x1={c1.x} y1={c1.y} x2={sx} y2={sy}
        stroke={dockHighlight} strokeWidth={size * 0.018} strokeLinecap="round" />

      {/* Dock plank 2 — from corner 2 to ship */}
      <line x1={c2.x} y1={c2.y} x2={sx} y2={sy}
        stroke={dockColor} strokeWidth={size * 0.04} strokeLinecap="round" />
      <line x1={c2.x} y1={c2.y} x2={sx} y2={sy}
        stroke={dockHighlight} strokeWidth={size * 0.018} strokeLinecap="round" />

      {/* Ship group — centered at (sx, sy) */}
      <g transform={`translate(${sx}, ${sy}) scale(${s})`}>
        {/* Hull */}
        <path d="M-18,6 L-14,14 L14,14 L18,6 Z"
          fill="#8B4513" stroke="#5a2d0c" strokeWidth={1.5} />
        <path d="M-16,8 L-12,13 L12,13 L16,8 Z"
          fill="#a0622a" opacity={0.6} />

        {/* Mast */}
        <line x1={0} y1={-18} x2={0} y2={10} stroke="#5a2d0c" strokeWidth={2} />

        {/* Sails */}
        <path d="M1,-16 L1,4 L14,-4 Z"
          fill="white" stroke="rgba(180,180,180,0.6)" strokeWidth={0.8} opacity={0.95} />
        <path d="M-1,-14 L-1,2 L-12,-3 Z"
          fill="rgba(240,240,240,0.9)" stroke="rgba(180,180,180,0.5)" strokeWidth={0.8} />

        {/* Flag banner */}
        <rect x={-12} y={-24} width={24} height={16} rx={3}
          fill="white" stroke="rgba(0,0,0,0.3)" strokeWidth={0.8} />
        <text x={0} y={-18} textAnchor="middle" dominantBaseline="middle"
          fontSize={8} fontWeight="bold" fontFamily="Arial, sans-serif" fill={color}>
          {labelText}
        </text>
        <text x={0} y={-11} textAnchor="middle" dominantBaseline="middle"
          fontSize={6.5} fontWeight="bold" fontFamily="Arial, sans-serif" fill="rgba(60,60,60,0.9)">
          {ratioText}
        </text>
      </g>
    </g>
  );
}
