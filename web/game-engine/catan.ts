import * as THREE from 'three';
import CatanGame from './Game/CatanGame.class';
import ResourceLoader from './Game/Utils/ResourceLoader.class';
import SeasonManager from './Game/World/Managers/SeasonManager/SeasonManager.class';
import EnvironmentTimeManager from './Game/World/Managers/EnvironmentManager/EnvironmentManager.class';
import ASSETS from './config/assets';
import CatanGameState from './Game/World/Components/CatanBoard/CatanGameState';
import type { GameMode } from './Game/World/Components/CatanBoard/CatanGameState';

import { BEGINNER_BOARD, generateRandomBoard } from './game-logic/hexGrid';


let gameRef: any = null;
let catanStateRef: any = null;
let activeBoardData: any[] | null = null;

export function getActiveBoardData() { return activeBoardData; }

export function getGameState() { return catanStateRef; }
export function getGameRef() { return gameRef; }

export function destroyCatan(): void {
  if (catanStateRef) {
    catanStateRef._listeners = [];
    catanStateRef = null;
  }
  if (gameRef) {
    try { gameRef.destroy(); } catch(_) {}
    gameRef = null;
  }
  activeBoardData = null;
  ['catan-hud', 'toast', 'toast-container'].forEach(id => document.getElementById(id)?.remove());
}

