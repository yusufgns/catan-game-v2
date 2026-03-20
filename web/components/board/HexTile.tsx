"use client";

import {
  hexCorners,
  hexCornersArray,
  TERRAIN_CONFIG,
  NUMBER_PIPS,
  type TerrainType,
} from "@/lib/hexGrid";

interface HexTileProps {
  cx: number;
  cy: number;
  size: number;
  type: TerrainType;
  number: number | null;
  id: string;
}

export function HexTile({ cx, cy, size, type, number, id }: HexTileProps) {
  const config = TERRAIN_CONFIG[type];
  const corners = hexCorners(cx, cy, size);
  const innerCorners = hexCorners(cx, cy, size * 0.92);
  const edgeCorners = hexCornersArray(cx, cy, size);
  const isHighRoll = number === 6 || number === 8;
  const pips = number ? NUMBER_PIPS[number] ?? 0 : 0;

  const gradId = `grad-${id}`;
  const patternId = `pat-${id}`;

  return (
    <g>
      <defs>
        <radialGradient id={gradId} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor={config.gradientTo} />
          <stop offset="100%" stopColor={config.gradientFrom} />
        </radialGradient>

        <pattern id={patternId} x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
          {type === "forest" && (
            <>
              <circle cx="3" cy="3" r="2" fill="#15803d" opacity="0.4" />
              <circle cx="9" cy="8" r="1.5" fill="#166534" opacity="0.3" />
              <circle cx="6" cy="11" r="1" fill="#14532d" opacity="0.25" />
            </>
          )}
          {type === "mountains" && (
            <>
              <polygon points="4,10 7,3 10,10" fill="#334155" opacity="0.35" />
              <polygon points="0,10 3,5 6,10" fill="#1e293b" opacity="0.25" />
            </>
          )}
          {type === "hills" && (
            <>
              <ellipse cx="6" cy="8" rx="5" ry="3" fill="#92400e" opacity="0.3" />
            </>
          )}
          {type === "pasture" && (
            <>
              <line x1="2" y1="10" x2="2" y2="5" stroke="#4ade80" strokeWidth="0.8" opacity="0.4" />
              <line x1="6" y1="10" x2="6" y2="4" stroke="#22c55e" strokeWidth="0.8" opacity="0.35" />
              <line x1="10" y1="10" x2="10" y2="6" stroke="#4ade80" strokeWidth="0.8" opacity="0.3" />
            </>
          )}
          {type === "fields" && (
            <>
              <line x1="0" y1="4" x2="12" y2="4" stroke="#ca8a04" strokeWidth="0.6" opacity="0.3" />
              <line x1="0" y1="8" x2="12" y2="8" stroke="#a16207" strokeWidth="0.6" opacity="0.25" />
            </>
          )}
        </pattern>
      </defs>

      {/* Side faces — only front-facing (below center), small depth to avoid flare */}
      {edgeCorners.map((corner, i) => {
        const next = edgeCorners[(i + 1) % 6];
        const depth = 7;
        const midY = (corner.y + next.y) / 2;
        const isFront = midY >= cy;
        if (!isFront) return null;
        return (
          <polygon
            key={i}
            points={`${corner.x},${corner.y} ${next.x},${next.y} ${next.x},${next.y + depth} ${corner.x},${corner.y + depth}`}
            fill={config.gradientFrom}
            stroke="rgba(0,0,0,0.4)"
            strokeWidth={0.5}
            opacity={0.88}
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

      {/* Texture */}
      <polygon points={corners} fill={`url(#${patternId})`} opacity={0.6} />

      {/* Inner highlight */}
      <polygon
        points={innerCorners}
        fill="none"
        stroke="white"
        strokeWidth={1.2}
        opacity={0.07}
      />

      {/* Number token — positioned at the bottom area of the hex */}
      {number !== null && (() => {
        const ty = cy + size * 0.5; // bottom section of the hex (at the lower-side vertices)
        return (
          <g>
            <circle
              cx={cx}
              cy={ty}
              r={size * 0.22}
              fill="#0a0a0f"
              stroke={isHighRoll ? "#ff3333" : config.accentColor}
              strokeWidth={1.5}
            />
            <circle
              cx={cx}
              cy={ty}
              r={size * 0.18}
              fill="none"
              stroke={isHighRoll ? "#ff666655" : config.accentColor + "33"}
              strokeWidth={1}
            />
            <text
              x={cx}
              y={ty}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={size * 0.18}
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
              fill={isHighRoll ? "#ff4444" : "#e2e8f0"}
            >
              {number}
            </text>
            {Array.from({ length: pips }, (_, i) => (
              <circle
                key={i}
                cx={cx - ((pips - 1) * 3) / 2 + i * 3}
                cy={ty + size * 0.14}
                r={1.2}
                fill={isHighRoll ? "#ff4444" : config.accentColor}
                opacity={0.9}
              />
            ))}
          </g>
        );
      })()}

      {type === "desert" && (
        <text
          x={cx}
          y={cy + 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.28}
          fill="#ef4444"
          opacity={0.8}
        >
          ☠
        </text>
      )}
    </g>
  );
}
