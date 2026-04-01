/**
 * Shared hex tile geometry utilities for Catan terrain tiles.
 * All hex terrain models use these helpers for consistent base plates.
 */
import * as THREE from 'three';

/**
 * Create a pointy-top hexagonal THREE.Shape.
 * @param {number} radius - outer radius
 */
export function hexShape(radius) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6; // pointy-top
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

/**
 * Create a hex tile base plate (extruded hexagon).
 * Returns a mesh rotated to lie flat (XZ plane, Y = up).
 * @param {number} radius   - hex outer radius
 * @param {number} height   - extrusion height (thickness)
 * @param {THREE.Material} material
 */
export function createHexPlate(radius, height, material) {
  const shape = hexShape(radius);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 1,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Create a frame/border ring around a hex (slightly larger than terrain plate).
 * @param {number} outerRadius
 * @param {number} height
 * @param {THREE.Material} material
 */
export function createHexFrame(outerRadius, height, material) {
  const shape = hexShape(outerRadius);
  const innerShape = hexShape(outerRadius - 0.06);
  shape.holes.push(innerShape);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 1,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Axial hex coordinates to 3D world position [x, 0, z].
 * Pointy-top layout, matching the web/lib/hexGrid.ts hexToPixel formula.
 * @param {number} q - axial column
 * @param {number} r - axial row
 * @param {number} size - hex spacing size
 */
export function hexToWorld(q, r, size) {
  const x = size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const z = size * (3 / 2) * r;
  return [x, 0, z];
}
