import * as THREE from 'three';
import { getGameContext } from '../GameContext';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export default class Camera {
  game: any;
  canvas: any;
  sizes: any;
  scene: any;
  idealRatio: number;
  ratioOverflow: number;
  initialCameraPosition: THREE.Vector3 | null;
  adjustedCameraPosition: THREE.Vector3 | null;
  baseMaxDistance: number;
  baseMinDistance: number;
  cameraInstance: any;
  controls: any;

  constructor(fov = 25, near = 0.1, far = 200) {
    this.game = getGameContext();
    this.canvas = this.game.canvas;
    this.sizes = this.game.sizes;
    this.scene = this.game.scene;

    this.idealRatio = 16 / 9;
    this.ratioOverflow = 0;
    this.initialCameraPosition = null;
    this.adjustedCameraPosition = null;
    this.baseMaxDistance = 35;
    this.baseMinDistance = 12;

    this.setPerspectiveCameraInstance(fov, near, far);
    this.setOrbitControls();

    this.initialCameraPosition = this.cameraInstance.position.clone();
    this.updateCameraForAspectRatio();
  }

  setPerspectiveCameraInstance(fov: number, near: number, far: number) {
    const aspectRatio = this.sizes.width / this.sizes.height;
    this.cameraInstance = new THREE.PerspectiveCamera(
      fov,
      aspectRatio,
      near,
      far
    );

    // Camera angle — slightly more top-down than original, board shifted up on screen
    const dist = 34;
    const angle = Math.PI * 0.28; // ~50 degrees
    this.cameraInstance.position.set(
      0,                          // centered horizontally
      dist * Math.sin(angle),     // ~26 up
      dist * Math.cos(angle) + 4  // ~21 forward + offset to push board up on screen
    );

    this.scene.add(this.cameraInstance);
  }

  setOrbitControls() {
    this.controls = new OrbitControls(this.cameraInstance, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enableZoom = true;
    this.controls.target.set(0, 0, 1);

    // No panning
    this.controls.enablePan = false;

    // Allow slight rotation
    this.controls.enableRotate = true;
    this.controls.rotateSpeed = 0.3;

    // Polar — slight tilt up/down around current angle
    const currentPolar = Math.PI * 0.28;
    this.controls.minPolarAngle = currentPolar - 0.15; // ~41°
    this.controls.maxPolarAngle = currentPolar + 0.15; // ~58°

    // Azimuth — slight left/right
    this.controls.minAzimuthAngle = -0.2;  // ~11°
    this.controls.maxAzimuthAngle = 0.2;   // ~11°

    // Zoom
    this.controls.enableZoom = true;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 120;
    this.controls.zoomSpeed = 1.0;
  }

  updateCameraForAspectRatio() {
    const currentRatio = this.sizes.width / this.sizes.height;
    this.ratioOverflow = Math.max(1, this.idealRatio / currentRatio) - 1;

    const baseDistance = this.initialCameraPosition!.length();
    const additionalDistance = baseDistance * this.ratioOverflow * 0.1;

    const direction = this.initialCameraPosition!.clone().normalize();
    const newDistance = baseDistance + additionalDistance;

    this.adjustedCameraPosition = direction.multiplyScalar(newDistance);
    this.cameraInstance.position.copy(this.adjustedCameraPosition);

    this.controls.maxDistance = Math.max(this.baseMaxDistance, newDistance);
  }

  resize() {
    const aspectRatio = this.sizes.width / this.sizes.height;
    this.cameraInstance.aspect = aspectRatio;
    this.cameraInstance.updateProjectionMatrix();

    this.updateCameraForAspectRatio();
  }

  update() {
    this.controls.update();
  }
}
