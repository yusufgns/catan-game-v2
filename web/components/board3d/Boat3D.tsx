import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'

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

export interface Boat3DProps {
  color?: string
  sailColor?: string
  stripeColor?: string
  scale?: number | [number, number, number]
  position?: [number, number, number]
  rotationY?: number
  shadows?: boolean
  animated?: boolean
  children?: React.ReactNode
  /** Harbor trade ratio shown on the sail */
  harborType?: '2:1' | '3:1'
  /** Harbor resource name (lumber, brick, wool, grain, ore) — undefined = generic */
  harborResource?: string
}

const RIBS: readonly [number, number, number, number, number][] = [
  [-1.88, 0.36, 0.11, 0.44, -0.06],
  [-1.48, 0.65, 0.22, 0.53, -0.11],
  [-0.92, 0.82, 0.32, 0.56, -0.14],
  [-0.22, 0.86, 0.35, 0.57, -0.15],
  [ 0.48, 0.84, 0.34, 0.57, -0.15],
  [ 1.10, 0.70, 0.26, 0.54, -0.12],
  [ 1.52, 0.46, 0.16, 0.49, -0.07],
  [ 1.78, 0.18, 0.07, 0.42, -0.02],
  [ 1.92, 0.03, 0.02, 0.33,  0.00],
] as const

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

