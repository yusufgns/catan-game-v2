"use client";

import { hexCorners, hexCornersArray } from "@/lib/hexGrid";

interface OceanTileProps {
  cx: number;
  cy: number;
  size: number;
  id: string;
}

export function OceanTile({ cx, cy, size, id }: OceanTileProps) {
  const corners = hexCorners(cx, cy, size);
  const edgeCorners = hexCornersArray(cx, cy, size);
  const gradId = `ocean-grad-${id}`;
  const waveId = `ocean-wave-${id}`;

  return (
    <g>
      <defs>
        <radialGradient id={gradId} cx="45%" cy="40%" r="65%">
          <stop offset="0%"  stopColor="#0e2a4a" />
          <stop offset="100%" stopColor="#061525" />
        </radialGradient>

        {/* Subtle wave pattern */}
        <pattern id={waveId} x="0" y="0" width="20" height="10" patternUnits="userSpaceOnUse">
          <path
            d="M0,5 Q5,2 10,5 Q15,8 20,5"
            fill="none"
            stroke="#1a4a7a"
            strokeWidth="0.8"
            opacity="0.35"
          />
        </pattern>
      </defs>

      {/* Side faces */}
      {edgeCorners.map((corner, i) => {
        const next = edgeCorners[(i + 1) % 6];
        const depth = 5;
        const midY = (corner.y + next.y) / 2;
        const isFront = midY >= cy;
        if (!isFront) return null;
        return (
          <polygon
            key={i}
            points={`${corner.x},${corner.y} ${next.x},${next.y} ${next.x},${next.y + depth} ${corner.x},${corner.y + depth}`}
            fill="#04111f"
            stroke="#0a2a4a44"
            strokeWidth={0.5}
            opacity={0.8}
          />
        );
      })}

      {/* Base fill — black thicker border */}
      <polygon
        points={corners}
        fill={`url(#${gradId})`}
        stroke="#000000"
        strokeWidth={2.5}
      />

      {/* Wave texture */}
      <polygon
        points={corners}
        fill={`url(#${waveId})`}
        opacity={0.7}
      />
    </g>
  );
}
