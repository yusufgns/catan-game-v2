/**
 * Road3D.tsx — Catan road segment (redesigned)
 *
 * Dimensions and materials are IDENTICAL to the constants used in RoadNode3D
 * so roads slot seamlessly into node stub-arms without any gap or mismatch.
 *
 * Design change: no stone end-caps ("train-rail connectors") — the road ends
 * are plain flat faces.  The RoadNode's stub-arm stone cap naturally bridges
 * the junction, so the road body just needs to be a clean connecting piece.
 *
 *  Cross-section profile (matches RoadNode stub arm exactly):
 *    ┌─────────────────────┐  ← planks  (PW = 0.62 wide, PH = 0.18 tall)
 *    │░░░░░░░░░░░░░░░░░░░░░│
 *    ├─────────────────────┤
 *    │▓▓▓▓▓▓▓▓ frame ▓▓▓▓▓▓│  ← frame   (FW = 0.70 wide, FH = 0.26 tall)
 *    └─────────────────────┘
 *
 * Usage:
 *   <Road3D color="#EA580C" position={[0,0,0]} rotationY={0} />
 *   <Road3D color="#2563EB" rotationY={Math.PI / 3} />
 */
import React from 'react'

function dk(hex: string, f: number): string {
  const h = hex.replace('#', '')
  return '#' + [0, 2, 4].map(i =>
    Math.round(parseInt(h.slice(i, i + 2), 16) * (1 - f))
      .toString(16).padStart(2, '0')
  ).join('')
}

export type Road3DRotation = 0 | 60 | 120

export interface Road3DProps {
  /** Player colour — must match the RoadNode playerColor at each end */
  color: string
  scale?: number | [number, number, number]
  position?: [number, number, number]
  /** Y-rotation in degrees: 0 | 60 | 120 (hex edge angles) */
  rotationY?: number
  shadows?: boolean
}

/* ── Dimensions — kept in sync with RoadNode3D constants ─────────────────── */
const LENGTH = 2.80   // road length (X axis)
const FH     = 0.26   // frame height
const PH     = 0.18   // plank height
const PW     = 0.62   // plank width  (inner — matches node stub arm)
const FW     = PW + 0.08   // frame width = 0.70

/* ── Y layers ──────────────────────────────────────────────────────────────── */
const FRAME_Y   = FH / 2
const FRAME_TOP = FH
const PLY       = FRAME_TOP + PH / 2 + 0.005   // plank centre Y
const PLANK_TOP = FRAME_TOP + PH + 0.005
const GRAIN_Y   = PLANK_TOP + 0.006             // grain lines sit on planks
const DIVIDER_Y = PLANK_TOP + 0.010             // cross dividers
const BOLT_Y    = FRAME_TOP + 0.035             // bolt top (same as RoadNode)

/* ── Colours ───────────────────────────────────────────────────────────────── */
const PLANK_COL   = '#e0cfa0'
const PLANK_GRAIN = '#c8b882'   // slightly darker — plank board edges
const BOLT_COL    = '#4a5a6a'

/* ── Bolt positions: 3 pairs evenly spaced along the road ─────────────────── */
const BOLT_X_POSITIONS = [-LENGTH * 0.32, 0, LENGTH * 0.32]
const BOLT_Z_SIDES     = [-(PW / 2 + 0.03),  PW / 2 + 0.03]  // just outside planks

export default function Road3D ({
  color,
  scale    = 1,
  position = [0, 0, 0],
  rotationY = 0,
  shadows   = true,
}: Road3DProps) {

  const FRAME_D = dk(color, 0.30)
  const rotRad  = (rotationY * Math.PI) / 180
  const S       = shadows

  return (
    <group position={position} rotation={[0, rotRad, 0]} scale={scale}>

      {/* ══════════════════════════════════════════════════
          FRAME — player colour base slab
      ══════════════════════════════════════════════════ */}
      <mesh position={[0, FRAME_Y, 0]} castShadow={S} receiveShadow={S}>
        <boxGeometry args={[LENGTH, FH, FW]} />
        <meshStandardMaterial color={color} roughness={0.75} />
      </mesh>

      {/* Bottom bevel — slightly wider, darker strip at base (matches node bevel) */}
      <mesh position={[0, FH * 0.12, 0]}>
        <boxGeometry args={[LENGTH + 0.02, FH * 0.24, FW + 0.04]} />
        <meshStandardMaterial color={FRAME_D} roughness={0.82} />
      </mesh>

      {/* Side edge rails — narrow dark strip along each long edge */}
      {([-1, 1] as const).map(s => (
        <mesh key={s} position={[0, FRAME_Y + 0.004, s * (FW / 2 - 0.018)]}>
          <boxGeometry args={[LENGTH, FH - 0.01, 0.030]} />
          <meshStandardMaterial color={FRAME_D} roughness={0.78} />
        </mesh>
      ))}

      {/* ══════════════════════════════════════════════════
          PLANKS — three boards running lengthwise
      ══════════════════════════════════════════════════ */}
      {/* Main plank surface */}
      <mesh position={[0, PLY, 0]} castShadow={S} receiveShadow={S}>
        <boxGeometry args={[LENGTH, PH, PW]} />
        <meshStandardMaterial color={PLANK_COL} roughness={0.84} />
      </mesh>

      {/* Plank grain lines — two dividing lines making 3 visible boards */}
      {([-0.205, 0.205] as const).map((z, i) => (
        <mesh key={i} position={[0, GRAIN_Y, z]}>
          <boxGeometry args={[LENGTH, 0.018, 0.022]} />
          <meshStandardMaterial color={PLANK_GRAIN} roughness={0.88} />
        </mesh>
      ))}

      {/* ══════════════════════════════════════════════════
          CROSS DIVIDERS — structural joints across planks
          (like the ring-dividers on RoadNode)
      ══════════════════════════════════════════════════ */}
      {([-0.85, -0.28, 0.28, 0.85] as const).map((x, i) => (
        <mesh key={i} position={[x, DIVIDER_Y, 0]}>
          <boxGeometry args={[0.030, 0.020, PW + 0.04]} />
          <meshStandardMaterial color={PLANK_GRAIN} roughness={0.86} />
        </mesh>
      ))}

      {/* ══════════════════════════════════════════════════
          BOLT POSTS — matches RoadNode bolt style exactly
          (3 pairs evenly spaced, one on each side of planks)
      ══════════════════════════════════════════════════ */}
      {BOLT_X_POSITIONS.map(x =>
        BOLT_Z_SIDES.map(z => (
          <mesh key={`${x}-${z}`} position={[x, BOLT_Y, z]}>
            <cylinderGeometry args={[0.048, 0.048, 0.050, 7]} />
            <meshStandardMaterial color={BOLT_COL} roughness={0.50} metalness={0.40} />
          </mesh>
        ))
      )}

    </group>
  )
}