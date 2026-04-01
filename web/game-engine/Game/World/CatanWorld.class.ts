import * as THREE from 'three';
import { getGameContext } from '../GameContext';
import Lighting from './Components/Lighting/Lighting.class';
import Skydome from './Components/Skydome/Skydome.class';
import Fog from './Components/Fog/Fog.class';
import WindLines from './Components/WindLines/Windlines.class';
import FireFlies from './Components/FireFlies/FireFlies.class';
import Rain from './Components/Rain/Rain.class';
import SnowFall from './Components/SnowFall/SnowFall.class';
import CatanBoard from './Components/CatanBoard/CatanBoard.class';
import { getActiveBoardData } from '../../catan';
import EnvironmentTimeManager from './Managers/EnvironmentManager/EnvironmentManager.class';
import SeasonManager from './Managers/SeasonManager/SeasonManager.class';

// Water shader chunks (same as Ground's water ripples)
import waterVertexCommonChunk from '../../Shaders/Chunks/water/water.vertex_common_chunk.glsl';
import waterVertexBeginChunk from '../../Shaders/Chunks/water/water.vertex_begin_chunk.glsl';
import waterFragmentCommonChunk from '../../Shaders/Chunks/water/water.fragment_common_chunk.glsl';
import waterFragmentColorChunk from '../../Shaders/Chunks/water/water.fragment_color_chunk.glsl';

// Ground shader chunks (for the base water color layer)
import groundVertexCommonChunk from '../../Shaders/Chunks/ground/ground.vertex_common_chunk.glsl';
import groundVertexBeginChunk from '../../Shaders/Chunks/ground/ground.vertex_begin_chunk.glsl';
import groundFragmentCommonChunk from '../../Shaders/Chunks/ground/ground.fragment_common_chunk.glsl';
import groundFragmentColorChunk from '../../Shaders/Chunks/ground/ground.fragment_color_chunk.glsl';

/**
 * Catan game world — uses Elemental Serenity's water shader system
 * for a beautiful animated ocean, with the hex board floating above.
 */
export default class CatanWorld {
  game: any;
  scene: any;
  environmentTimeManager: any;
  seasonManager: any;
  lighting: any;
  skydome: any;
  WORLD_SIZE: number;
  fog: any;
  oceanColorConfig: any;
  groundUniforms: any;
  waterUniforms: any;
  windLines: any;
  fireFlies: any;
  rain: any;
  snowFall: any;
  catanBoard: any;
  lightning: any;
  ground: any;

  constructor() {
    this.game = getGameContext();
    this.scene = this.game.scene;

    this.environmentTimeManager = EnvironmentTimeManager.getInstance();
    this.seasonManager = SeasonManager.getInstance();

    this.lighting = new Lighting({ helperEnabled: false });

    // Override lights for Catan board — re-apply after each time/season change
    this._overrideLights();
    this.environmentTimeManager.onChange(() => {
      // Lighting.applyPreset resets positions, so re-override after a tick
      setTimeout(() => this._overrideLights(), 50);
      this._updateOceanColors();
    });
    this.seasonManager.onChange(() => {
      setTimeout(() => this._overrideLights(), 50);
      this._updateOceanColors();
    });

    this.skydome = new Skydome();

    this.WORLD_SIZE = 80;
    this.fog = new Fog(this.WORLD_SIZE);

    // ── Ocean (Elemental Serenity water system) ──────────────────────────────
    this._buildOcean();

    // ── Atmospheric effects ──────────────────────────────────────────────────
    this.windLines = new WindLines();
    this.fireFlies = new FireFlies();
    this.rain = new Rain();
    this.snowFall = new SnowFall();

    // ── Catan hex board ─────────────────────────────────────────────────────
    this.catanBoard = new CatanBoard({
      position: [0, 0.08, 0],
      hexSize: 2.0,
      boardData: getActiveBoardData() || undefined,
    });

    this.lightning = null;
    this.ground = { WORLD_SIZE: this.WORLD_SIZE, update() {} };
  }

