import { useMemo } from 'react'
import * as THREE from 'three'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Settlement3DProps {
  color?: string   // player colour
  scale?: number | [number, number, number]
  position?: [number, number, number]
  rotationY?: number
  shadows?: boolean
}

// ─── Geometry constants ───────────────────────────────────────────────────────
const BASE_H  = 0.10   // stone foundation ring height
const BASE_RO = 0.58   // foundation outer radius
const BASE_RI = 0.52   // foundation inner radius (matches tower bottom)

const TWR_RB  = 0.44   // tower radius at bottom
const TWR_RT  = 0.34   // tower radius at top (taper)
const TWR_H   = 1.15   // tower cylinder height
const TWR_SEG = 10     // cylinder segments

const BATT_H  = 0.20   // battlement ring height
const BATT_RO = TWR_RT + 0.08  // battlement outer radius (slight flare)

const MERLON_N = 6     // number of merlons
const MERLON_R = TWR_RT + 0.05 // merlon centre radius
const MERLON_H = 0.18  // merlon block height
const MERLON_W = 0.11  // merlon block width

const CONE_R   = 0.30  // cone base radius
const CONE_H   = 0.58  // cone height

const TWRT_Y   = BASE_H + TWR_H           // top of tower cylinder
const BATT_Y   = TWRT_Y + BATT_H         // top of battlement ring
const DOOR_Z   = TWR_RB + 0.012          // door protrusion Z

// ─── Component ───────────────────────────────────────────────────────────────
export default function Settlement3D({
  color    = '#DC2626',
  scale    = 1,
  position = [0, 0, 0],
  rotationY = 0,
  shadows  = true,
}: Settlement3DProps) {

  const C_STONE   = '#a8b4c4'
  const C_STONE_D = '#78899a'
  const C_DARK    = '#1c1917'

  const stoneMat   = useMemo(() => new THREE.MeshStandardMaterial({ color: C_STONE,   roughness: 0.88 }), [])
  const stoneDkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: C_STONE_D, roughness: 0.92 }), [])
  const colorMat   = useMemo(() => new THREE.MeshStandardMaterial({ color,            roughness: 0.65 }), [color])
  const darkMat    = useMemo(() => new THREE.MeshStandardMaterial({ color: C_DARK,    roughness: 0.90 }), [])

  const scaleArr: [number, number, number] = Array.isArray(scale)
    ? scale as [number, number, number]
    : [scale as number, scale as number, scale as number]

  // Merlon positions
  const merlons = Array.from({ length: MERLON_N }, (_, i) => {
    const a = (i / MERLON_N) * Math.PI * 2
    return { x: Math.sin(a) * MERLON_R, z: Math.cos(a) * MERLON_R }
  })

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scaleArr}>

      {/* ── Foundation ring ── */}
      <mesh position={[0, BASE_H / 2, 0]} castShadow={shadows} receiveShadow={shadows}>
        <cylinderGeometry args={[BASE_RI, BASE_RO, BASE_H, 12]} />
        <primitive object={stoneDkMat} attach="material" />
      </mesh>

      {/* ── Main tower body (tapered cylinder) ── */}
      <mesh position={[0, BASE_H + TWR_H / 2, 0]} castShadow={shadows} receiveShadow={shadows}>
        <cylinderGeometry args={[TWR_RT, TWR_RB, TWR_H, TWR_SEG]} />
        <primitive object={stoneMat} attach="material" />
      </mesh>

      {/* ── Horizontal stone band (mid tower detail) ── */}
      <mesh position={[0, BASE_H + TWR_H * 0.55, 0]}>
        <cylinderGeometry args={[TWR_RB * 0.78 + 0.02, TWR_RB * 0.78, 0.06, TWR_SEG]} />
        <primitive object={stoneDkMat} attach="material" />
      </mesh>

      {/* ── Battlement ring (slight outward flare) ── */}
      <mesh position={[0, TWRT_Y + BATT_H / 2, 0]} castShadow={shadows}>
        <cylinderGeometry args={[BATT_RO, TWR_RT, BATT_H, TWR_SEG]} />
        <primitive object={stoneDkMat} attach="material" />
      </mesh>

      {/* ── Merlons in player colour ── */}
      {merlons.map(({ x, z }, i) => (
        <mesh key={i}
          position={[x, BATT_Y + MERLON_H / 2, z]}
          castShadow={shadows}>
          <boxGeometry args={[MERLON_W, MERLON_H, MERLON_W]} />
          <primitive object={colorMat} attach="material" />
        </mesh>
      ))}

      {/* ── Conical roof in player colour ── */}
      <mesh position={[0, BATT_Y + CONE_H / 2, 0]} castShadow={shadows}>
        <coneGeometry args={[CONE_R, CONE_H, TWR_SEG]} />
        <primitive object={colorMat} attach="material" />
      </mesh>

      {/* ── Door frame (player colour, protrudes from wall) ── */}
      <mesh position={[0, BASE_H + 0.28, DOOR_Z]}>
        <boxGeometry args={[0.24, 0.40, 0.045]} />
        <primitive object={colorMat} attach="material" />
      </mesh>
      {/* Door opening */}
      <mesh position={[0, BASE_H + 0.22, DOOR_Z + 0.02]}>
        <boxGeometry args={[0.15, 0.30, 0.045]} />
        <primitive object={darkMat} attach="material" />
      </mesh>

      {/* ── Arrow-slit windows (2) ── */}
      <mesh position={[ 0.16, BASE_H + TWR_H * 0.68, TWR_RT + 0.012]}>
        <boxGeometry args={[0.07, 0.22, 0.045]} />
        <primitive object={darkMat} attach="material" />
      </mesh>
      <mesh position={[-0.16, BASE_H + TWR_H * 0.68, TWR_RT + 0.012]}>
        <boxGeometry args={[0.07, 0.22, 0.045]} />
        <primitive object={darkMat} attach="material" />
      </mesh>

      {/* ── Corner flag pennant on cone tip ── */}
      <mesh position={[0.06, BATT_Y + CONE_H + 0.14, 0.04]}>
        <boxGeometry args={[0.14, 0.10, 0.015]} />
        <primitive object={colorMat} attach="material" />
      </mesh>

    </group>
  )
}