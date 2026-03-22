import { useMemo } from 'react'
import * as THREE from 'three'

// ─── Types ────────────────────────────────────────────────────────────────────
export type HarborType = 'generic' | 'brick' | 'lumber' | 'ore' | 'grain' | 'wool'

export interface Harbor3DProps {
  harborType?: HarborType
  scale?: number | [number, number, number]
  position?: [number, number, number]
  rotationY?: number
  shadows?: boolean
}



// ─── Dock ─────────────────────────────────────────────────────────────────────
function Dock({ shadows }: { shadows: boolean }) {
  const woodDark = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.95 }), [])
  const plankMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.88 }), [])

  const DOCK_L = 3.2    // total length (Z axis, extends out)
  const DOCK_W = 0.82   // width (X axis)
  const PH = 0.055      // plank height
  const WATER_Y = -0.52 // bottom of pillars

  // Plank Z positions
  const plankZs: number[] = []
  for (let z = -DOCK_L / 2 + 0.10; z <= DOCK_L / 2 - 0.06; z += 0.165) {
    plankZs.push(parseFloat(z.toFixed(4)))
  }
  const railZs = plankZs.filter((_, i) => i % 3 === 0)

  return (
    <group>

      {/* ── Deck planks (span the width) ── */}
      {plankZs.map((z, i) => (
        <mesh key={i} position={[0, 0, z]} castShadow={shadows} receiveShadow={shadows}>
          <boxGeometry args={[DOCK_W, PH, 0.13]} />
          <primitive object={plankMat} attach="material" />
        </mesh>
      ))}

      {/* ── Longeron stringers underneath ── */}
      {[-0.28, 0.28].map((x, i) => (
        <mesh key={i} position={[x, -PH / 2 - 0.042, 0]} castShadow={shadows}>
          <boxGeometry args={[0.08, 0.07, DOCK_L - 0.08]} />
          <primitive object={woodDark} attach="material" />
        </mesh>
      ))}

      {/* ── Support pillars ── */}
      {[-DOCK_L / 2 + 0.32, 0, DOCK_L / 2 - 0.32].map((z) =>
        [-0.28, 0.28].map((x, j) => {
          const h = Math.abs(WATER_Y) + PH / 2
          return (
            <mesh key={`${z}-${j}`} position={[x, WATER_Y / 2 - PH / 4, z]} castShadow={shadows}>
              <cylinderGeometry args={[0.04, 0.052, h, 6]} />
              <primitive object={woodDark} attach="material" />
            </mesh>
          )
        })
      )}

      {/* ── Cross-bracing ── */}
      {[-DOCK_L / 2 + 0.32, 0, DOCK_L / 2 - 0.32].map((z, i) => (
        <mesh key={i} position={[0, WATER_Y * 0.45, z]}>
          <boxGeometry args={[DOCK_W - 0.08, 0.038, 0.048]} />
          <primitive object={woodDark} attach="material" />
        </mesh>
      ))}

      {/* ── Railing posts ── */}
      {railZs.map((z, i) => (
        <group key={i}>
          {[-DOCK_W / 2 + 0.05, DOCK_W / 2 - 0.05].map((x, j) => (
            <mesh key={j} position={[x, PH / 2 + 0.18, z]}>
              <cylinderGeometry args={[0.024, 0.024, 0.38, 5]} />
              <primitive object={woodDark} attach="material" />
            </mesh>
          ))}
        </group>
      ))}

      {/* ── Railing top rails ── */}
      {[-DOCK_W / 2 + 0.05, DOCK_W / 2 - 0.05].map((x, i) => (
        <mesh key={i} position={[x, PH / 2 + 0.38, 0]}>
          <boxGeometry args={[0.034, 0.038, DOCK_L - 0.12]} />
          <primitive object={woodDark} attach="material" />
        </mesh>
      ))}

      {/* ── Mooring bollards at outer end ── */}
      {[-0.22, 0.22].map((x, i) => (
        <group key={i} position={[x, PH / 2, DOCK_L / 2 - 0.06]}>
          <mesh>
            <cylinderGeometry args={[0.042, 0.042, 0.18, 7]} />
            <primitive object={woodDark} attach="material" />
          </mesh>
          <mesh position={[0, 0.11, 0]}>
            <cylinderGeometry args={[0.060, 0.060, 0.045, 7]} />
            <primitive object={woodDark} attach="material" />
          </mesh>
        </group>
      ))}

    </group>
  )
}


// ─── Main Component ───────────────────────────────────────────────────────────
export default function Harbor3D({
  harborType: _harborType = 'generic',
  scale = 1,
  position = [0, 0, 0],
  rotationY = 0,
  shadows = true,
}: Harbor3DProps) {
  const scaleArr: [number, number, number] = Array.isArray(scale)
    ? (scale as [number, number, number])
    : [scale as number, scale as number, scale as number]

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scaleArr}>
      <Dock shadows={shadows} />
    </group>
  )
}
