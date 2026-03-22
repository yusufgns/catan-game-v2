/**
 * CityV2_3D.tsx — Compact City (v2)
 *
 * Design goal: "city" feel with a map-friendly footprint.
 * Two towers share ONE round stone base disc — the secondary turret
 * is placed tight against the main tower (they overlap slightly) so
 * the total footprint is only ~1.32 units wide vs Settlement's ~1.16.
 *
 * Visual hierarchy  (bottom → top):
 *   shared base disc
 *     ├── main tower  (wider, taller, 8 merlons, large cone)
 *     │     door · 2 arrow slits · flag
 *     └── secondary turret  (smaller, 5 merlons, small cone)
 *           door · arrow slit
 *   cylindrical connecting arch (log bridge)
 *
 * Dimensions compared to Settlement3D:
 *   Settlement base  r=0.52  tower h=1.15
 *   CityV2    base   r=0.70  main  h=1.62   → clearly larger, still compact
 *
 * Usage:
 *   <CityV2_3D playerColor="#2563EB" position={[0,0,0]} />
 */
import React from 'react'

// ── helpers ───────────────────────────────────────────────────────────────────
function dk(hex: string, f: number): string {
  const h = hex.replace('#', '')
  return '#' + [0, 2, 4].map(i =>
    Math.round(parseInt(h.slice(i, i + 2), 16) * (1 - f))
      .toString(16).padStart(2, '0')
  ).join('')
}

// ── props ─────────────────────────────────────────────────────────────────────
export interface CityV2Props {
  /** Player colour (merlons, cones, doors). */
  playerColor?: string
  scale?: number | [number, number, number]
  position?: [number, number, number]
  rotationY?: number
  shadows?: boolean
}

// ── sub-components ────────────────────────────────────────────────────────────

/** Evenly-spaced merlon blocks around a circle */
function MerlonRing ({
  n, r, y, size = [0.13, 0.20, 0.13], color, shadows,
}: {
  n: number; r: number; y: number
  size?: [number, number, number]; color: string; shadows: boolean
}) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2
        return (
          <mesh key={i}
            position={[Math.sin(a) * r, y, Math.cos(a) * r]}
            castShadow={shadows}>
            <boxGeometry args={size} />
            <meshStandardMaterial color={color} roughness={0.68} />
          </mesh>
        )
      })}
    </>
  )
}

/**
 * One cylindrical tower.
 * ox/oz = X/Z offset within the parent group.
 */
function Tower ({
  ox = 0, oz = 0,
  baseR, topR, height, seg,
  battH, battR, merlonN, merlonSize,
  coneH, coneR,
  doorZ, doorW, doorH,
  slits,
  playerColor, stoneCol, stoneDk, dark,
  shadows,
}: {
  ox?: number; oz?: number
  baseR: number; topR: number; height: number; seg: number
  battH: number; battR: number; merlonN: number; merlonSize?: [number,number,number]
  coneH: number; coneR: number
  doorZ: number; doorW: number; doorH: number
  slits: [number, number][]   // [y, z] pairs for arrow slits
  playerColor: string; stoneCol: string; stoneDk: string; dark: string
  shadows: boolean
}) {
  const BH    = 0.10              // foundation ring height
  const twrTop = BH + height      // top of tower body
  const battTop = twrTop + battH  // top of battlement ring

  return (
    <group position={[ox, 0, oz]}>

      {/* ── Foundation ring ── */}
      <mesh position={[0, BH / 2, 0]} castShadow={shadows} receiveShadow={shadows}>
        <cylinderGeometry args={[baseR * 0.92, baseR, BH, seg]} />
        <meshStandardMaterial color={stoneDk} roughness={0.95} />
      </mesh>

      {/* ── Tower body (tapered) ── */}
      <mesh position={[0, BH + height / 2, 0]} castShadow={shadows} receiveShadow={shadows}>
        <cylinderGeometry args={[topR, baseR, height, seg]} />
        <meshStandardMaterial color={stoneCol} roughness={0.88} />
      </mesh>

      {/* Mid stone bands */}
      <mesh position={[0, BH + height * 0.52, 0]}>
        <cylinderGeometry args={[baseR * 0.80 + 0.02, baseR * 0.80, 0.058, seg]} />
        <meshStandardMaterial color={stoneDk} roughness={0.92} />
      </mesh>
      <mesh position={[0, BH + height * 0.72, 0]}>
        <cylinderGeometry args={[topR * 0.90 + 0.02, topR * 0.90, 0.048, seg]} />
        <meshStandardMaterial color={stoneDk} roughness={0.92} />
      </mesh>

      {/* ── Battlement ring ── */}
      <mesh position={[0, twrTop + battH / 2, 0]} castShadow={shadows}>
        <cylinderGeometry args={[battR, topR, battH, seg]} />
        <meshStandardMaterial color={stoneDk} roughness={0.90} />
      </mesh>

      {/* ── Merlons (player colour) ── */}
      <MerlonRing
        n={merlonN} r={battR - 0.01} y={battTop + (merlonSize?.[1] ?? 0.20) / 2}
        size={merlonSize} color={playerColor} shadows={shadows}
      />

      {/* ── Conical roof ── */}
      <mesh position={[0, battTop + coneH / 2, 0]} castShadow={shadows}>
        <coneGeometry args={[coneR, coneH, seg]} />
        <meshStandardMaterial color={playerColor} roughness={0.62} />
      </mesh>

      {/* ── Door frame ── */}
      <mesh position={[0, BH + doorH / 2 + 0.04, doorZ]}>
        <boxGeometry args={[doorW + 0.10, doorH + 0.08, 0.05]} />
        <meshStandardMaterial color={playerColor} roughness={0.68} />
      </mesh>
      {/* Door opening */}
      <mesh position={[0, BH + doorH / 2 + 0.04, doorZ + 0.02]}>
        <boxGeometry args={[doorW, doorH, 0.05]} />
        <meshStandardMaterial color={dark} roughness={0.90} />
      </mesh>

      {/* ── Arrow slits ── */}
      {slits.map(([sy, sz], i) => (
        <mesh key={i} position={[0, sy, sz]}>
          <boxGeometry args={[0.07, 0.24, 0.05]} />
          <meshStandardMaterial color={dark} roughness={0.90} />
        </mesh>
      ))}

    </group>
  )
}