  _overrideLights() {
    if (!this.lighting.lights) return;
    const isNight = this.environmentTimeManager.envTime === 'night';
    const key = this.lighting.lights.key;
    const fill = this.lighting.lights.fill;
    const rim = this.lighting.lights.rim;
    const ambient = this.lighting.lights.ambient;

    if (key) {
      // Key light: behind camera, covers full board
      key.position.set(0, 18, 20);
      key.shadow.camera.left = -16;
      key.shadow.camera.right = 16;
      key.shadow.camera.top = 16;
      key.shadow.camera.bottom = -16;
      key.shadow.camera.updateProjectionMatrix();

      if (isNight) {
        // Moonlight — cool blue, brighter than default night preset
        key.color.setHex(0x8ab8e8);
        key.intensity = 1.8;
      }
    }

    if (fill) {
      fill.position.set(-10, 10, 14);
      if (isNight) {
        fill.color.setHex(0x4a6a9a);
        fill.intensity = 0.4;
      }
    }

    if (rim) {
      rim.position.set(10, 12, -6);
      if (isNight) {
        rim.color.setHex(0x6688bb);
        rim.intensity = 0.25;
      }
    }

    if (ambient) {
      if (isNight) {
        ambient.color.setHex(0x3a5a8a);
        ambient.intensity = 0.25;
      } else {
        // Daytime — ensure bright enough even in rainy season
        ambient.intensity = Math.max(ambient.intensity, 0.55);
      }
    }

    const season = this.seasonManager.currentSeason;

    if (!isNight) {
      if (season === 'rainy') {
        // Rainy day — brighter than default rainy preset
        if (key) key.intensity = 2.2;
        if (fill) fill.intensity = 0.6;
        if (ambient) ambient.intensity = 0.6;
      } else {
        // Normal day (spring/autumn/winter) — slightly toned down, not overblown
        if (key) key.intensity = Math.min(key.intensity, 1.8);
        if (ambient) ambient.intensity = Math.min(ambient.intensity, 0.45);
      }
    }
  }

