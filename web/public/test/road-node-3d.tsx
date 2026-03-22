import { useMemo } from 'react'
import * as THREE from 'three'

// ─── Types ────────────────────────────────────────────────────────────────────
/**
 * Catan hex-vertex connection angle reference (flat-top hex, pointy corners left/right):
 *
 *   3-way interior vertex:  [0, 120, 240]  or  [60, 180, 300]
 *   2-way border vertex:    any 2 of the above, e.g. [0, 120]  [60, 180]  [0, 300] …
 *   1-way dead-end:         [0]  (rare, only at map edge)
 *
 * Pass an empty array [] to render just the platform with no arms (preview/placeholder).
 */
export interface RoadNodeProps {
  /** Player colour — should match the Road3D colour */
  playerColor?: string
  /**
   * Y-rotation angles (degrees) for each road that connects to this node.
   * 0 = +Z direction.
   * Supports 0, 1, 2, or 3 connections — whatever the vertex needs.
   */
  connectionAngles?: number[]
  scale?: number | [number, number, number]
  position?: [number, number, number]
  rotationY?: number
  shadows?: boolean
}

// ─── Road dimension constants (must match Road3D) ─────────────────────────────
const FH  = 0.26   // frame height
const PH  = 0.18   // plank height
const PW  = 0.62   // plank width (inner)
const CW  = 0.30   // stone-cap width on roads
const R   = 0.52   // node outer radius  (≥ road half-width 0.44)
const CR  = 0.26   // centre stone disc radius
const PLY = FH + PH / 2 + 0.005          // plank vertical centre
const BOLT_Y = FH + 0.035                 // bolt Y (same as Road3D)
const ARM_L = 0.46  // stub arm length from node edge toward road

