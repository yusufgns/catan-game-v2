import React from 'react'

function dk(hex: string, f: number): string {
  const h = hex.replace('#', '')
  return '#' + [0, 2, 4].map(i =>
    Math.round(parseInt(h.slice(i, i + 2), 16) * (1 - f))
      .toString(16).padStart(2, '0')
  ).join('')
}

export interface City3DProps {
  color?: string
  scale?: number | [number, number, number]
  position?: [number, number, number]
  rotationY?: number
  shadows?: boolean
}

function MerlonRing({
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

function Tower({
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
  battH: number; battR: number; merlonN: number; merlonSize?: [number, number, number]
  coneH: number; coneR: number
  doorZ: number; doorW: number; doorH: number
  slits: [number, number][]
  playerColor: string; stoneCol: string; stoneDk: string; dark: string
  shadows: boolean
}) {
  const BH     = 0.10
  const twrTop = BH + height
  const battTop = twrTop + battH

  return (
    <group position={[ox, 0, oz]}>
      {/* Foundation ring */}
      <mesh position={[0, BH / 2, 0]} castShadow={shadows} receiveShadow={shadows}>
        <cylinderGeometry args={[baseR * 0.92, baseR, BH, seg]} />
        <meshStandardMaterial color={stoneDk} roughness={0.95} />
      </mesh>

      {/* Tower body */}
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

      {/* Battlement ring */}
      <mesh position={[0, twrTop + battH / 2, 0]} castShadow={shadows}>
        <cylinderGeometry args={[battR, topR, battH, seg]} />
        <meshStandardMaterial color={stoneDk} roughness={0.90} />
      </mesh>

      {/* Merlons */}
      <MerlonRing
        n={merlonN} r={battR - 0.01} y={battTop + (merlonSize?.[1] ?? 0.20) / 2}
        size={merlonSize} color={playerColor} shadows={shadows}
      />

      {/* Conical roof */}
      <mesh position={[0, battTop + coneH / 2, 0]} castShadow={shadows}>
        <coneGeometry args={[coneR, coneH, seg]} />
        <meshStandardMaterial color={playerColor} roughness={0.62} />
      </mesh>

      {/* Door frame */}
      <mesh position={[0, BH + doorH / 2 + 0.04, doorZ]}>
        <boxGeometry args={[doorW + 0.10, doorH + 0.08, 0.05]} />
        <meshStandardMaterial color={playerColor} roughness={0.68} />
      </mesh>
      {/* Door opening */}
      <mesh position={[0, BH + doorH / 2 + 0.04, doorZ + 0.02]}>
        <boxGeometry args={[doorW, doorH, 0.05]} />
        <meshStandardMaterial color={dark} roughness={0.90} />
      </mesh>

      {/* Arrow slits */}
      {slits.map(([sy, sz], i) => (
        <mesh key={i} position={[0, sy, sz]}>
          <boxGeometry args={[0.07, 0.24, 0.05]} />
          <meshStandardMaterial color={dark} roughness={0.90} />
        </mesh>
      ))}
    </group>
  )
}

export default function City3D({
  color     = '#2563EB',
  scale     = 1,
  position  = [0, 0, 0],
  rotationY = 0,
  shadows   = true,
}: City3DProps) {
  const STONE   = '#a0aec0'
  const STONE_D = dk(STONE, 0.22)
  const DARK    = '#1c1917'

  const s: [number, number, number] = typeof scale === 'number'
    ? [scale, scale, scale]
    : scale

  const SOX    = 0.54
  const DISC_R = 0.72
  const DISC_X = SOX / 2

  const M_RB = 0.52, M_RT = 0.42, M_H = 1.62, M_SEG = 12
  const M_BATH = 0.22, M_BATR = M_RT + 0.09
  const M_CONH = 0.72
  const M_BH = 0.10, M_TOP = M_BH + M_H, M_BATT = M_TOP + M_BATH

  const S_RB = 0.26, S_RT = 0.20, S_H = 1.15, S_SEG = 9
  const S_BATH = 0.16, S_BATR = S_RT + 0.07
  const S_CONH = 0.50
  const S_BH = 0.10

  const ARCH_Y   = M_BH + M_H * 0.36
  const ARCH_R   = 0.11
  const ARCH_LEN = SOX - M_RB - S_RB + 0.32

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={s}>

      {/* Shared base disc */}
      <mesh position={[DISC_X, 0.05, 0]} castShadow={shadows} receiveShadow={shadows}>
        <cylinderGeometry args={[DISC_R, DISC_R + 0.08, 0.10, 14]} />
        <meshStandardMaterial color={STONE_D} roughness={0.95} />
      </mesh>

      {/* Main tower */}
      <Tower
        ox={0} oz={0}
        baseR={M_RB} topR={M_RT} height={M_H} seg={M_SEG}
        battH={M_BATH} battR={M_BATR} merlonN={8}
        merlonSize={[0.14, 0.22, 0.14]}
        coneH={M_CONH} coneR={0.36}
        doorZ={M_RB + 0.018} doorW={0.28} doorH={0.46}
        slits={[
          [M_BH + M_H * 0.60,  M_RT + 0.014],
          [M_BH + M_H * 0.60, -(M_RT + 0.014)],
        ]}
        playerColor={color}
        stoneCol={STONE} stoneDk={STONE_D} dark={DARK}
        shadows={shadows}
      />

      {/* Flag on main tower */}
      <mesh position={[0.08, M_BATT + M_CONH + 0.16, 0.05]}>
        <boxGeometry args={[0.18, 0.12, 0.016]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>

      {/* Connecting arch */}
      <mesh position={[SOX / 2, ARCH_Y + ARCH_R * 0.75, 0]}
        rotation={[0, 0, Math.PI / 2]} castShadow={shadows}>
        <cylinderGeometry args={[ARCH_R, ARCH_R, ARCH_LEN, 8]} />
        <meshStandardMaterial color={STONE_D} roughness={0.90} />
      </mesh>
      <mesh position={[SOX / 2, ARCH_Y - ARCH_R * 0.75, 0]}
        rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[ARCH_R * 0.72, ARCH_R * 0.72, ARCH_LEN, 8]} />
        <meshStandardMaterial color={STONE_D} roughness={0.92} />
      </mesh>

      {/* Secondary turret */}
      <Tower
        ox={SOX} oz={0}
        baseR={S_RB} topR={S_RT} height={S_H} seg={S_SEG}
        battH={S_BATH} battR={S_BATR} merlonN={5}
        merlonSize={[0.11, 0.17, 0.11]}
        coneH={S_CONH} coneR={0.22}
        doorZ={S_RB + 0.014} doorW={0.20} doorH={0.32}
        slits={[
          [S_BH + S_H * 0.62, S_RT + 0.013],
        ]}
        playerColor={color}
        stoneCol={STONE} stoneDk={STONE_D} dark={DARK}
        shadows={shadows}
      />

    </group>
  )
}

export { City3D }