  _createOceanDensityMap() {
    // Custom density map: blue channel = 1.0 everywhere (all water)
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    // R=0 (no special), G=0 (no grass), B=255 (all water)
    ctx.fillStyle = 'rgb(0, 0, 255)';
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  _createOceanDepthMap() {
    // Radial depth gradient — deeper in center, shallower at edges
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    const cx = size / 2, cy = size / 2;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
    grad.addColorStop(0, 'rgb(0, 0, 160)');    // Moderately deep center
    grad.addColorStop(0.2, 'rgb(0, 0, 120)');
    grad.addColorStop(0.4, 'rgb(0, 0, 70)');   // Ripples visible from here
    grad.addColorStop(0.7, 'rgb(0, 0, 40)');
    grad.addColorStop(1, 'rgb(0, 0, 50)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  _buildOcean() {
    const WS = this.WORLD_SIZE;

    // Get season colors
    this.oceanColorConfig = this.seasonManager.getColorConfig('ground');
    const envTime = this.environmentTimeManager.envTime || 'day';
    const colors = this.oceanColorConfig[envTime];

    // Textures — custom density + depth, reuse perlin noise from resources
    const densityMap = this._createOceanDensityMap();
    const depthMap = this._createOceanDepthMap();
    const perlinNoise = this.game.resources.items.perlinNoise;
    perlinNoise.wrapS = perlinNoise.wrapT = THREE.RepeatWrapping;

    // Also grab the real textures for the ground shader layer
    const displacementTex = this.game.resources.items.displacementMap;
    displacementTex.wrapS = displacementTex.wrapT = THREE.RepeatWrapping;
    const groundRockMap = this.game.resources.items.groundRockMap;
    groundRockMap.wrapS = groundRockMap.wrapT = THREE.RepeatWrapping;
    const groundRockAO = this.game.resources.items.groundRockAOMap;
    groundRockAO.wrapS = groundRockAO.wrapT = THREE.RepeatWrapping;

    // ── Layer 1: Base water color (ground shader, all-water density) ──────
    const baseGeo = new THREE.PlaneGeometry(WS, WS, 1, 1);
    const baseMat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1 });

    // Winter water colors used for ALL seasons (user preference — beautiful icy blue)
    const waterShallow = new THREE.Color(0x5aaacf);
    const waterDeep = new THREE.Color(0x1a5888);

    this.groundUniforms = {
      uDensityMap: { value: densityMap },
      uGroundSize: { value: new THREE.Vector3(WS, 0, WS) },
      uDisplacementMap: { value: displacementTex },
      uPerlinNoise: { value: perlinNoise },
      uGroundRockMap: { value: groundRockMap },
      uGroundRockAO: { value: groundRockAO },
      uGroundColorLight: { value: waterShallow.clone() },
      uGroundColorDark: { value: waterDeep.clone() },
      uGroundColorBelowGrass: { value: waterShallow.clone() },
      uRockColor: { value: waterDeep.clone() },
      uHeightMap: { value: groundRockMap },
      uRockTiling: { value: 12.0 },
      uWaterShallow: { value: waterShallow.clone() },
      uWaterDeep: { value: waterDeep.clone() },
      uWaterDepthIntensity: { value: 1.2 },
      uRockVisibility: { value: 0.0 },
    };

    baseMat.onBeforeCompile = (shader) => {
      shader.uniforms = { ...shader.uniforms, ...this.groundUniforms };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', groundVertexCommonChunk)
        .replace('#include <begin_vertex>', groundVertexBeginChunk);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', groundFragmentCommonChunk)
        .replace('#include <color_fragment>', groundFragmentColorChunk);
    };

    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.rotation.x = -Math.PI / 2;
    baseMesh.position.y = -0.15;
    baseMesh.receiveShadow = true;
    this.scene.add(baseMesh);

    // ── Layer 2: Water ripples (animated shader overlay) ─────────────────
    const rippleGeo = new THREE.PlaneGeometry(WS, WS, 1, 1);
    const rippleMat = new THREE.MeshStandardMaterial({
      color: 'black',
      transparent: true,
    });

    this.waterUniforms = {
      uTime: { value: 0 },
      uDensityMap: { value: densityMap },
      uGroundSize: { value: new THREE.Vector3(WS, 0, WS) },
      uPerlinNoise: { value: perlinNoise },
      uWaterDepthTexture: { value: depthMap },
      uRipplesRatio: { value: 1.0 },
      uDensityMaskMin: { value: 0.0 },
      uDensityMaskMax: { value: 0.01 },
      uShoreMaskThreshold: { value: 0.8 },
      uNoiseScale1: { value: 3.0 },
      uNoiseScale2: { value: 5.0 },
      uNoiseSpeed1: { value: 0.08 },
      uNoiseSpeed2: { value: 0.05 },
      uNoiseMix1: { value: 0.6 },
      uNoiseMix2: { value: 0.4 },
      uNoiseDepthInfluence: { value: 0.35 },
      uRippleFrequency: { value: 8.0 },
      uRippleInnerEdge: { value: 0.02 },
      uRippleOuterEdge: { value: 0.08 },
      uBreakupMin: { value: 0.2 },
      uBreakupMax: { value: 0.6 },
      uWaterDepthFade: { value: 0.05 },
      uDiscardThreshold: { value: 0.1 },
      uRippleOpacity: { value: 1.2 },
      uSplashesRatio: { value: 0.0 },
      uSplashesNoiseFrequency: { value: 0.66 },
      uSplashesTimeFrequency: { value: 6.0 },
      uSplashesThickness: { value: 0.3 },
      uSplashesEdgeAttenuationLow: { value: 0.14 },
      uSplashesEdgeAttenuationHigh: { value: 1.0 },
      uSplashesCenterMin: { value: 0.0 },
      uSplashesCenterMax: { value: 0.5 },
      uIceRatio: { value: 0.0 },
      uIceNoiseFrequency: { value: 0.3 },
      uIceColor: { value: new THREE.Color(0.9, 0.95, 1.0) },
    };

    rippleMat.onBeforeCompile = (shader) => {
      shader.uniforms = { ...shader.uniforms, ...this.waterUniforms };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', waterVertexCommonChunk)
        .replace('#include <begin_vertex>', waterVertexBeginChunk);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', waterFragmentCommonChunk)
        .replace('#include <color_fragment>', waterFragmentColorChunk);
    };

    const rippleMesh = new THREE.Mesh(rippleGeo, rippleMat);
    rippleMesh.rotation.x = -Math.PI / 2;
    rippleMesh.position.y = -0.05;
    this.scene.add(rippleMesh);
  }