// ── main component ────────────────────────────────────────────────────────────
export default function CityV2_3D ({
  playerColor = '#2563EB',
  scale       = 1,
  position    = [0, 0, 0],
  rotationY   = 0,
  shadows     = true,
}: CityV2Props) {

  const STONE   = '#a0aec0'
  const STONE_D = dk(STONE, 0.22)
  const DARK    = '#1c1917'

  const s = typeof scale === 'number'
    ? ([scale, scale, scale] as [number, number, number])
    : scale

  // ── layout constants ─────────────────────────────────────────────────────
  // Main tower centre at x=0; secondary turret at x=SOX
  // They overlap by (M_RB + S_RB − SOX) = 0.52+0.26−0.54 = 0.24  →  attached
  const SOX  = 0.54   // secondary turret X offset
  const DISC_R  = 0.72  // shared base disc radius
  const DISC_X  = SOX / 2   // disc centred between both towers

  // Main tower geometry
  const M_RB = 0.52, M_RT = 0.42, M_H = 1.62, M_SEG = 12
  const M_BATH = 0.22, M_BATR = M_RT + 0.09
  const M_CONH = 0.72, M_CONR = 0.36
  const M_BH = 0.10, M_TOP = M_BH + M_H, M_BATT = M_TOP + M_BATH

  // Secondary turret geometry
  const S_RB = 0.26, S_RT = 0.20, S_H = 1.15, S_SEG = 9
  const S_BATH = 0.16, S_BATR = S_RT + 0.07
  const S_CONH = 0.50, S_CONR = 0.22
  const S_BH = 0.10

  // Connecting arch (cylinder on its side between towers at mid-height)
  const ARCH_Y  = M_BH + M_H * 0.36
  const ARCH_R  = 0.11
  const ARCH_LEN = SOX - M_RB - S_RB + 0.32   // slight overlap into both towers

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={s}>

      {/* ══════════════════════════════════════════════════
          SHARED BASE DISC
      ══════════════════════════════════════════════════ */}
      <mesh position={[DISC_X, 0.05, 0]} castShadow={shadows} receiveShadow={shadows}>
        <cylinderGeometry args={[DISC_R, DISC_R + 0.08, 0.10, 14]} />
        <meshStandardMaterial color={STONE_D} roughness={0.95} />
      </mesh>

      {/* ══════════════════════════════════════════════════
          MAIN TOWER
      ══════════════════════════════════════════════════ */}
      <Tower
        ox={0} oz={0}
        baseR={M_RB} topR={M_RT} height={M_H} seg={M_SEG}
        battH={M_BATH} battR={M_BATR} merlonN={8}
        merlonSize={[0.14, 0.22, 0.14]}
        coneH={M_CONH} coneR={M_CONR}
        doorZ={M_RB + 0.018} doorW={0.28} doorH={0.46}
        slits={[
          [ M_BH + M_H * 0.60,  M_RT + 0.014],
          [ M_BH + M_H * 0.60, -(M_RT + 0.014)],
        ]}
        playerColor={playerColor}
        stoneCol={STONE} stoneDk={STONE_D} dark={DARK}
        shadows={shadows}
      />

      {/* Flag on main tower tip */}
      <mesh position={[0.08, M_BATT + M_CONH + 0.16, 0.05]}>
        <boxGeometry args={[0.18, 0.12, 0.016]} />
        <meshStandardMaterial color={playerColor} roughness={0.65} />
      </mesh>

      {/* ══════════════════════════════════════════════════
          CONNECTING ARCH (log bridge between towers)
      ══════════════════════════════════════════════════ */}
      {/* Top log */}
      <mesh position={[SOX / 2, ARCH_Y + ARCH_R * 0.75, 0]}
        rotation={[0, 0, Math.PI / 2]} castShadow={shadows}>
        <cylinderGeometry args={[ARCH_R, ARCH_R, ARCH_LEN, 8]} />
        <meshStandardMaterial color={STONE_D} roughness={0.90} />
      </mesh>
      {/* Bottom log */}
      <mesh position={[SOX / 2, ARCH_Y - ARCH_R * 0.75, 0]}
        rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[ARCH_R * 0.72, ARCH_R * 0.72, ARCH_LEN, 8]} />
        <meshStandardMaterial color={STONE_D} roughness={0.92} />
      </mesh>

      {/* ══════════════════════════════════════════════════
          SECONDARY TURRET
      ══════════════════════════════════════════════════ */}
      <Tower
        ox={SOX} oz={0}
        baseR={S_RB} topR={S_RT} height={S_H} seg={S_SEG}
        battH={S_BATH} battR={S_BATR} merlonN={5}
        merlonSize={[0.11, 0.17, 0.11]}
        coneH={S_CONH} coneR={S_CONR}
        doorZ={S_RB + 0.014} doorW={0.20} doorH={0.32}
        slits={[
          [S_BH + S_H * 0.62, S_RT + 0.013],
        ]}
        playerColor={playerColor}
        stoneCol={STONE} stoneDk={STONE_D} dark={DARK}
        shadows={shadows}
      />

    </group>
  )
}