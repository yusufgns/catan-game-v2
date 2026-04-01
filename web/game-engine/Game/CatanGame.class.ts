import * as THREE from 'three';
import { getGameContext, setGameContext } from './GameContext';
import Sizes from './Utils/Sizes.class';
import Time from './Utils/Time.class';
import Camera from './Core/Camera.class';
import Renderer from './Core/Renderer.class';
import CatanWorld from './World/CatanWorld.class';
import DebugGUI from './Utils/DebugGUI.class';
import AudioManager from './Utils/AudioManager.class';
import MusicManager from './Utils/MusicManager.class';
import AmbientSoundManager from './Utils/AmbientSoundManager.class';
import ToastManager from './UI/ToastManager.class';
import EnvironmentTimeManager from './World/Managers/EnvironmentManager/EnvironmentManager.class';
import SeasonManager from './World/Managers/SeasonManager/SeasonManager.class';

/**
 * Stripped-down Game for the /catan page.
 * Uses CatanWorld (ground + lake + sky only — no camp, trees, rocks, etc.)
 *
 * Registers itself via setGameContext() so that Camera / Renderer can call
 * getGameContext() to access the singleton.
 */
export default class CatanGame {
  isDebugMode!: boolean;
  withMusic!: boolean;
  debug: any;
  canvas: any;
  resources: any;
  environmentTimeManager: any;
  seasonManager: any;
  sizes: any;
  time: any;
  scene: any;
  camera: any;
  renderer: any;
  audioManager: any;
  toastManager: any;
  musicManager: any;
  ambientSoundManager: any;
  musicControlUI: any;
  world: any;

  constructor(canvas: any, resources: any, isDebugMode: boolean, withMusic = true) {
    try {
      const existing = getGameContext();
      if (existing) return existing;
    } catch (_) {}
    // Register as the Game singleton so Camera / Renderer find us
    setGameContext(this);

    this.isDebugMode = isDebugMode;
    this.withMusic = withMusic;

    if (this.isDebugMode) {
      this.debug = new DebugGUI();
    }

    this.canvas = canvas;
    this.resources = resources;
    this.environmentTimeManager = EnvironmentTimeManager.getInstance();
    this.seasonManager = SeasonManager.getInstance();
    this.sizes = new Sizes();
    this.time = new Time();
    this.scene = new THREE.Scene();
    this.camera = new Camera();
    this.renderer = new Renderer();

    this.audioManager = new AudioManager(this.resources);
    this.audioManager.addListenerToCamera(this.camera);

    this.toastManager = new ToastManager();
    this.musicManager = new MusicManager(this.audioManager);

    this.ambientSoundManager = new AmbientSoundManager(
      this.environmentTimeManager,
      this.seasonManager,
      this.audioManager,
      null
    );
    // Start muted — user enables via music control button
    this.ambientSoundManager._globalMuted = !this.withMusic;

    this.musicManager.on('trackChanged', (track: any) => {
      this.toastManager.showMusicToast(track.name);
    });

    this.world = new CatanWorld();

    // LightningButtonUI is NOT created — no lightning button needed

    if (this.withMusic) {
      this.musicManager.startRandomMusic();
    }

    this.time.on('animate', () => {
      this.update();
    });
    this.sizes.on('resize', () => {
      this.resize();
    });
  }

  static getInstance() {
    return getGameContext();
  }

  get envTime() {
    return this.environmentTimeManager.envTime;
  }

  set envTime(value) {
    this.environmentTimeManager.envTime = value;
  }

  resize() {
    this.camera.resize();
    this.renderer.resize();
  }

  update() {
    this.camera.update();
    this.world.update(this.time.delta, this.time.elapsedTime);
    this.renderer.update();

    if (this.ambientSoundManager) {
      this.ambientSoundManager.update();
    }
  }

  destroy() {
    this.sizes.off('resize');
    this.sizes.dispose();
    this.time.off('animate');
    this.time.stop();

    // Close AudioContext FIRST to immediately kill all audio output
    try {
      const ctx = this.audioManager?.listener?.context;
      if (ctx && ctx.state !== 'closed') {
        ctx.suspend();
        ctx.close();
      }
    } catch (_) {}

    if (this.ambientSoundManager) this.ambientSoundManager.dispose();
    if (this.musicManager) this.musicManager.dispose();
    if (this.audioManager) this.audioManager.dispose();
    if (this.toastManager) this.toastManager.destroy();
    if (this.musicControlUI) this.musicControlUI.destroy();

    this.scene.traverse((child: any) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m: any) => {
          for (const key in m) {
            const prop = m[key];
            if (prop && prop.isTexture) prop.dispose();
          }
          m.dispose();
        });
      }
    });

    this.camera.controls.dispose();
    this.renderer.rendererInstance.dispose();

    setGameContext(null);
    this.canvas = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.world = null;
  }
}