// ─── Component ───────────────────────────────────────────────────────────────
export default function RoadNode3D({
  playerColor    = '#EA580C',
  connectionAngles = [],
  scale          = 1,
  position       = [0, 0, 0],
  rotationY      = 0,
  shadows        = true,
}: RoadNodeProps) {

  const C_PLANK  = '#e0cfa0'
  const C_STONE  = '#8a9ab0'
  const C_STONE2 = '#6a7a90'
  const C_BOLT   = '#4a5a6a'

  const frameMat  = useMemo(() => new THREE.MeshStandardMaterial({ color: playerColor, roughness: 0.75 }), [playerColor])
  const frameDkMat= useMemo(() => {
    const c = new THREE.Color(playerColor).multiplyScalar(0.70)
    return new THREE.MeshStandardMaterial({ color: c, roughness: 0.80 })
  }, [playerColor])
  const plankMat  = useMemo(() => new THREE.MeshStandardMaterial({ color: C_PLANK, roughness: 0.82 }), [])
  const stoneMat  = useMemo(() => new THREE.MeshStandardMaterial({ color: C_STONE, roughness: 0.90 }), [])
  const stoneDkMat= useMemo(() => new THREE.MeshStandardMaterial({ color: C_STONE2, roughness: 0.92 }), [])
  const boltMat   = useMemo(() => new THREE.MeshStandardMaterial({ color: C_BOLT, roughness: 0.50, metalness: 0.40 }), [])

  const scaleArr: [number, number, number] = Array.isArray(scale)
    ? scale as [number, number, number]
    : [scale as number, scale as number, scale as number]

  // 8 bolt positions evenly around edge
  const boltAngles = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2)

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scaleArr}>

      {/* ══════════════════════════════════════
          PLATFORM BASE — player colour disc
      ══════════════════════════════════════ */}

      {/* Bottom bevel ring */}
      <mesh position={[0, FH * 0.12, 0]} receiveShadow={shadows}>
        <cylinderGeometry args={[R + 0.05, R + 0.06, FH * 0.24, 10]} />
        <primitive object={frameDkMat} attach="material" />
      </mesh>

      {/* Main frame disc */}
      <mesh position={[0, FH / 2, 0]} castShadow={shadows} receiveShadow={shadows}>
        <cylinderGeometry args={[R, R + 0.05, FH, 10]} />
        <primitive object={frameMat} attach="material" />
      </mesh>

      {/* ══════════════════════════════════════
          PLANK RING — same colour as road planks
      ══════════════════════════════════════ */}
      <mesh position={[0, PLY, 0]} castShadow={shadows} receiveShadow={shadows}>
        <cylinderGeometry args={[R - 0.02, R - 0.02, PH, 10]} />
        <primitive object={plankMat} attach="material" />
      </mesh>

      {/* Plank ring dividers (4 faint lines) */}
      {[0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4].map((a, i) => (
        <mesh key={i} position={[0, FH + PH + 0.008, 0]} rotation={[0, a, 0]}>
          <boxGeometry args={[(R - 0.02) * 2, 0.014, 0.035]} />
          <primitive object={stoneDkMat} attach="material" />
        </mesh>
      ))}

      {/* ══════════════════════════════════════
          CENTRE STONE DISC — different colour
      ══════════════════════════════════════ */}
      {/* Stone disc raised slightly above planks */}
      <mesh position={[0, FH + PH + 0.012, 0]} castShadow={shadows}>
        <cylinderGeometry args={[CR, CR + 0.02, PH * 0.55, 12]} />
        <primitive object={stoneDkMat} attach="material" />
      </mesh>
      {/* Stone top face */}
      <mesh position={[0, FH + PH + PH * 0.28 + 0.012, 0]}>
        <cylinderGeometry args={[CR, CR, 0.012, 12]} />
        <primitive object={stoneMat} attach="material" />
      </mesh>

      {/* ══════════════════════════════════════
          BOLT POSTS — same as Road3D ends
      ══════════════════════════════════════ */}
      {boltAngles.map((a, i) => (
        <mesh key={i} position={[Math.sin(a) * (R - 0.06), BOLT_Y, Math.cos(a) * (R - 0.06)]}>
          <cylinderGeometry args={[0.045, 0.045, 0.048, 7]} />
          <primitive object={boltMat} attach="material" />
        </mesh>
      ))}

      {/* ══════════════════════════════════════
          STUB ARMS — extends toward each road
          (same profile as road planks, centred on the connection angle)
      ══════════════════════════════════════ */}
      {connectionAngles.map((deg, i) => {
        const rad = (deg * Math.PI) / 180
        // Centre of stub arm is just outside the node edge
        const cx = Math.sin(rad) * (R + ARM_L / 2)
        const cz = Math.cos(rad) * (R + ARM_L / 2)
        return (
          <group key={i} rotation={[0, rad, 0]}>
            {/* Plank strip */}
            <mesh position={[0, PLY, R + ARM_L / 2]} castShadow={shadows}>
              <boxGeometry args={[PW, PH, ARM_L + 0.04]} />
              <primitive object={plankMat} attach="material" />
            </mesh>
            {/* Frame strip below plank */}
            <mesh position={[0, FH / 2, R + ARM_L / 2]}>
              <boxGeometry args={[PW + 0.08, FH, ARM_L + 0.04]} />
              <primitive object={frameMat} attach="material" />
            </mesh>
            {/* Stone cap at arm end (matches Road3D stone caps) */}
            <mesh position={[0, FH / 2, R + ARM_L + CW / 2]} castShadow={shadows}>
              <boxGeometry args={[PW + 0.28, FH + 0.02, CW + 0.02]} />
              <primitive object={stoneMat} attach="material" />
            </mesh>
            {/* Bolt on stone cap */}
            {[-PW / 2 + 0.14, PW / 2 - 0.14].map((bx, bi) => (
              <mesh key={bi} position={[bx, BOLT_Y, R + ARM_L + CW / 2]}>
                <cylinderGeometry args={[0.045, 0.045, 0.048, 7]} />
                <primitive object={boltMat} attach="material" />
              </mesh>
            ))}
          </group>
        )
      })}

    </group>
  )
}