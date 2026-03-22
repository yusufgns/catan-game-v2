import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// ── Props ────────────────────────────────────────────────
export interface Robber3DProps {
  /** Uniform scale. Default: 1. At scale=1 the robber is ~0.7 wide, ~1.4 tall. */
  scale?: number | [number, number, number];
  /** World-space position [x, y, z]. Default: [0,0,0]. Sits on Y=0 plane. */
  position?: [number, number, number];
  /** Y-axis rotation in radians. Default: 0. */
  rotationY?: number;
  /** Whether meshes cast / receive shadows. Default: true. */
  shadows?: boolean;
  /**
   * Subtle idle animation — slow bob and gentle sway.
   * Default: true.
   */
  animated?: boolean;
  /**
   * When true, shows a red glow / "active" highlight — useful when the
   * robber is being moved by the current player.
   * Default: false.
   */
  active?: boolean;
}

/**
 * Robber3D — React Three Fiber component.
 *
 * The Catan robber piece: a dark hooded figure that sits on desert tiles
 * (or any tile it is moved to after a 7 is rolled).
 *
 * Aesthetic: chunky medieval bandit silhouette with a hooded cloak,
 * glowing eye slit, and a small sack. Style matches the other Catan 3D pieces.
 *
 * At scale=1: ~0.65 wide, ~1.42 tall. Footprint fits inside a hex tile.
 *
 * Z-FIGHTING FREE — all decorations use strict geometric offsets.
 *
 * Usage:
 * ```tsx
 * <Canvas shadows>
 *   <ambientLight intensity={0.55} />
 *   <directionalLight position={[5,10,5]} castShadow />
 *   <Robber3D position={[0, 0, 0]} active={false} />
 * </Canvas>
 * ```
 *
 * Board placement tip: place Robber3D at the hex center (Y=0) of the
 * current robber tile. When the player drags the robber, set `active={true}`
 * for visual feedback.
 */
