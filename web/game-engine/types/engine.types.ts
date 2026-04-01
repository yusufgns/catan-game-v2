/**
 * Type definitions for the Catan game engine.
 *
 * These interfaces describe the public APIs of the major engine classes.
 * They are intentionally kept as interfaces (not used for `implements`)
 * so that existing classes remain untouched at runtime.
 */

import type * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ---------------------------------------------------------------------------
// EventEmitter
// ---------------------------------------------------------------------------

export interface ResolvedName {
  original: string;
  value: string;
  namespace: string;
}

export type EventCallback = (...args: any[]) => any;

export type CallbackMap = Record<string, Record<string, EventCallback[]>>;

export interface IEventEmitter {
  callbacks: CallbackMap;

  on(_names: string, callback: EventCallback): this | false;
  off(_names: string): this | false;
  trigger(_name: string, ..._args: any[]): any;
  resolveNames(_names: string): string[];
  resolveName(name: string): ResolvedName;
}

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

export interface ITime extends IEventEmitter {
  start: number;
  current: number;
  elapsedTime: number;
  delta: number;
  _stopped: boolean;

  animate(): void;
  stop(): void;
}

// ---------------------------------------------------------------------------
// Sizes
// ---------------------------------------------------------------------------

export interface ISizes extends IEventEmitter {
  width: number;
  height: number;
  pixelRatio: number;
  resizeTimeout: ReturnType<typeof setTimeout> | null;
  _resizeHandler: () => void;

  dispose(): void;
  handleResizeDebounced(): void;
  handleResize(): void;
}

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------

export interface ICamera {
  game: IGame;
  canvas: HTMLCanvasElement;
  sizes: ISizes;
  scene: THREE.Scene;

  cameraInstance: THREE.PerspectiveCamera;
  controls: OrbitControls;

  idealRatio: number;
  ratioOverflow: number;
  initialCameraPosition: THREE.Vector3 | null;
  adjustedCameraPosition: THREE.Vector3 | null;
  baseMaxDistance: number;
  baseMinDistance: number;

  setPerspectiveCameraInstance(fov: number, near: number, far: number): void;
  setOrbitControls(): void;
  updateCameraForAspectRatio(): void;
  resize(): void;
  update(): void;
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export interface GraphicsSettings {
  antialias: boolean;
  shadowMapType: string;
  pixelRatioCap: number;
}

export interface IRenderer {
  game: IGame;
  canvas: HTMLCanvasElement;
  sizes: ISizes;
  scene: THREE.Scene;
  camera: ICamera;
  rendererInstance: THREE.WebGLRenderer;
  environmentTimeManager: IEnvironmentTimeManager;
  envTime: string;
  debugGUI: IDebugGUI;
  isDebugMode: boolean;
  perf?: IPerformanceMonitor;

  getInitialGraphicsSettings(): GraphicsSettings;
  setRendererInstance(): void;
  updateToneMapping(): void;
  onEnvTimeChanged(newValue: string, oldValue: string): void;
  onGraphicsQualityChanged(event: CustomEvent): void;
  setUpPerformanceMonitor(): void;
  resize(): void;
  update(): void;
  destroy(): void;
}

// ---------------------------------------------------------------------------
// ResourceLoader
// ---------------------------------------------------------------------------

export interface AssetSource {
  id: string;
  type: string;
  path: string | string[];
}

export interface LoaderProgressEvent {
  id: string;
  itemsLoaded: number;
  itemsTotal: number;
  percent: number;
}

export interface LoaderErrorEvent {
  id: string;
  url: string;
  itemsLoaded: number;
  itemsTotal: number;
}

export interface IResourceLoader extends IEventEmitter {
  sources: AssetSource[];
  items: Record<string, any>;
  sourceByUrl: Record<string, AssetSource>;
  toLoad: number;
  loaded: number;
  manager: THREE.LoadingManager;
  loaders: Record<string, any>;

  setLoaders(): void;
  initLoading(): void;
}

// ---------------------------------------------------------------------------
// AudioManager
// ---------------------------------------------------------------------------

export interface IAudioManager extends IEventEmitter {
  resources: IResourceLoader;
  listener: THREE.AudioListener;
  sounds: Record<string, THREE.Audio>;
  currentMusic: THREE.Audio | null;
  masterVolume: number;
  musicVolume: number;
  soundVolume: number;

