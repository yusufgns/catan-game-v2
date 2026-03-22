/**
 * Boat3D.tsx — Low-poly Catan trading vessel
 *
 * Hull is built from a custom BufferGeometry using "rib" cross-sections
 * that taper from wide midship toward narrow bow and stern — matching the
 * reference screenshots exactly.
 *
 * Usage:
 *   <Boat3D position={[0,0,0]}>
 *     <CargoOre3D />
 *   </Boat3D>
 */
import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

// ── helpers ───────────────────────────────────────────────
function dk(hex: string, f: number): string {
  const h = hex.replace('#', '')
  return '#' + [0, 2, 4].map(i =>
    Math.round(parseInt(h.slice(i, i + 2), 16) * (1 - f))
      .toString(16).padStart(2, '0')
  ).join('')
}
function lk(hex: string, f: number): string {
  const h = hex.replace('#', '')
  return '#' + [0, 2, 4].map(i => {
    const v = parseInt(h.slice(i, i + 2), 16)
    return Math.round(v + (255 - v) * f).toString(16).padStart(2, '0')
  }).join('')
}

// ── types ─────────────────────────────────────────────────
export interface Boat3DProps {
  /** Hull color. Default dark maroon-brown. */
  color?: string
  /** Sail color. Default off-white linen. */
  sailColor?: string
  /** Sail stripe / flag color. Default red. */
  stripeColor?: string
  scale?: number | [number, number, number]
  position?: [number, number, number]
  rotationY?: number
  shadows?: boolean
  /** Bob on water. Default true. */
  animated?: boolean
  /** Cargo items (CargoWheat3D, CargoOre3D, …) */
  children?: React.ReactNode
}

// ── rib data ──────────────────────────────────────────────
// Each rib: [z,  topHW,  botHW,  deckY,  keelY]
//   topHW  = half-width at deck level
//   botHW  = half-width at keel (narrower = trapezoidal cross-section)
//   deckY  = Y of top edge
//   keelY  = Y of bottom edge
// Z is the length axis:  −Z = stern (back),  +Z = bow (front)
const RIBS: readonly [number, number, number, number, number][] = [
  [-1.88, 0.36, 0.11, 0.44, -0.06],  // stern
  [-1.48, 0.65, 0.22, 0.53, -0.11],
  [-0.92, 0.82, 0.32, 0.56, -0.14],
  [-0.22, 0.86, 0.35, 0.57, -0.15],  // widest
  [ 0.48, 0.84, 0.34, 0.57, -0.15],
  [ 1.10, 0.70, 0.26, 0.54, -0.12],
  [ 1.52, 0.46, 0.16, 0.49, -0.07],
  [ 1.78, 0.18, 0.07, 0.42, -0.02],
  [ 1.92, 0.03, 0.02, 0.33,  0.00],  // bow tip
] as const

/** Interpolate topHalfWidth at arbitrary Z */
function ribWidthAt(z: number): number {
  for (let i = 0; i < RIBS.length - 1; i++) {
    const [z0, tw0] = RIBS[i]
    const [z1, tw1] = RIBS[i + 1]
    if (z >= z0 && z <= z1) {
      const t = (z - z0) / (z1 - z0)
      return tw0 + t * (tw1 - tw0)
    }
  }
  return 0
}