export default function initCatan(): void {

// Destroy previous instance if exists (prevents double-init bugs)
destroyCatan();

// Clean up any leftover elements from previous sessions
['catan-hud', 'toast', 'toast-container'].forEach(id => document.getElementById(id)?.remove());

// Determine game mode from URL and generate board data early
const urlMode = new URLSearchParams(window.location.search).get('mode') as GameMode | null;
const gameMode: GameMode = (urlMode === 'ranked') ? 'ranked' : 'classic';
activeBoardData = gameMode === 'ranked' ? generateRandomBoard() : [...BEGINNER_BOARD];

const Haptics = {
  buttonTap() {
    if ((navigator as any).haptic) {
      (navigator as any).haptic([{ intensity: 0.7, sharpness: 0.1 }]);
    } else if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  },
};

const isDebugMode =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('mode') === 'debug';

// ─── DOM references ──────────────────────────────────────────────────────────
const loader         = document.getElementById('loader');
const progressBar    = document.getElementById('progress-bar');
const loaderText     = document.getElementById('loader-text');
const exploreButtons = document.getElementById('explore-buttons');
const exploreWithMusic    = document.getElementById('explore-with-music');
const exploreWithoutMusic = document.getElementById('explore-without-music');
const loaderTitle    = document.querySelector('.loader-title');
const loaderProgress = document.querySelector('.loader-progress-bar');
const shaderCanvas   = document.getElementById('shader-overlay');

const controlPanel  = document.getElementById('control-panel');
const pageTitle     = document.getElementById('page-title');
const settingsBtn   = document.getElementById('settings-btn');

const seasonButtons   = document.querySelectorAll('.season-button');
const dayNightButtons = document.querySelectorAll('.daynight-button');
const musicControl    = document.getElementById('music-control');

const settingsOverlay = document.getElementById('settings-overlay');
const settingsClose   = document.getElementById('settings-close');
const modalTabs       = document.querySelectorAll('.modal-tab');
const tabContents     = document.querySelectorAll('.tab-content');

const masterVolumeInput = document.getElementById('master-volume');
const musicVolumeInput  = document.getElementById('music-volume');
const soundVolumeInput  = document.getElementById('sound-volume');
const masterVolumeValue = document.getElementById('master-volume-value');
const musicVolumeValue  = document.getElementById('music-volume-value');
const soundVolumeValue  = document.getElementById('sound-volume-value');
const graphicsQuality   = document.getElementById('graphics-quality');
const qualityAffects    = document.getElementById('quality-affects');

// ─── Managers ────────────────────────────────────────────────────────────────
const seasonManager          = SeasonManager.getInstance();
const environmentTimeManager = EnvironmentTimeManager.getInstance();
// ─── Loader progress bar sizing ──────────────────────────────────────────────
const setProgressBarWidth = () => {
  if (loaderTitle && loaderProgress) {
    (loaderProgress as HTMLElement).style.width = `${(loaderTitle as HTMLElement).offsetWidth}px`;
  }
};
window.addEventListener('load', setProgressBarWidth);
window.addEventListener('resize', setProgressBarWidth);

// ─── Resource loading ─────────────────────────────────────────────────────────
const resources = new ResourceLoader(ASSETS);

const getLoadingMessage = (id: string, itemsLoaded: number, itemsTotal: number): string => {
  const messages = [
    'Preparing the world',
    'Placing hexagonal tiles',
    'Gathering resources',
    'Building settlements',
    'Charting trade routes',
    'Rolling the dice',
    'Summoning the robber',
    'Counting victory points',
    'Negotiating trades',
    'Raising cities',
  ];
  const assetType = id.includes('.gltf') || id.includes('.glb') ? '3D Model'
    : id.includes('.jpg') || id.includes('.png') || id.includes('.webp') ? 'Texture'
    : id.includes('.mp3') || id.includes('.wav') || id.includes('.ogg') ? 'Audio'
    : id.includes('.hdr') ? 'Environment'
    : id.includes('.bin') ? 'Binary Data'
    : 'Asset';
  const idx = Math.floor((itemsLoaded - 1) / Math.max(1, Math.floor(itemsTotal / messages.length)));
  const dots = '.'.repeat((itemsLoaded % 4) + 1);
  return `${messages[idx % messages.length]}${dots} ${assetType} (${itemsLoaded}/${itemsTotal})`;
};

resources.on('progress', ({ id, itemsLoaded, itemsTotal, percent }: any) => {
  if (progressBar) (progressBar as HTMLElement).style.width = `${percent}%`;
  if (loaderText) loaderText.innerHTML = getLoadingMessage(id, itemsLoaded, itemsTotal).replace('\n', '<br>');
});

resources.on('error', ({ id, itemsLoaded, itemsTotal }: any) => {
  if (loaderText) loaderText.innerHTML = `⚠️ Failed to load asset&hellip;<br>(${itemsLoaded}/${itemsTotal})`;
  console.error(`Failed to load: ${id}`);
});

resources.on('loaded', () => {
  if (progressBar) (progressBar as HTMLElement).style.width = '100%';

  // Auto-start without waiting for button click
  setTimeout(() => {
    try {
      const game = new CatanGame(
        document.getElementById('three'),
        resources,
        isDebugMode,
        false // no music by default
      );
      gameRef = game;

      // Skip reveal animation — go straight to game
      loader?.classList.add('hidden');
      setTimeout(() => {
        if (loader) (loader as HTMLElement).style.display = 'none';
        if (controlPanel) {
          controlPanel.removeAttribute('style');
          controlPanel.classList.add('show');
          controlPanel.style.display = 'flex';
          controlPanel.style.opacity = '1';
        }
        pageTitle?.removeAttribute('style'); pageTitle?.classList.add('show');
        initializeSeasonUI();
        initializeDayNightUI();
        initializeAudioUI(game);
        initCatanGameplay(game);
        document.dispatchEvent(new CustomEvent('gameStarted'));
      }, 300);
    } catch (err) {
      console.error('Game init failed:', err);
      loaderText!.innerHTML = `⚠️ Başlatma hatası:<br><code style="font-size:.75rem">${(err as any).message}</code>`;
    }
  }, 200);
});

// ─── Season mapping ───────────────────────────────────────────────────────────
const seasonMapping: Record<string, string> = { spring: 'spring', autumn: 'autumn', winter: 'winter', rain: 'rainy' };
const reverseSeasonMapping: Record<string, string> = { spring: 'spring', autumn: 'autumn', winter: 'winter', rainy: 'rain' };

const handleSeasonToggle = (event: Event) => {
  const btn       = event.currentTarget as HTMLElement;
  const uiSeason  = btn.dataset.season ?? '';
  const mgr       = seasonMapping[uiSeason];
  if (seasonManager.currentSeason === mgr) return;
  Haptics.buttonTap();
  seasonButtons.forEach((b: any) => b.classList.remove('active'));
  btn.classList.add('active');
  seasonManager.setSeason(mgr as any);
  gameRef?.toastManager?.showSeasonToast(mgr);
};

seasonButtons.forEach((btn: any) => btn.addEventListener('click', handleSeasonToggle));

seasonManager.onChange((newSeason: any) => {
  const uiSeason = reverseSeasonMapping[newSeason];
  seasonButtons.forEach((btn: any) => {
    btn.classList.toggle('active', btn.dataset.season === uiSeason);
  });
});

const initializeSeasonUI = () => {
  const uiSeason = reverseSeasonMapping[seasonManager.currentSeason];
  seasonButtons.forEach((btn: any) => {
    btn.classList.toggle('active', btn.dataset.season === uiSeason);
  });
};

// ─── Day / Night ──────────────────────────────────────────────────────────────
const handleDayNightToggle = (event: Event) => {
  const btn  = event.currentTarget as HTMLElement;
  const time = btn.dataset.time;
  if (environmentTimeManager.envTime === time) return;
  Haptics.buttonTap();
  dayNightButtons.forEach((b: any) => b.classList.remove('active'));
  btn.classList.add('active');
  environmentTimeManager.setTime(time);
  gameRef?.toastManager?.showDayNightToast(time);
};

dayNightButtons.forEach((btn: any) => btn.addEventListener('click', handleDayNightToggle));

environmentTimeManager.onChange((newTime: string) => {
  dayNightButtons.forEach((btn: any) => {
    btn.classList.toggle('active', btn.dataset.time === newTime);
  });
});

const initializeDayNightUI = () => {
  const currentTime = environmentTimeManager.envTime;
  dayNightButtons.forEach((btn: any) => {
    btn.classList.toggle('active', btn.dataset.time === currentTime);
  });
};

// ─── Music control (mute toggle) ──────────────────────────────────────────────
let isMuted = true; // starts muted (no music by default)
if (musicControl) {
  musicControl.addEventListener('click', () => {
    Haptics.buttonTap();
    isMuted = !isMuted;
    const icon = musicControl.querySelector('i') as HTMLElement | null;
    const game = gameRef;
    if (isMuted) {
      if (icon) icon.className = 'fa-solid fa-volume-xmark';
      musicControl.classList.remove('active');
      if (game?.audioManager) {
        game.audioManager.setMasterVolume(0);
        game.audioManager.setMusicVolume(0);
        game.audioManager.setSoundVolume(0);
      }
      // Stop ambient sounds
      if (game?.ambientSoundManager) {
        game.ambientSoundManager._globalMuted = true;
        game.ambientSoundManager.stopAllAmbientSounds();
      }
      // Pause music
      if (game?.musicManager) {
        game.musicManager.pause?.();
      }
    } else {
      if (icon) icon.className = 'fa-solid fa-volume-high';
      musicControl.classList.add('active');
      if (game?.audioManager) {
        game.audioManager.setMasterVolume(((masterVolumeInput as any)?.value ?? 80) / 100);
        game.audioManager.setMusicVolume(((musicVolumeInput as any)?.value ?? 60) / 100);
        game.audioManager.setSoundVolume(((soundVolumeInput as any)?.value ?? 70) / 100);
      }
      if (game?.ambientSoundManager) {
        game.ambientSoundManager._globalMuted = false;
        game.ambientSoundManager.updateAmbientSounds();
      }
      if (game?.musicManager) {
        game.musicManager.resume?.();
      }
    }
  });
}

// ─── Settings modal ───────────────────────────────────────────────────────────
const openSettings = () => {
  if (!settingsOverlay) return;
  (settingsOverlay as HTMLElement).style.display = '';
  settingsOverlay.classList.remove('hidden');
  settingsOverlay.classList.add('visible');
};

const closeSettings = () => {
  if (!settingsOverlay) return;
  settingsOverlay.classList.remove('visible');
  setTimeout(() => {
    settingsOverlay.classList.add('hidden');
    (settingsOverlay as HTMLElement).style.display = 'none';
  }, 250);
};

if (settingsBtn)   settingsBtn.addEventListener('click', openSettings);
if (settingsClose) settingsClose.addEventListener('click', closeSettings);

settingsOverlay?.addEventListener('click', (e) => {
  if (e.target === settingsOverlay) closeSettings();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSettings();
});

// ─── Modal tabs ───────────────────────────────────────────────────────────────
modalTabs.forEach((tab: any) => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    modalTabs.forEach((t: any)   => t.classList.remove('active'));
    tabContents.forEach((c: any) => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${target}`)?.classList.add('active');
  });
});

// ─── Audio sliders ────────────────────────────────────────────────────────────
const initializeAudioUI = (game: any) => {
  const am = game?.audioManager;
  if (!am) return;

  const syncSlider = (input: any, valueEl: any, getter: () => number, setter: (v: number) => void) => {
    if (!input) return;
    input.value = Math.round(getter() * 100);
    if (valueEl) valueEl.textContent = `${input.value}%`;
    input.addEventListener('input', () => {
      const v = input.value / 100;
      setter(v);
      if (valueEl) valueEl.textContent = `${input.value}%`;
    });
  };

  syncSlider(masterVolumeInput, masterVolumeValue,
    () => am.masterVolume, (v) => am.setMasterVolume(v));
  syncSlider(musicVolumeInput,  musicVolumeValue,
    () => am.musicVolume,  (v) => am.setMusicVolume(v));
  syncSlider(soundVolumeInput,  soundVolumeValue,
    () => am.soundVolume,  (v) => am.setSoundVolume(v));
};

// ─── Graphics quality ─────────────────────────────────────────────────────────
const qualityDescriptions: Record<string, string> = {
  low:    'Minimal grass, basic shadows, no particles. Best for low-end devices.',
  medium: 'Balanced grass density, standard shadows, moderate particle effects. Good for most devices.',
  high:   'Dense grass, high-quality shadows, full particle effects. Requires a capable GPU.',
  ultra:  'Maximum detail, real-time reflections, volumetric effects. High-end GPU required.',
};

const updateQualityAffects = (quality: string) => {
  if (qualityAffects) qualityAffects.innerHTML =
    `<span class="affects-label">AFFECTS:</span> ${qualityDescriptions[quality] ?? ''}`;
};

graphicsQuality?.addEventListener('change', () => {
  const quality = (graphicsQuality as any).value;
  updateQualityAffects(quality);
  window.dispatchEvent(new CustomEvent('graphicsQualityChanged', { detail: { quality } }));
});

// initialise affects text on load
updateQualityAffects((graphicsQuality as any)?.value ?? 'medium');

// ─── Catan Gameplay (raycaster + game state + HUD) ───────────────────────────

function initCatanGameplay(game: any) {
  const board = game.world?.catanBoard;
  if (!board) { console.warn('No CatanBoard found'); return; }

  const gameState = new CatanGameState(gameMode, activeBoardData!);
  catanStateRef = gameState;

  const canvas = document.getElementById('three')!;
  const camera = game.camera.cameraInstance;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  // Drag detection
  let downX = 0, downY = 0, wasDrag = false;
  canvas.addEventListener('pointerdown', e => { downX = e.clientX; downY = e.clientY; wasDrag = false; });
  canvas.addEventListener('pointerup', e => {
    const dx = e.clientX - downX, dy = e.clientY - downY;
    wasDrag = Math.sqrt(dx * dx + dy * dy) > 6;
  });
  let hoveredMarker: any = null;
  let hiddenSettlement: any = null; // settlement hidden during city-upgrade hover

  canvas.addEventListener('pointermove', e => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Hover detection for markers
    raycaster.setFromCamera(pointer, camera);
    const allMarkers = [
      ...[...board.intersectionMeshes.values()].filter(g => g.visible),
      ...[...board.edgeMeshes.values()].filter(g => g.visible),
      ...(board.hexMarkers ? [...board.hexMarkers.values()].filter(g => g.visible) : []),
    ];
    const hits = raycaster.intersectObjects(allMarkers, true);

    // Find parent group with userData
    let hit: any = null;
    if (hits.length > 0) {
      let obj: any = hits[0].object;
      while (obj && !obj.userData?.type) obj = obj.parent;
      if (obj?.userData?.type) hit = obj;
    }

    // Unhover previous
    if (hoveredMarker && hoveredMarker !== hit) {
      const op = hoveredMarker.userData.hoverOnly ? 0 : hoveredMarker.userData.defaultOpacity;
      board._setMarkerOpacity(hoveredMarker, op);
      // Restore hidden settlement
      if (hiddenSettlement) { hiddenSettlement.visible = true; hiddenSettlement = null; }
      hoveredMarker = null;
      canvas.style.cursor = '';
    }

    // Hover new — brighten the ghost silhouette
    if (hit && hit !== hoveredMarker) {
      hoveredMarker = hit;
      board._setMarkerOpacity(hit, hit.userData.hoverOpacity);
      canvas.style.cursor = 'pointer';

      // City upgrade hover: hide the settlement underneath
      if (hit.userData.type === 'intersection' && hit.userData.ghostType === 'city') {
        const settlement = board.findSettlementAt(hit.userData.id);
        if (settlement) { settlement.visible = false; hiddenSettlement = settlement; }
      }
    }
  });

  // ── Update markers visibility based on game state ────────────────────
  function updateMarkers() {
    const validInts = gameState.getValidIntersections();
    const validEdges = gameState.getValidEdges();
    // idle mode: markers invisible until hovered (hoverOnly=true)
    // explicit action mode (settlement/road/city): show silhouettes at all valid positions
    const isIdle = gameState.actionMode === 'idle';
    board.showIntersections(validInts, isIdle);
    board.showEdges(validEdges, isIdle);
  }

  // ── Sync 3D pieces with game state ───────────────────────────────────
  function syncPieces() {
    // Clear existing pieces — copy array to avoid mutation-during-iteration issues
    const oldChildren = [...board.piecesGroup.children];
    for (const child of oldChildren) {
      board.piecesGroup.remove(child);
    }

    const graph = gameState.graph;
    const allOccupied = new Set(
      gameState.players.flatMap(p => [...p.settlements, ...p.cities])
    );

    // Helper: compute connection angles for an intersection
    function getAngles(intId: any, inter: any, roadSet: any) {
      return inter.adjacentEdges
        .filter((eid: any) => roadSet.has(eid))
        .map((eid: any) => {
          const edge = graph.edges.get(eid);
          if (!edge) return 0;
          const otherId = edge.intersections[0] === intId ? edge.intersections[1] : edge.intersections[0];
          const other = graph.intersections.get(otherId);
          if (!other) return 0;
          const dx = (other.x - inter.x) * board.COORD_SCALE;
          const dz = (other.y - inter.y) * board.COORD_SCALE;
          return (Math.atan2(dx, dz) * 180) / Math.PI;
        });
    }

    // Build a map: intId → Set of player IDs whose roads touch it
    const roadTouches = new Map();
    for (const player of gameState.players) {
      for (const edgeId of player.roads) {
        const edge = graph.edges.get(edgeId);
        if (!edge) continue;
        for (const intId of edge.intersections) {
          if (!roadTouches.has(intId)) roadTouches.set(intId, new Set());
          roadTouches.get(intId).add(player.id);
        }
      }
    }

    // Already placed junction nodes (avoid duplicates)
    const placedJunctions = new Set();

    for (const player of gameState.players) {
      const myRoads = new Set(player.roads);

      // Road junctions — intersections where this player has roads but no building
      for (const [intId, inter] of graph.intersections) {
        if (allOccupied.has(intId)) continue;
        if (placedJunctions.has(intId)) continue;

        const touchingRoads = inter.adjacentEdges.filter((eid: any) => myRoads.has(eid));
        if (touchingRoads.length < 1) continue;

        // Check if multiple players' roads meet here → neutral (gray)
        const playersHere = roadTouches.get(intId);
        const isShared = playersHere && playersHere.size > 1;

        // Get ALL road angles at this intersection (from all players)
        const allRoads = new Set(gameState.players.flatMap(p => p.roads));
        const allAngles = inter.adjacentEdges
          .filter((eid: any) => allRoads.has(eid))
          .map((eid: any) => {
            const edge = graph.edges.get(eid);
            if (!edge) return 0;
            const otherId = edge.intersections[0] === intId ? edge.intersections[1] : edge.intersections[0];
            const other = graph.intersections.get(otherId);
            if (!other) return 0;
            const dx = (other.x - inter.x) * board.COORD_SCALE;
            const dz = (other.y - inter.y) * board.COORD_SCALE;
            return (Math.atan2(dx, dz) * 180) / Math.PI;
          });

        board.placeRoadNode(intId, isShared ? '#8a9ab0' : player.color, allAngles, isShared);
        placedJunctions.add(intId);
      }

      // Roads
      for (const edgeId of player.roads) {
        board.placeRoad(edgeId, player.color);
      }

      // Settlements (with road node underneath — shows ALL connected road arms)
      for (const intId of player.settlements) {
        if (placedJunctions.has(intId)) continue; // avoid duplicate node
        const inter = graph.intersections.get(intId);
        if (!inter) continue;
        // Get angles from ALL players' roads touching this intersection
        const allPlayerRoads = new Set(gameState.players.flatMap(p => p.roads));
        const angles = getAngles(intId, inter, allPlayerRoads);
        board.placeRoadNode(intId, player.color, angles, false);
        board.placeSettlement(intId, player.color);
        placedJunctions.add(intId);
      }

      // Cities (with road node underneath — shows ALL connected road arms)
      for (const intId of player.cities) {
        if (placedJunctions.has(intId)) continue;
        const inter = graph.intersections.get(intId);
        if (!inter) continue;
        const allPlayerRoads = new Set(gameState.players.flatMap(p => p.roads));
        const angles = getAngles(intId, inter, allPlayerRoads);
        board.placeRoadNode(intId, player.color, angles, false);
        board.placeCity(intId, player.color);
        placedJunctions.add(intId);
      }
    }
  }

  // ── Sync robber position ──────────────────────────────────────────────
  function syncRobber() {
    const isRobberMode = gameState.actionMode === 'robber';
    board.placeRobber(gameState.robberHex, isRobberMode);
    if (isRobberMode) {
      board.showHexMarkers(gameState.robberHex);
    } else {
      board.hideHexMarkers();
    }
  }

  // ── Game state change handler ────────────────────────────────────────
  gameState.onChange(() => {
    updateMarkers();
    syncPieces();
    syncRobber();
    updateHUD();
  });

  // ── Click handler (raycasting) ───────────────────────────────────────
  canvas.addEventListener('click', () => {
    if (wasDrag) return;

    raycaster.setFromCamera(pointer, camera);

    // Check intersection markers (Groups — raycast recursive, find parent id)
    const intHits = raycaster.intersectObjects(
      [...board.intersectionMeshes.values()].filter(g => g.visible),
      true
    );
    if (intHits.length > 0) {
      // Walk up to find the Group with userData.id
      let obj: any = intHits[0].object;
      while (obj && !obj.userData?.id) obj = obj.parent;
      if (obj?.userData?.id) {
        gameState.handleIntersectionClick(obj.userData.id);
        return;
      }
    }

    // Check edge markers (Groups — raycast recursive)
    const edgeHits = raycaster.intersectObjects(
      [...board.edgeMeshes.values()].filter(g => g.visible),
      true
    );
    if (edgeHits.length > 0) {
      let obj: any = edgeHits[0].object;
      while (obj && !obj.userData?.id) obj = obj.parent;
      if (obj?.userData?.id) {
        gameState.handleEdgeClick(obj.userData.id);
        return;
      }
    }

    // Robber mode — click on hex markers or hex tiles to move robber
    if (gameState.actionMode === 'robber') {
      // First check hex markers (floating circles)
      const hexMarkerHits = raycaster.intersectObjects(
        [...board.hexMarkers.values()].filter((g: any) => g.visible),
        true
      );
      if (hexMarkerHits.length > 0) {
        let obj: any = hexMarkerHits[0].object;
        while (obj && !obj.userData?.id) obj = obj.parent;
        if (obj?.userData?.id) {
          gameState.handleHexClick(obj.userData.id);
          return;
        }
      }
      // Fallback: click on hex tiles directly
      const allHexMeshes: any[] = [];
      board.group.traverse((child: any) => {
        if (child.isMesh && child.userData.hexKey) allHexMeshes.push(child);
      });
      const hexHits = raycaster.intersectObjects(allHexMeshes, false);
      if (hexHits.length > 0) {
        const hexKey = hexHits[0].object.userData.hexKey;
        if (hexKey) {
          gameState.handleHexClick(hexKey);
          return;
        }
      }
    }
  });

  // ── Create HUD overlay ───────────────────────────────────────────────
  document.getElementById('catan-hud')?.remove(); // clean up any leftover
  const hud = document.createElement('div');
  hud.id = 'catan-hud';
  hud.innerHTML = `
    <div id="hud-phase" style="position:fixed;top:12px;left:50%;transform:translateX(-50%);
      background:rgba(8,15,30,0.90);border:1px solid rgba(255,255,255,0.12);
      border-radius:8px;padding:8px 20px;backdrop-filter:blur(8px);z-index:50;
      display:flex;align-items:center;gap:12px;font-family:Inter,sans-serif;">
      <span id="hud-player" style="font-weight:700;font-size:13px;"></span>
      <span id="hud-action" style="font-size:12px;color:rgba(255,255,255,0.5);"></span>
      <button id="hud-roll" style="display:none;padding:4px 16px;background:rgba(255,215,0,0.15);
        color:#ffd700;border:1px solid rgba(255,215,0,0.4);border-radius:5px;font-weight:700;
        font-size:11px;cursor:pointer;">🎲 ROLL</button>
      <span id="hud-dice" style="display:none;font-weight:900;font-size:14px;"></span>
      <button id="hud-build-set" style="display:none;padding:3px 10px;font-size:10px;font-weight:700;
        cursor:pointer;border-radius:4px;border:1px solid rgba(255,255,255,0.15);
        background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);">SET</button>
      <button id="hud-build-city" style="display:none;padding:3px 10px;font-size:10px;font-weight:700;
        cursor:pointer;border-radius:4px;border:1px solid rgba(255,255,255,0.15);
        background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);">CITY</button>
      <button id="hud-build-road" style="display:none;padding:3px 10px;font-size:10px;font-weight:700;
        cursor:pointer;border-radius:4px;border:1px solid rgba(255,255,255,0.15);
        background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);">ROAD</button>
      <button id="hud-next" style="display:none;padding:4px 16px;background:rgba(22,163,74,0.20);
        color:#4ade80;border:1px solid rgba(22,163,74,0.4);border-radius:5px;font-weight:700;
        font-size:11px;cursor:pointer;">NEXT ✓</button>
    </div>
  `;
  document.body.appendChild(hud);

  // HUD buttons
  const rollBtn = document.getElementById('hud-roll');
  const nextBtn = document.getElementById('hud-next');
  const setBtn = document.getElementById('hud-build-set');
  const cityBtn = document.getElementById('hud-build-city');
  const roadBtn = document.getElementById('hud-build-road');

  rollBtn?.addEventListener('click', () => gameState.rollDice());
  nextBtn?.addEventListener('click', () => gameState.endTurn());
  setBtn?.addEventListener('click', () => gameState.setActionMode('settlement'));
  cityBtn?.addEventListener('click', () => gameState.setActionMode('city'));
  roadBtn?.addEventListener('click', () => gameState.setActionMode('road'));

  function updateHUD() {
    const p = gameState.currentPlayer;
    const playerEl = document.getElementById('hud-player') as HTMLElement | null;
    const actionEl = document.getElementById('hud-action') as HTMLElement | null;
    const diceEl = document.getElementById('hud-dice') as HTMLElement | null;

    if (!playerEl || !actionEl || !diceEl) return;

    playerEl.textContent = p.name;
    playerEl.style.color = p.color;

    const show = (el: HTMLElement | null) => { if (el) { el.style.display = 'inline-block'; el.style.visibility = 'visible'; } };
    const hide = (el: HTMLElement | null) => { if (el) el.style.display = 'none'; };

    if (gameState.isSetup) {
      actionEl.textContent = gameState.actionMode === 'settlement' ? '▸ Settlement yerleştir' : '▸ Road yerleştir';
      hide(rollBtn); hide(nextBtn); hide(setBtn); hide(cityBtn); hide(roadBtn); hide(diceEl);
    } else if (gameState.actionMode === 'robber') {
      actionEl.textContent = '☠ 7 geldi — Robber taşı';
      hide(rollBtn); hide(nextBtn); hide(diceEl);
    } else {
      actionEl.textContent = gameState.actionMode === 'idle' ? '' : `▸ ${gameState.actionMode}`;
      if (!gameState.diceRolled) { show(rollBtn); hide(nextBtn); hide(setBtn); hide(cityBtn); hide(roadBtn); }
      else { hide(rollBtn); show(nextBtn); show(setBtn); show(cityBtn); show(roadBtn); }

      if (gameState.diceValues) {
        show(diceEl);
        const total = gameState.diceTotal;
        diceEl.textContent = `🎲 ${gameState.diceValues[0]}+${gameState.diceValues[1]}=${total}`;
        diceEl.style.color = total === 7 ? '#ff4444' : '#ffd700';
      } else {
        hide(diceEl);
      }
    }
  }

  // Initial state
  updateMarkers();
  syncRobber();
  updateHUD();
}

} // end initCatan