  init(): void;
  createAudioObjects(): void;
  playMusic(musicId: string, fadeIn?: boolean, fadeDuration?: number): void;
  stopMusic(fadeOut?: boolean, fadeDuration?: number): void;
  forceStopAllMusic(): void;
  playSound(soundId: string, volume?: number | null, loop?: boolean): THREE.Audio | undefined;
  stopSound(soundId: string): void;
  stopAllAmbientSounds(): void;
  setMasterVolume(volume: number): void;
  setMusicVolume(volume: number): void;
  setSoundVolume(volume: number): void;
  updateAllVolumes(): void;
  fadeVolume(audio: THREE.Audio, targetVolume: number, duration: number, onComplete?: (() => void) | null): void;
  addListenerToCamera(camera: ICamera): void;
  getRandomBirdSound(): string;
  dispose(): void;
}

// ---------------------------------------------------------------------------
// MusicManager
// ---------------------------------------------------------------------------

export interface MusicTrack {
  id: string;
  name: string;
}

export interface IMusicManager extends IEventEmitter {
  audioManager: IAudioManager;
  musicTracks: MusicTrack[];
  currentTrackIndex: number;
  isPlaying: boolean;
  isPaused: boolean;
  fadeInDuration: number;
  fadeOutDuration: number;
  trackCheckInterval: ReturnType<typeof setInterval> | null;
  pausedTrackId: string | null;

  init(): void;
  startRandomMusic(): void;
  pauseMusic(): void;
  resumeMusic(): void;
  stopMusic(): void;
  playNextRandomTrack(): void;
  playTrackWithoutLoop(track: MusicTrack): void;
  startTrackMonitoring(trackId: string): void;
  getCurrentTrack(): MusicTrack | null;
  addTrack(id: string, name: string): void;
  removeTrack(id: string): void;
  dispose(): void;
}

// ---------------------------------------------------------------------------
// AmbientSoundManager
// ---------------------------------------------------------------------------

export interface AmbientSoundConfig {
  shortGapMin: number;
  shortGapMax: number;
  longGapMin: number;
  longGapMax: number;
  thunderLongGapMin: number;
  thunderLongGapMax: number;
  baseVolume: number;
  firePosition: THREE.Vector3;
  lakePosition: THREE.Vector3;
  maxDistance: number;
}

export type GapType = 'short' | 'long' | 'thunder';

export interface IAmbientSoundManager extends IEventEmitter {
  environmentManager: IEnvironmentTimeManager;
  seasonManager: ISeasonManager;
  audioManager: IAudioManager;
  musicControlUI: any;
  config: AmbientSoundConfig;
  activeContinuousSounds: Set<string>;
  scheduledTimers: Map<string, ReturnType<typeof setTimeout>>;
  wasAmbientPlayingBeforeHide: boolean;
  isAmbientSoundsPaused: boolean;
  _globalMuted?: boolean;

  init(): void;
  bindEvents(): void;
  setupAmbientVisibilityHandlers(): void;
  handleAmbientVisibilityChange(): void;
  handleAmbientWindowBlur(): void;
  handleAmbientWindowFocus(): void;
  handleAmbientBeforeUnload(): void;
  updateAmbientSounds(): void;
  handleBirds(season: string, timeOfDay: string): void;
  handleCrickets(season: string, timeOfDay: string): void;
  handleOwl(season: string, timeOfDay: string): void;
  handleRain(season: string, timeOfDay: string): void;
  handleThunder(season: string, timeOfDay: string): void;
  handleWolf(season: string, timeOfDay: string): void;
  handleFire(season: string, timeOfDay: string): void;
  handleLakeWaves(season: string, timeOfDay: string): void;
  playRandomBird(): void;
  playOwlHowling(): void;
  playOwlHooting(): void;
  playThunder(): void;
  playThunderStrike(): void;
  playWolf(): void;
  playContinuousSound(soundId: string): void;
  stopContinuousSound(soundId: string): void;
  playContinuousSoundWithDistance(soundId: string, soundPosition: THREE.Vector3): void;
  calculateDistanceBasedVolume(soundPosition: THREE.Vector3): number;
  updateSoundVolume(soundId: string, soundPosition: THREE.Vector3): void;
  scheduleRandomSound(soundKey: string, playFunction: () => void, gapType: GapType): void;
  rescheduleRandomSound(soundKey: string, playFunction: () => void, gapType: GapType): void;
  shouldSoundBePlaying(soundKey: string): boolean;
  getRandomDelay(gapType: GapType): number;
  clearTimer(soundKey: string): void;
  stopAllAmbientSounds(): void;
  setMasterVolume(volume: number): void;
  hasActiveAmbientSounds(): boolean;
  pauseAmbientSounds(): void;
  resumeAmbientSounds(): void;
  update(): void;
  dispose(): void;
}

// ---------------------------------------------------------------------------
// ToastManager
// ---------------------------------------------------------------------------

export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface IToastManager {
  toastContainer: HTMLDivElement | null;
  activeToasts: HTMLDivElement[];

  init(): void;
  createToastContainer(): void;
  getBaseToastStyles(): string;
  getIconContainerStyles(gradient: string): string;
  getIconStyles(): string;
  getLabelStyles(): string;
  getTitleStyles(): string;
  showMusicToast(trackName: string): HTMLDivElement;
  showDayNightToast(timeOfDay: string): HTMLDivElement;
  showSeasonToast(season: string): HTMLDivElement;
  showToast(message: string, type?: ToastType, duration?: number): HTMLDivElement;
  insertToast(toast: HTMLDivElement): void;
  hideToast(toast: HTMLDivElement): void;
  clearMusicToasts(): void;
  clearDayNightToasts(): void;
  clearSeasonToasts(): void;
  destroy(): void;
}

// ---------------------------------------------------------------------------
// DebugGUI
// ---------------------------------------------------------------------------

export interface DebugAddOptions {
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  color?: boolean;
  options?: Record<string, any> | string[];
  onChange?: (value: any) => void;
}

export interface IDebugGUI {
  gui: any; // lil-gui GUI instance
  folders: Map<string, any>;
  controllers: Map<string, any>;