// ── hull geometry builder ─────────────────────────────────
function buildHullGeo(): THREE.BufferGeometry {
  // Each rib contributes 4 vertices: TL, TR, BR, BL
  //   TL = (-topHW, deckY, z)   TR = (+topHW, deckY, z)
  //   BR = (+botHW, keelY, z)   BL = (-botHW, keelY, z)
  const verts: number[] = []
  const idx: number[] = []
  const N = RIBS.length

  for (const [z, tw, bw, ty, by] of RIBS) {
    verts.push(-tw, ty, z)   // i*4+0  TL
    verts.push( tw, ty, z)   // i*4+1  TR
    verts.push( bw, by, z)   // i*4+2  BR
    verts.push(-bw, by, z)   // i*4+3  BL
  }

  for (let i = 0; i < N - 1; i++) {
    const a = i * 4, b = (i + 1) * 4

    // PORT  (left/−X, normal → −X)
    idx.push(a, b, b + 3);  idx.push(a, b + 3, a + 3)

    // STARBOARD (right/+X, normal → +X)
    idx.push(a + 1, b + 1, b + 2);  idx.push(a + 1, b + 2, a + 2)

    // KEEL  (bottom/−Y, normal → −Y)
    idx.push(a + 3, a + 2, b + 2);  idx.push(a + 3, b + 2, b + 3)

    // DECK  (top/+Y, normal → +Y)
    idx.push(a, b, a + 1);  idx.push(b, b + 1, a + 1)
  }

  // STERN CAP (faces −Z)
  idx.push(0, 2, 3);  idx.push(0, 1, 2)

  // BOW CAP (faces +Z)
  const L = (N - 1) * 4
  idx.push(L, L + 2, L + 1);  idx.push(L, L + 3, L + 2)

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

// ── component ─────────────────────────────────────────────
export const Boat3D: React.FC<Boat3DProps> = ({
  color       = '#6B3015',
  sailColor   = '#F0E8D8',
  stripeColor = '#B91C1C',
  scale       = 1,
  position    = [0, 0, 0],
  rotationY   = 0,
  shadows     = true,
  animated    = true,
  children,
}) => {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (animated && groupRef.current) {
      const t = clock.getElapsedTime()
      groupRef.current.position.y = Math.sin(t * 0.55) * 0.055
      groupRef.current.rotation.z = Math.sin(t * 0.75) * 0.022
      groupRef.current.rotation.x = Math.sin(t * 0.45) * 0.012
    }
  })

  const hullGeo  = useMemo(buildHullGeo, [])
  const scaleArr = Array.isArray(scale)
    ? scale as [number, number, number]
    : [scale, scale, scale] as [number, number, number]

  // palette
  const HUL  = color
  const HUL_D = dk(color, 0.28)
  const HUL_L = lk(color, 0.22)
  const DECK  = lk(color, 0.35)
  const DECK_D = dk(DECK, 0.12)
  const ROPE  = '#A07840'
  const METAL = '#6B7280'

  // deck Y — matches RIBS widest rib
  const DECK_Y = 0.57

  // thwart Z positions (cross-planks) and their widths
  const thwarts: [number, number][] = [
    [-1.40, ribWidthAt(-1.40)],
    [-0.80, ribWidthAt(-0.80)],
    [-0.18, ribWidthAt(-0.18)],
    [ 0.48, ribWidthAt( 0.48)],
    [ 1.10, ribWidthAt( 1.10)],
    [ 1.48, ribWidthAt( 1.48)],
  ]

  const S = shadows

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scaleArr}>
      <group ref={groupRef}>

        {/* ══════════════════════════════════════════════════
            HULL  — custom tapered BufferGeometry
        ══════════════════════════════════════════════════ */}
        <mesh geometry={hullGeo} castShadow={S} receiveShadow={S}>
          <meshStandardMaterial color={HUL} roughness={0.82} flatShading />
        </mesh>

        {/* Keel strip — runs along the bottom spine */}
        <mesh position={[0, -0.16, 0]} castShadow={S}>
          <boxGeometry args={[0.10, 0.08, 3.60]} />
          <meshStandardMaterial color={HUL_D} roughness={0.88} />
        </mesh>

        {/* Gunwale caps — dark strip along each deck edge */}
        {([-1, 1] as const).map(side => (
          <mesh key={side} position={[side * 0.80, DECK_Y + 0.014, -0.10]}>
            <boxGeometry args={[0.060, 0.030, 3.50]} />
            <meshStandardMaterial color={HUL_D} roughness={0.85} />
          </mesh>
        ))}

        {/* ══════════════════════════════════════════════════
            DECK THWARTS — cross-planks (port to starboard)
        ══════════════════════════════════════════════════ */}
        {thwarts.map(([z, hw], i) => (
          <React.Fragment key={i}>
            {/* Main thwart */}
            <mesh position={[0, DECK_Y + 0.016, z]} castShadow={S}>
              <boxGeometry args={[hw * 1.80, 0.032, 0.115]} />
              <meshStandardMaterial color={i % 2 === 0 ? DECK : HUL_L} roughness={0.84} />
            </mesh>
            {/* Plank line grooves between thwarts */}
            {i < thwarts.length - 1 && (
              <mesh position={[0, DECK_Y + 0.004, (z + thwarts[i + 1][0]) / 2]}>
                <boxGeometry args={[
                  (ribWidthAt((z + thwarts[i + 1][0]) / 2)) * 1.75,
                  0.014,
                  Math.abs(thwarts[i + 1][0] - z) * 0.86,
                ]} />
                <meshStandardMaterial color={DECK} roughness={0.82} />
              </mesh>
            )}
          </React.Fragment>
        ))}

        {/* ══════════════════════════════════════════════════
            STERN CASTLE — raised platform at the back
        ══════════════════════════════════════════════════ */}
        {/* Platform floor */}
        <mesh position={[0, DECK_Y + 0.10, -1.60]} castShadow={S}>
          <boxGeometry args={[1.10, 0.090, 0.60]} />
          <meshStandardMaterial color={HUL_D} roughness={0.85} />
        </mesh>
        {/* Step riser */}
        <mesh position={[0, DECK_Y + 0.046, -1.30]}>
          <boxGeometry args={[1.10, 0.020, 0.08]} />
          <meshStandardMaterial color={HUL_D} roughness={0.88} />
        </mesh>
        {/* Stern post */}
        <mesh position={[0, DECK_Y + 0.55, -1.82]} castShadow={S}>
          <cylinderGeometry args={[0.055, 0.075, 0.90, 8]} />
          <meshStandardMaterial color={HUL_D} roughness={0.80} />
        </mesh>
        {/* Stern post ball */}
        <mesh position={[0, DECK_Y + 1.02, -1.82]}>
          <sphereGeometry args={[0.085, 8, 8]} />
          <meshStandardMaterial color={METAL} roughness={0.40} metalness={0.55} />
        </mesh>

        {/* ══════════════════════════════════════════════════
            BOW POST
        ══════════════════════════════════════════════════ */}
        <mesh position={[0, DECK_Y + 0.42, 1.78]} castShadow={S}>
          <cylinderGeometry args={[0.045, 0.065, 0.72, 8]} />
          <meshStandardMaterial color={HUL_D} roughness={0.80} />
        </mesh>
        <mesh position={[0, DECK_Y + 0.82, 1.78]}>
          <sphereGeometry args={[0.070, 8, 8]} />
          <meshStandardMaterial color={METAL} roughness={0.40} metalness={0.55} />
        </mesh>

        {/* ══════════════════════════════════════════════════
            SIDE RAILINGS
        ══════════════════════════════════════════════════ */}
        {([-1, 1] as const).map(side => (
          <group key={side}>
            {/* Rail posts */}
            {([-1.20, -0.60, 0.00, 0.60, 1.20] as const).map((z, j) => (
              <mesh key={j} position={[side * ribWidthAt(z) * 0.90, DECK_Y + 0.18, z]}>
                <boxGeometry args={[0.038, 0.32, 0.038]} />
                <meshStandardMaterial color={HUL_D} roughness={0.82} />
              </mesh>
            ))}
            {/* Rail beam */}
            <mesh position={[side * 0.72, DECK_Y + 0.34, -0.14]}>
              <boxGeometry args={[0.038, 0.038, 2.55]} />
              <meshStandardMaterial color={HUL_D} roughness={0.80} />
            </mesh>
          </group>
        ))}

        {/* ══════════════════════════════════════════════════
            MAST
        ══════════════════════════════════════════════════ */}
        <mesh position={[0, DECK_Y + 1.40, 0.10]} castShadow={S}>
          <cylinderGeometry args={[0.048, 0.072, 2.70, 8]} />
          <meshStandardMaterial color={HUL_D} roughness={0.78} />
        </mesh>
        {/* Mast top ball */}
        <mesh position={[0, DECK_Y + 2.78, 0.10]}>
          <sphereGeometry args={[0.075, 8, 8]} />
          <meshStandardMaterial color={METAL} roughness={0.35} metalness={0.55} />
        </mesh>

        {/* YARD ARM (horizontal spar) */}
        <mesh position={[0, DECK_Y + 2.35, 0.10]} rotation={[0, 0, Math.PI / 2]} castShadow={S}>
          <cylinderGeometry args={[0.030, 0.040, 1.90, 6]} />
          <meshStandardMaterial color={HUL_D} roughness={0.78} />
        </mesh>

        {/* BOOM (lower spar, angled slightly) */}
        <mesh position={[0, DECK_Y + 0.68, 0.42]} rotation={[0.18, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.035, 1.30, 6]} />
          <meshStandardMaterial color={HUL_D} roughness={0.80} />
        </mesh>

        {/* ══════════════════════════════════════════════════
            SAIL
        ══════════════════════════════════════════════════ */}
        {/* Main sail body */}
        <mesh position={[0, DECK_Y + 1.50, 0.26]}>
          <boxGeometry args={[0.038, 1.70, 1.00]} />
          <meshStandardMaterial color={sailColor} roughness={0.92} side={THREE.DoubleSide} />
        </mesh>
        {/* Horizontal stripe — upper */}
        <mesh position={[0, DECK_Y + 1.98, 0.27]}>
          <boxGeometry args={[0.040, 0.210, 0.98]} />
          <meshStandardMaterial color={stripeColor} roughness={0.88} side={THREE.DoubleSide} />
        </mesh>
        {/* Horizontal stripe — lower */}
        <mesh position={[0, DECK_Y + 1.02, 0.27]}>
          <boxGeometry args={[0.040, 0.210, 0.98]} />
          <meshStandardMaterial color={stripeColor} roughness={0.88} side={THREE.DoubleSide} />
        </mesh>

        {/* ══════════════════════════════════════════════════
            RIGGING ROPES (stays)
        ══════════════════════════════════════════════════ */}
        {/* Forestay — mast top to bow */}
        <mesh position={[0, DECK_Y + 1.85, 1.02]} rotation={[0.72, 0, 0]}>
          <cylinderGeometry args={[0.014, 0.014, 2.40, 4]} />
          <meshStandardMaterial color={ROPE} roughness={0.90} />
        </mesh>
        {/* Backstay — mast top to stern */}
        <mesh position={[0, DECK_Y + 1.85, -0.88]} rotation={[-0.62, 0, 0]}>
          <cylinderGeometry args={[0.014, 0.014, 2.10, 4]} />
          <meshStandardMaterial color={ROPE} roughness={0.90} />
        </mesh>
        {/* Shroud port */}
        <mesh position={[-0.38, DECK_Y + 1.55, 0.10]} rotation={[0, 0, 0.48]}>
          <cylinderGeometry args={[0.010, 0.010, 2.20, 4]} />
          <meshStandardMaterial color={ROPE} roughness={0.90} />
        </mesh>
        {/* Shroud starboard */}
        <mesh position={[ 0.38, DECK_Y + 1.55, 0.10]} rotation={[0, 0, -0.48]}>
          <cylinderGeometry args={[0.010, 0.010, 2.20, 4]} />
          <meshStandardMaterial color={ROPE} roughness={0.90} />
        </mesh>

        {/* Flag pennant on mast tip */}
        <mesh position={[0.14, DECK_Y + 2.70, 0.12]}>
          <planeGeometry args={[0.32, 0.18]} />
          <meshStandardMaterial color={stripeColor} roughness={0.80} side={THREE.DoubleSide} />
        </mesh>

        {/* ══════════════════════════════════════════════════
            CARGO HOLD  — children go here (deck level)
        ══════════════════════════════════════════════════ */}
        <group position={[0, DECK_Y + 0.04, 0]}>
          {children}
        </group>

      </group>
    </group>
  )
}

export default Boat3D