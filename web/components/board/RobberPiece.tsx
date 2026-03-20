"use client";

/**
 * RobberPiece — CSS 3D cube (same style as settlements/cities).
 * Uses preserve-3d and the same transform structure as CSSCube,
 * so it sits correctly in the board's 3D space.
 */

// Dark purple robber color — matches Catan robber aesthetic
const ROBBER_COLOR = "#2a1a7e";

function adj(hex: string, f: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.min(255, Math.round(r * f))},${Math.min(255, Math.round(g * f))},${Math.min(255, Math.round(b * f))})`;
}

interface Props {
  cssX: number;
  cssY: number;
  size: number;
}

export function RobberPiece({ cssX, cssY, size }: Props) {
  const h = size / 2;
  const face: React.CSSProperties = {
    position: "absolute",
    width: size,
    height: size,
    backfaceVisibility: "hidden",
  };
  return (
    <div
      style={{
        position: "absolute",
        left: cssX,
        top: cssY,
        transformStyle: "preserve-3d",
        transform: `translate(-${h}px, -${h}px) translateZ(${h}px)`,
        pointerEvents: "none",
      }}
    >
      {/* Top — brightest */}
      <div
        style={{
          ...face,
          background: adj(ROBBER_COLOR, 1.5),
          border: `1px solid ${adj(ROBBER_COLOR, 2.0)}`,
          transform: `rotateX(90deg) translateZ(${h}px)`,
        }}
      />
      {/* Front */}
      <div
        style={{
          ...face,
          background: adj(ROBBER_COLOR, 1.1),
          border: `1px solid ${adj(ROBBER_COLOR, 1.6)}`,
          transform: `translateZ(${h}px)`,
        }}
      />
      {/* Back */}
      <div
        style={{
          ...face,
          background: adj(ROBBER_COLOR, 0.45),
          transform: `rotateY(180deg) translateZ(${h}px)`,
        }}
      />
      {/* Left */}
      <div
        style={{
          ...face,
          background: adj(ROBBER_COLOR, 0.68),
          border: `0.5px solid ${adj(ROBBER_COLOR, 1.0)}`,
          transform: `rotateY(-90deg) translateZ(${h}px)`,
        }}
      />
      {/* Right */}
      <div
        style={{
          ...face,
          background: adj(ROBBER_COLOR, 0.68),
          border: `0.5px solid ${adj(ROBBER_COLOR, 1.0)}`,
          transform: `rotateY(90deg) translateZ(${h}px)`,
        }}
      />
      {/* Bottom */}
      <div
        style={{
          ...face,
          background: adj(ROBBER_COLOR, 0.28),
          transform: `rotateX(-90deg) translateZ(${h}px)`,
        }}
      />
    </div>
  );
}