export const Robber3D: React.FC<Robber3DProps> = ({
  scale = 1,
  position = [0, 0, 0],
  rotationY = 0,
  shadows = true,
  animated = true,
  active = false,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (animated && groupRef.current) {
      const t = clock.getElapsedTime();
      groupRef.current.position.y = Math.sin(t * 1.1) * 0.03;
      groupRef.current.rotation.y = rotationY + Math.sin(t * 0.7) * 0.06;
    }
  });

  // ── Palette ──
  // Main body: very dark charcoal/nearly-black
  const bodyCol   = '#1c1917';          // almost black
  const bodyMid   = '#292524';          // dark warm gray
  const bodyLight = '#44403c';          // cloak highlight
  const eyeCol    = active ? '#ef4444' : '#fbbf24';  // red when active, amber normally
  const skinCol   = '#6b4c3b';          // dark skin tone visible under hood
  const sackCol   = '#78350f';          // brown sack
  const sackLight = '#92400e';
  const baseCol   = '#0c0a09';          // base/shadow

  const S = shadows;
  const EMIT = active ? 0.9 : 0.5;

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <group ref={groupRef}>

        {/* ══ BASE / SHADOW DISC ══ */}
        <mesh position={[0, 0.01, 0]} receiveShadow={S}>
          <cylinderGeometry args={[0.30, 0.32, 0.02, 16]} />
          <meshStandardMaterial color={baseCol} roughness={0.95} transparent opacity={0.60} />
        </mesh>

        {/* ══ LOWER CLOAK / ROBE (wide cone) ══ */}
        <mesh position={[0, 0.38, 0]} castShadow={S} receiveShadow={S}>
          <cylinderGeometry args={[0.22, 0.30, 0.76, 12]} />
          <meshStandardMaterial color={bodyCol} roughness={0.90} />
        </mesh>

        {/* Robe hem ridge */}
        <mesh position={[0, 0.015, 0]}>
          <cylinderGeometry args={[0.295, 0.31, 0.03, 12]} />
          <meshStandardMaterial color={bodyMid} roughness={0.92} />
        </mesh>

        {/* Robe vertical fold lines (front) */}
        {([-0.06, 0.06] as number[]).map((x, i) => (
          <mesh key={`fold-${i}`} position={[x, 0.36, 0.21]}>
            <boxGeometry args={[0.03, 0.55, 0.02]} />
            <meshStandardMaterial color={bodyLight} roughness={0.92} />
          </mesh>
        ))}

        {/* ══ TORSO / MID BODY ══ */}
        <mesh position={[0, 0.88, 0]} castShadow={S}>
          <cylinderGeometry args={[0.18, 0.23, 0.36, 12]} />
          <meshStandardMaterial color={bodyCol} roughness={0.88} />
        </mesh>

        {/* Belt */}
        <mesh position={[0, 0.76, 0]}>
          <cylinderGeometry args={[0.215, 0.215, 0.06, 12]} />
          <meshStandardMaterial color={bodyMid} roughness={0.80} />
        </mesh>
        {/* Belt buckle */}
        <mesh position={[0, 0.76, 0.22]}>
          <boxGeometry args={[0.08, 0.05, 0.02]} />
          <meshStandardMaterial color='#78716c' roughness={0.40} metalness={0.50} />
        </mesh>

        {/* ══ CLOAK / SHOULDERS ══ */}
        <mesh position={[0, 1.02, 0]} castShadow={S}>
          <cylinderGeometry args={[0.21, 0.19, 0.22, 12]} />
          <meshStandardMaterial color={bodyCol} roughness={0.88} />
        </mesh>
        {/* Shoulder overhang */}
        <mesh position={[0, 1.08, 0]}>
          <cylinderGeometry args={[0.24, 0.21, 0.10, 12]} />
          <meshStandardMaterial color={bodyLight} roughness={0.85} />
        </mesh>

        {/* ══ ARMS ══ */}
        {([-1, 1] as number[]).map((side, i) => (
          <group key={`arm-${i}`}>
            {/* Upper arm */}
            <mesh position={[side * 0.23, 0.96, 0.04]}
              rotation={[0.25, 0, side * 0.30]} castShadow={S}>
              <cylinderGeometry args={[0.06, 0.07, 0.32, 7]} />
              <meshStandardMaterial color={bodyCol} roughness={0.88} />
            </mesh>
            {/* Forearm (points slightly forward/down) */}
            <mesh position={[side * 0.28, 0.76, 0.12]}
              rotation={[0.55, 0, side * 0.15]} castShadow={S}>
              <cylinderGeometry args={[0.045, 0.055, 0.28, 7]} />
              <meshStandardMaterial color={bodyCol} roughness={0.88} />
            </mesh>
          </group>
        ))}

        {/* ══ NECK ══ */}
        <mesh position={[0, 1.16, 0]}>
          <cylinderGeometry args={[0.085, 0.095, 0.12, 8]} />
          <meshStandardMaterial color={skinCol} roughness={0.85} />
        </mesh>

        {/* ══ HEAD (face area barely visible under hood) ══ */}
        <mesh position={[0, 1.28, 0.01]} castShadow={S}>
          <sphereGeometry args={[0.145, 10, 10]} />
          <meshStandardMaterial color={skinCol} roughness={0.82} />
        </mesh>

        {/* ══ HOOD (cone over head) ══ */}
        <mesh position={[0, 1.30, -0.02]} castShadow={S}>
          <coneGeometry args={[0.20, 0.46, 10]} />
          <meshStandardMaterial color={bodyCol} roughness={0.85} />
        </mesh>
        {/* Hood brim (wider ring around face opening) */}
        <mesh position={[0, 1.13, 0.04]} rotation={[0.18, 0, 0]}>
          <torusGeometry args={[0.16, 0.035, 7, 16]} />
          <meshStandardMaterial color={bodyLight} roughness={0.88} />
        </mesh>

        {/* ══ EYES — glowing slit ══ */}
        {([-0.055, 0.055] as number[]).map((x, i) => (
          <mesh key={`eye-${i}`} position={[x, 1.255, 0.136]}>
            <sphereGeometry args={[0.030, 7, 7]} />
            <meshStandardMaterial
              color={eyeCol}
              emissive={eyeCol}
              emissiveIntensity={EMIT}
              roughness={0.20}
            />
          </mesh>
        ))}

        {/* Eye glow light (subtle point light from face area) */}
        <pointLight
          position={[0, 1.25, 0.20]}
          color={active ? '#ef4444' : '#fbbf24'}
          intensity={active ? 0.35 : 0.15}
          distance={1.5}
        />

        {/* ══ SACK (left hand) ══ */}
        <mesh position={[-0.30, 0.65, 0.14]} rotation={[0.4, 0.3, 0.2]} castShadow={S}>
          <sphereGeometry args={[0.12, 9, 9]} />
          <meshStandardMaterial color={sackCol} roughness={0.90} />
        </mesh>
        {/* Sack knot */}
        <mesh position={[-0.27, 0.72, 0.17]}>
          <sphereGeometry args={[0.045, 7, 7]} />
          <meshStandardMaterial color={sackLight} roughness={0.88} />
        </mesh>
        {/* Sack tie rope */}
        <mesh position={[-0.27, 0.76, 0.16]} rotation={[0, 0, 0.5]}>
          <cylinderGeometry args={[0.010, 0.010, 0.09, 4]} />
          <meshStandardMaterial color='#A67C52' roughness={0.92} />
        </mesh>

        {/* ══ ACTIVE INDICATOR — red glow ring at base ══ */}
        {active && (
          <mesh position={[0, 0.04, 0]}>
            <torusGeometry args={[0.28, 0.03, 8, 24]} />
            <meshStandardMaterial
              color='#ef4444'
              emissive='#ef4444'
              emissiveIntensity={0.80}
              roughness={0.30}
              transparent
              opacity={0.85}
            />
          </mesh>
        )}
        {active && (
          <pointLight
            position={[0, 0.1, 0]}
            color='#ef4444'
            intensity={0.40}
            distance={2.0}
          />
        )}

      </group>
    </group>
  );
};

export default Robber3D;