function buildHullGeo(): THREE.BufferGeometry {
  const verts: number[] = []
  const idx: number[] = []
  const N = RIBS.length

  for (const [z, tw, bw, ty, by] of RIBS) {
    verts.push(-tw, ty, z)
    verts.push( tw, ty, z)
    verts.push( bw, by, z)
    verts.push(-bw, by, z)
  }

  for (let i = 0; i < N - 1; i++) {
    const a = i * 4, b = (i + 1) * 4
    idx.push(a, b, b + 3);  idx.push(a, b + 3, a + 3)
    idx.push(a + 1, b + 1, b + 2);  idx.push(a + 1, b + 2, a + 2)
    idx.push(a + 3, a + 2, b + 2);  idx.push(a + 3, b + 2, b + 3)
    idx.push(a, b, a + 1);  idx.push(b, b + 1, a + 1)
  }

  idx.push(0, 2, 3);  idx.push(0, 1, 2)
  const L = (N - 1) * 4
  idx.push(L, L + 2, L + 1);  idx.push(L, L + 3, L + 2)

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

export const Boat3D: React.FC<Boat3DProps> = ({
  color         = '#6B3015',
  sailColor     = '#F0E8D8',
  stripeColor   = '#B91C1C',
  scale         = 1,
  position      = [0, 0, 0],
  rotationY     = 0,
  shadows       = true,
  animated      = true,
  children,
  harborType,
  harborResource,
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

  const sailTexture = useMemo(() => {
    const W = 512, H = 512
    const canvas = document.createElement('canvas')
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')!

    // Transparent base
    ctx.clearRect(0, 0, W, H)

    if (!harborType) return new THREE.CanvasTexture(canvas)

    const FULL: Record<string, string> = {
      lumber: 'LUMBER', brick: 'BRICK', wool: 'WOOL', grain: 'GRAIN', ore: 'ORE',
    }
    const label = harborResource ? (FULL[harborResource] ?? harborResource.toUpperCase()) : 'ANY'

    const BX = 24, BY = 24, BW = W - 48, BH = H - 80, R = 36
    const tailH = 44, tailW = 48

    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = 18
    ctx.shadowOffsetY = 6

    // Bubble body
    ctx.fillStyle = 'rgba(255,255,255,0.93)'
    ctx.beginPath()
    ctx.moveTo(BX + R, BY)
    ctx.lineTo(BX + BW - R, BY)
    ctx.quadraticCurveTo(BX + BW, BY, BX + BW, BY + R)
    ctx.lineTo(BX + BW, BY + BH - R)
    ctx.quadraticCurveTo(BX + BW, BY + BH, BX + BW - R, BY + BH)
    ctx.lineTo(BX + BW / 2 + tailW / 2, BY + BH)
    ctx.lineTo(BX + BW / 2, BY + BH + tailH)   // tail tip
    ctx.lineTo(BX + BW / 2 - tailW / 2, BY + BH)
    ctx.lineTo(BX + R, BY + BH)
    ctx.quadraticCurveTo(BX, BY + BH, BX, BY + BH - R)
    ctx.lineTo(BX, BY + R)
    ctx.quadraticCurveTo(BX, BY, BX + R, BY)
    ctx.closePath()
    ctx.fill()

    // Border
    ctx.shadowColor = 'transparent'
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'
    ctx.lineWidth = 4
    ctx.stroke()

    // Resource label — auto-fit font size
    ctx.fillStyle = '#111'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const maxW = BW - 24
    let fontSize = 108
    ctx.font = `900 ${fontSize}px Arial Black, Arial, sans-serif`
    while (ctx.measureText(label).width > maxW && fontSize > 48) {
      fontSize -= 6
      ctx.font = `900 ${fontSize}px Arial Black, Arial, sans-serif`
    }
    ctx.fillText(label, W / 2, BY + BH * 0.40)

    // Ratio
    ctx.font = `bold 84px Arial, sans-serif`
    ctx.fillStyle = '#333'
    ctx.fillText(harborType, W / 2, BY + BH * 0.75)

    return new THREE.CanvasTexture(canvas)
  }, [sailColor, stripeColor, harborType, harborResource])
  const scaleArr = Array.isArray(scale)
    ? scale as [number, number, number]
    : [scale, scale, scale] as [number, number, number]

  const HUL   = color
  const HUL_D = dk(color, 0.28)
  const HUL_L = lk(color, 0.22)
  const DECK  = lk(color, 0.35)
  const ROPE  = '#A07840'
  const METAL = '#6B7280'

  const DECK_Y = 0.57

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

        {/* Hull */}
        <mesh geometry={hullGeo} castShadow={S} receiveShadow={S}>
          <meshStandardMaterial color={HUL} roughness={0.82} flatShading side={THREE.DoubleSide} />
        </mesh>

        {/* Keel */}
        <mesh position={[0, -0.16, 0]} castShadow={S}>
          <boxGeometry args={[0.10, 0.08, 3.60]} />
          <meshStandardMaterial color={HUL_D} roughness={0.88} />
        </mesh>

        {/* Gunwale caps */}
        {([-1, 1] as const).map(side => (
          <mesh key={side} position={[side * 0.80, DECK_Y + 0.014, -0.10]}>
            <boxGeometry args={[0.060, 0.030, 3.50]} />
            <meshStandardMaterial color={HUL_D} roughness={0.85} />
          </mesh>
        ))}

        {/* Deck thwarts */}
        {thwarts.map(([z, hw], i) => (
          <React.Fragment key={i}>
            <mesh position={[0, DECK_Y + 0.016, z]} castShadow={S}>
              <boxGeometry args={[hw * 1.80, 0.032, 0.115]} />
              <meshStandardMaterial color={i % 2 === 0 ? DECK : HUL_L} roughness={0.84} />
            </mesh>
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

        {/* Stern castle */}
        <mesh position={[0, DECK_Y + 0.10, -1.60]} castShadow={S}>
          <boxGeometry args={[1.10, 0.090, 0.60]} />
          <meshStandardMaterial color={HUL_D} roughness={0.85} />
        </mesh>
        <mesh position={[0, DECK_Y + 0.046, -1.30]}>
          <boxGeometry args={[1.10, 0.020, 0.08]} />
          <meshStandardMaterial color={HUL_D} roughness={0.88} />
        </mesh>
        <mesh position={[0, DECK_Y + 0.55, -1.82]} castShadow={S}>
          <cylinderGeometry args={[0.055, 0.075, 0.90, 8]} />
          <meshStandardMaterial color={HUL_D} roughness={0.80} />
        </mesh>
        <mesh position={[0, DECK_Y + 1.02, -1.82]}>
          <sphereGeometry args={[0.085, 8, 8]} />
          <meshStandardMaterial color={METAL} roughness={0.40} metalness={0.55} />
        </mesh>

        {/* Bow post */}
        <mesh position={[0, DECK_Y + 0.42, 1.78]} castShadow={S}>
          <cylinderGeometry args={[0.045, 0.065, 0.72, 8]} />
          <meshStandardMaterial color={HUL_D} roughness={0.80} />
        </mesh>
        <mesh position={[0, DECK_Y + 0.82, 1.78]}>
          <sphereGeometry args={[0.070, 8, 8]} />
          <meshStandardMaterial color={METAL} roughness={0.40} metalness={0.55} />
        </mesh>

        {/* Side railings */}
        {([-1, 1] as const).map(side => (
          <group key={side}>
            {([-1.20, -0.60, 0.00, 0.60, 1.20] as const).map((z, j) => (
              <mesh key={j} position={[side * ribWidthAt(z) * 0.90, DECK_Y + 0.18, z]}>
                <boxGeometry args={[0.038, 0.32, 0.038]} />
                <meshStandardMaterial color={HUL_D} roughness={0.82} />
              </mesh>
            ))}
            <mesh position={[side * 0.72, DECK_Y + 0.34, -0.14]}>
              <boxGeometry args={[0.038, 0.038, 2.55]} />
              <meshStandardMaterial color={HUL_D} roughness={0.80} />
            </mesh>
          </group>
        ))}

        {/* Mast */}
        <mesh position={[0, DECK_Y + 1.40, 0.10]} castShadow={S}>
          <cylinderGeometry args={[0.048, 0.072, 2.70, 8]} />
          <meshStandardMaterial color={HUL_D} roughness={0.78} />
        </mesh>
        <mesh position={[0, DECK_Y + 2.78, 0.10]}>
          <sphereGeometry args={[0.075, 8, 8]} />
          <meshStandardMaterial color={METAL} roughness={0.35} metalness={0.55} />
        </mesh>

        {/* Yard arm */}
        <mesh position={[0, DECK_Y + 2.35, 0.10]} rotation={[0, 0, Math.PI / 2]} castShadow={S}>
          <cylinderGeometry args={[0.030, 0.040, 1.90, 6]} />
          <meshStandardMaterial color={HUL_D} roughness={0.78} />
        </mesh>

        {/* Boom */}
        <mesh position={[0, DECK_Y + 0.68, 0.42]} rotation={[0.18, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.035, 1.30, 6]} />
          <meshStandardMaterial color={HUL_D} roughness={0.80} />
        </mesh>

        {/* Sail — billboard, always faces camera */}
        {/* Bubble tag above mast — always faces camera */}
        {harborType && (
          <Billboard position={[0, DECK_Y + 3.60, 0.10]} follow={true}>
            <mesh>
              <planeGeometry args={[2.40, 2.40]} />
              <meshStandardMaterial map={sailTexture} transparent alphaTest={0.01} side={THREE.DoubleSide} />
            </mesh>
          </Billboard>
        )}

        {/* Rigging */}
        <mesh position={[0, DECK_Y + 1.85, 1.02]} rotation={[0.72, 0, 0]}>
          <cylinderGeometry args={[0.014, 0.014, 2.40, 4]} />
          <meshStandardMaterial color={ROPE} roughness={0.90} />
        </mesh>
        <mesh position={[0, DECK_Y + 1.85, -0.88]} rotation={[-0.62, 0, 0]}>
          <cylinderGeometry args={[0.014, 0.014, 2.10, 4]} />
          <meshStandardMaterial color={ROPE} roughness={0.90} />
        </mesh>
        <mesh position={[-0.38, DECK_Y + 1.55, 0.10]} rotation={[0, 0, 0.48]}>
          <cylinderGeometry args={[0.010, 0.010, 2.20, 4]} />
          <meshStandardMaterial color={ROPE} roughness={0.90} />
        </mesh>
        <mesh position={[ 0.38, DECK_Y + 1.55, 0.10]} rotation={[0, 0, -0.48]}>
          <cylinderGeometry args={[0.010, 0.010, 2.20, 4]} />
          <meshStandardMaterial color={ROPE} roughness={0.90} />
        </mesh>

        {/* Flag */}
        <mesh position={[0.14, DECK_Y + 2.70, 0.12]}>
          <planeGeometry args={[0.32, 0.18]} />
          <meshStandardMaterial color={stripeColor} roughness={0.80} side={THREE.DoubleSide} />
        </mesh>

        {/* Cargo */}
        <group position={[0, DECK_Y + 0.04, 0]}>
          {children}
        </group>

      </group>
    </group>
  )
}

export default Boat3D