  _updateOceanColors() {
    if (!this.groundUniforms) return;
    const envTime = this.environmentTimeManager.envTime || 'day';
    const season = this.seasonManager.currentSeason || 'spring';

    // Always use winter water colors (beautiful icy blue, user preference)
    const presets = {
      day:   [0x5aaacf, 0x1a5888],
      night: [0x2a4868, 0x0a2040],
    };
    const [shallow, deep] = presets[envTime] || presets.day;

    const sc = new THREE.Color(shallow);
    const dc = new THREE.Color(deep);

    this.groundUniforms.uGroundColorLight.value.copy(sc);
    this.groundUniforms.uGroundColorDark.value.copy(dc);
    this.groundUniforms.uGroundColorBelowGrass.value.copy(sc);
    this.groundUniforms.uWaterShallow.value.copy(sc);
    this.groundUniforms.uWaterDeep.value.copy(dc);
  }

  update(delta: number, elapsedTime: number) {
    this.skydome.update(delta, elapsedTime);
    this.fireFlies.update(elapsedTime);
    this.rain.update(delta, elapsedTime);
    this.snowFall.update(delta, elapsedTime);

    // Animate water ripples
    if (this.waterUniforms) {
      this.waterUniforms.uTime.value += 0.0002;

      // Season-specific water effects
      const season = this.seasonManager.currentSeason;
      if (season === 'winter') {
        // Full freeze — ice everywhere, no ripples, no splashes
        this.waterUniforms.uIceRatio.value = THREE.MathUtils.lerp(
          this.waterUniforms.uIceRatio.value, 1.0, 0.03);
        this.waterUniforms.uRipplesRatio.value = THREE.MathUtils.lerp(
          this.waterUniforms.uRipplesRatio.value, 0.0, 0.05);
        this.waterUniforms.uSplashesRatio.value = THREE.MathUtils.lerp(
          this.waterUniforms.uSplashesRatio.value, 0.0, 0.05);
        // Base water → icy white-blue
        const iceColor = new THREE.Color(0x8ab8d8);
        this.groundUniforms.uGroundColorLight.value.lerp(iceColor, 0.03);
        this.groundUniforms.uGroundColorDark.value.lerp(new THREE.Color(0x4a7898), 0.03);
      } else if (season === 'rainy') {
        this.waterUniforms.uIceRatio.value = THREE.MathUtils.lerp(
          this.waterUniforms.uIceRatio.value, 0.0, 0.05);
        this.waterUniforms.uRipplesRatio.value = THREE.MathUtils.lerp(
          this.waterUniforms.uRipplesRatio.value, 1.0, 0.05);
        this.waterUniforms.uSplashesRatio.value = THREE.MathUtils.lerp(
          this.waterUniforms.uSplashesRatio.value, 1.0, 0.05);
      } else {
        // Spring/autumn — gentle ripples, no ice
        this.waterUniforms.uIceRatio.value = THREE.MathUtils.lerp(
          this.waterUniforms.uIceRatio.value, 0.0, 0.05);
        this.waterUniforms.uRipplesRatio.value = THREE.MathUtils.lerp(
          this.waterUniforms.uRipplesRatio.value, 1.0, 0.05);
        this.waterUniforms.uSplashesRatio.value = THREE.MathUtils.lerp(
          this.waterUniforms.uSplashesRatio.value, 0.0, 0.05);
        // Restore normal water color
        this.groundUniforms.uGroundColorLight.value.lerp(new THREE.Color(0x5aaacf), 0.03);
        this.groundUniforms.uGroundColorDark.value.lerp(new THREE.Color(0x1a5888), 0.03);
      }
    }
  }
}
