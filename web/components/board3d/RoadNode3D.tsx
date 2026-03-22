import { useMemo } from 'react'
import * as THREE from 'three'

export interface RoadNodeProps {
  playerColor?: string
  connectionAngles?: number[]
  /** If true, render platform in stone/neutral color (intersection still claimable) */
  neutral?: boolean
  scale?: number | [number, number, number]
  position?: [number, number, number]
  rotationY?: number
  shadows?: boolean
}

const FH  = 0.26
const PH  = 0.18
const PW  = 0.62
const CW  = 0.30
const R   = 0.52
const CR  = 0.26
const PLY = FH + PH / 2 + 0.005
const BOLT_Y = FH + 0.035
const ARM_L = 0.22

export default function RoadNode3D({
  playerColor    = '#EA580C',
  connectionAngles = [],
  neutral        = false,
  scale          = 1,
  position       = [0, 0, 0],
  rotationY      = 0,
  shadows        = true,
}: RoadNodeProps) {

  const C_PLANK  = '#e0cfa0'
  const C_STONE  = '#8a9ab0'
  const C_STONE2 = '#6a7a90'
  const C_BOLT   = '#4a5a6a'

  const baseColor  = neutral ? C_STONE : playerColor
  const frameMat   = useMemo(() => new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.75 }), [baseColor])
  const frameDkMat = useMemo(() => {
    const c = new THREE.Color(baseColor).multiplyScalar(0.70)
    return new THREE.MeshStandardMaterial({ color: c, roughness: 0.80 })
  }, [baseColor])
  const plankMat   = useMemo(() => new THREE.MeshStandardMaterial({ color: C_PLANK, roughness: 0.82 }), [])
  const stoneMat   = useMemo(() => new THREE.MeshStandardMaterial({ color: C_STONE, roughness: 0.90 }), [])
  const stoneDkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: C_STONE2, roughness: 0.92 }), [])
  const boltMat    = useMemo(() => new THREE.MeshStandardMaterial({ color: C_BOLT, roughness: 0.50, metalness: 0.40 }), [])

  const scaleArr: [number, number, number] = Array.isArray(scale)
    ? scale as [number, number, number]
    : [scale as number, scale as number, scale as number]

  const boltAngles = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2)

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scaleArr}>

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

      {/* Plank ring */}
      <mesh position={[0, PLY, 0]} castShadow={shadows} receiveShadow={shadows}>
        <cylinderGeometry args={[R - 0.02, R - 0.02, PH, 10]} />
        <primitive object={plankMat} attach="material" />
      </mesh>

      {/* Plank ring dividers */}
      {[0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4].map((a, i) => (
        <mesh key={i} position={[0, FH + PH + 0.008, 0]} rotation={[0, a, 0]}>
          <boxGeometry args={[(R - 0.02) * 2, 0.014, 0.035]} />
          <primitive object={stoneDkMat} attach="material" />
        </mesh>
      ))}

      {/* Centre stone disc */}
      <mesh position={[0, FH + PH + 0.012, 0]} castShadow={shadows}>
        <cylinderGeometry args={[CR, CR + 0.02, PH * 0.55, 12]} />
        <primitive object={stoneDkMat} attach="material" />
      </mesh>
      <mesh position={[0, FH + PH + PH * 0.28 + 0.012, 0]}>
        <cylinderGeometry args={[CR, CR, 0.012, 12]} />
        <primitive object={stoneMat} attach="material" />
      </mesh>

      {/* Bolt posts */}
      {boltAngles.map((a, i) => (
        <mesh key={i} position={[Math.sin(a) * (R - 0.06), BOLT_Y, Math.cos(a) * (R - 0.06)]}>
          <cylinderGeometry args={[0.045, 0.045, 0.048, 7]} />
          <primitive object={boltMat} attach="material" />
        </mesh>
      ))}

      {/* Stub arms toward each road */}
      {connectionAngles.map((deg, i) => {
        const rad = (deg * Math.PI) / 180
        return (
          <group key={i} rotation={[0, rad, 0]}>
            {/* Plank strip */}
            <mesh position={[0, PLY, R + ARM_L / 2]} castShadow={shadows}>
              <boxGeometry args={[PW, PH, ARM_L + 0.04]} />
              <primitive object={plankMat} attach="material" />
            </mesh>
            {/* Frame strip */}
            <mesh position={[0, FH / 2, R + ARM_L / 2]}>
              <boxGeometry args={[PW + 0.08, FH, ARM_L + 0.04]} />
              <primitive object={frameMat} attach="material" />
            </mesh>
            {/* Stone cap */}
            <mesh position={[0, FH / 2, R + ARM_L + CW / 2]} castShadow={shadows}>
              <boxGeometry args={[PW + 0.28, FH + 0.02, CW + 0.02]} />
              <primitive object={stoneMat} attach="material" />
            </mesh>
            {/* Bolts on cap */}
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

export { RoadNode3D }