  addFolder(name: string): any;
  add(targetObject: any, targetProperty: string, options?: DebugAddOptions, folderName?: string | null): any;
  setEnabled(enabled: boolean): void;
}

// ---------------------------------------------------------------------------
// PerformanceMonitor
// ---------------------------------------------------------------------------

export interface IPerformanceMonitor {
  game: IGame;
  renderer: THREE.WebGLRenderer;
  debugGUI: IDebugGUI;
  isDebugMode: boolean;
  stats: any;
  statsNative: any;

  beginFrame(): void;
  endFrame(): void;
}

// ---------------------------------------------------------------------------
// EnvironmentTimeManager
// ---------------------------------------------------------------------------

export interface IEnvironmentTimeManager extends IEventEmitter {
  availableTimes: string[];
  _envTime: string;
  envTime: string;

  onChange(callback: (newValue: string, oldValue: string) => void): void;
  offChange(): void;
  setTime(value: string): void;
}

// ---------------------------------------------------------------------------
// SeasonManager
// ---------------------------------------------------------------------------

export interface ISeasonManager extends IEventEmitter {
  _currentSeason: string;
  currentSeason: string;
  availableSeasons: string[];
  seasonConfigs: Record<string, any>;

  onChange(callback: () => void): void;
  setSeason(value: string): void;
  toggle(): void;
  getColorConfig(key: string): any;
}

// ---------------------------------------------------------------------------
// CatanWorld
// ---------------------------------------------------------------------------

export interface ICatanWorld {
  game: IGame;
  scene: THREE.Scene;
  environmentTimeManager: IEnvironmentTimeManager;
  seasonManager: ISeasonManager;
  lighting: any;
  skydome: any;
  WORLD_SIZE: number;
  fog: any;
  windLines: any;
  fireFlies: any;
  rain: any;
  snowFall: any;
  catanBoard: any;
  lightning: any;
  ground: { WORLD_SIZE: number; update(): void };
  groundUniforms: Record<string, { value: any }>;
  waterUniforms: Record<string, { value: any }>;
  oceanColorConfig: any;

  update(delta: number, elapsedTime: number): void;
}

// ---------------------------------------------------------------------------
// Game (singleton)
// ---------------------------------------------------------------------------

export interface IGame {
  canvas: HTMLCanvasElement | null;
  scene: THREE.Scene | null;
  camera: ICamera | null;
  renderer: IRenderer | null;
  world: ICatanWorld | null;
  time: ITime;
  sizes: ISizes;
  resources: IResourceLoader;
  debug: IDebugGUI | null;
  isDebugMode: boolean;

  audioManager: IAudioManager | null;
  musicManager: IMusicManager | null;
  ambientSoundManager: IAmbientSoundManager | null;
  toastManager: IToastManager | null;
  musicControlUI: any;
  lightningButtonUI: any;

  environmentTimeManager: IEnvironmentTimeManager;
  seasonManager: ISeasonManager;

  envTime: string;

  resize(): void;
  update(): void;
  initGUI(): void;
  destroy(): void;
}
