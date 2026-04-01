import './models.scss';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import gsap from 'gsap';
import { REGISTRY, getModel, loadHexModels } from './models/registry';
import { setStyle } from './models/materials';
import { listStyles, loadStyle } from './models/styleLoader';

// ─── DOM ──────────────────────────────────────────────────────────────────────
const canvas     = document.getElementById('models-canvas') as HTMLCanvasElement;
const canvasWrap = document.getElementById('models-canvas-wrap') as HTMLElement;
const canvasHint = document.getElementById('canvas-hint') as HTMLElement | null;
const modelItems = document.querySelectorAll('.model-item') as NodeListOf<HTMLElement>;
const styleList  = document.getElementById('style-list') as HTMLElement;
const styleBadge = document.getElementById('style-badge') as HTMLElement;
const btnExport  = document.getElementById('btn-export-glb') as HTMLButtonElement;

const infoName     = document.getElementById('info-name') as HTMLElement;
const infoCategory = document.getElementById('info-category') as HTMLElement;
const infoDesc     = document.getElementById('info-desc') as HTMLElement;
const statType     = document.getElementById('stat-type') as HTMLElement;
const statMats     = document.getElementById('stat-materials') as HTMLElement;
const statGeo      = document.getElementById('stat-geo') as HTMLElement;

// ─── Renderer ─────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = 1.4;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ─── Scene ────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xede8e4);
scene.fog = new THREE.Fog(0xede8e4, 8, 18);

// ─── Camera ───────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
camera.position.set(2.2, 1.8, 3.2);
camera.lookAt(0, 0.5, 0);

// ─── Controls ─────────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, canvas as any);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 1.4;
controls.maxDistance = 7;
controls.target.set(0, 0.4, 0);
controls.update();

let isDragging = false;
controls.addEventListener('start', () => { isDragging = true; });
controls.addEventListener('end',   () => { isDragging = false; });

// ─── Lights ───────────────────────────────────────────────────────────────────
const keyLight = new THREE.DirectionalLight(0xfff4e6, 2.0);
keyLight.position.set(-5, 8, 6);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.near = 0.1;
keyLight.shadow.camera.far = 30;
keyLight.shadow.camera.left = keyLight.shadow.camera.bottom = -4;
keyLight.shadow.camera.right = keyLight.shadow.camera.top   =  4;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x87ceeb, 0.55);
fillLight.position.set(6, 4, -4);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffd7a3, 0.3);
rimLight.position.set(3, 6, -8);
scene.add(rimLight);

const ambientLight = new THREE.AmbientLight(0xfff8f0, 0.45);
scene.add(ambientLight);

function applyStyleLighting(style: any) {
  if (!style?.lighting) return;
  const l = style.lighting;
  if (l.keyColor     !== undefined) keyLight.color.setHex(l.keyColor);
  if (l.keyIntensity !== undefined) keyLight.intensity = l.keyIntensity;
  if (l.fillColor    !== undefined) fillLight.color.setHex(l.fillColor);
  if (l.fillIntensity!== undefined) fillLight.intensity = l.fillIntensity;
  if (l.rimColor     !== undefined) rimLight.color.setHex(l.rimColor);
  if (l.rimIntensity !== undefined) rimLight.intensity = l.rimIntensity;
  if (l.ambientColor !== undefined) ambientLight.color.setHex(l.ambientColor);
  if (l.ambientIntensity !== undefined) ambientLight.intensity = l.ambientIntensity;
  renderer.toneMappingExposure = style.toneMappingExposure ?? 1.4;
}

// ─── Ground plane ─────────────────────────────────────────────────────────────
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(4, 32),
  new THREE.MeshStandardMaterial({ color: 0xe5dfd9, roughness: 0.92 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const gridHelper = new THREE.GridHelper(6, 12, 0xd0c8c0, 0xd0c8c0);
gridHelper.position.y = 0.001;
gridHelper.material.opacity = 0.35;
gridHelper.material.transparent = true;
scene.add(gridHelper);

// ─── Model state ──────────────────────────────────────────────────────────────
let currentGroup: THREE.Group | null   = null;
let currentModelId = 'settlement';
let currentStyleId = 'elemental-serenity';

function normalizeGroup(grp: THREE.Group) {
  const box = new THREE.Box3().setFromObject(grp);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) grp.scale.setScalar(1.4 / maxDim);

  box.setFromObject(grp);
  const center = new THREE.Vector3();
  box.getCenter(center);
  grp.position.x -= center.x;
  grp.position.z -= center.z;
  grp.position.y -= box.min.y;
}

function loadModel(id: string) {
  const meta = getModel(id);
  if (!meta) return;
  currentModelId = id;

  // Remove previous
  if (currentGroup) {
    const prev = currentGroup;
    gsap.to(prev.scale, {
      x: 0, y: 0, z: 0, duration: 0.2, ease: 'power2.in',
      onComplete: () => { scene.remove(prev); },
    });
  }

  const grp = meta.create();
  normalizeGroup(grp);
  grp.scale.setScalar(0.01);
  scene.add(grp);
  currentGroup = grp;

  gsap.to(grp.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'back.out(1.6)' });
  gsap.to(camera.position, { x: 2.2, y: 1.8, z: 3.2, duration: 0.6, ease: 'power2.out' });
  gsap.to(controls.target, { x: 0, y: 0.4, z: 0, duration: 0.6, ease: 'power2.out' });

  infoName.textContent     = meta.name;
  infoCategory.textContent = meta.category;
  infoDesc.textContent     = meta.description;
  statType.textContent     = meta.type;
  statMats.textContent     = String(meta.materials);
  statGeo.textContent      = meta.geo;

  modelItems.forEach((item) => {
    item.classList.toggle('active', item.dataset.modelId === id);
  });
}

// ─── Style system ─────────────────────────────────────────────────────────────
async function applyStyle(styleId: string) {
  try {
    const style: any = await loadStyle(styleId);
    currentStyleId = styleId;
    setStyle(style);
    applyStyleLighting(style);

    // Update style badge on canvas
    const preview = `#${(style.palette?.settlementWall ?? 0xd4956a).toString(16).padStart(6, '0')}`;
    styleBadge.innerHTML = `<span class="badge-swatch" style="background:${preview}"></span>${style.name ?? styleId}`;

    // Mark active in list
    document.querySelectorAll('.style-item').forEach((el: any) => {
      el.classList.toggle('active', el.dataset.styleId === styleId);
    });

    // Reload current model with new style
    if (currentModelId) loadModel(currentModelId);
  } catch (err) {
    console.error('Style load error:', err);
  }
}

async function initStyles() {
  try {
    const styles = await listStyles();
    styleList.innerHTML = '';

    styles.forEach((s) => {
      const btn = document.createElement('button');
      btn.className = 'style-item';
      btn.dataset.styleId = s.id;

      const swatch = document.createElement('span');
      swatch.className = 'style-swatch';
      swatch.style.background = s.preview ?? '#aaa';

      const name = document.createElement('span');
      name.className = 'style-name';
      name.textContent = s.name;

      btn.append(swatch, name);
      btn.addEventListener('click', () => applyStyle(s.id));
      styleList.appendChild(btn);
    });

    // Load hex terrain models (async, non-blocking)
    loadHexModels().catch(e => console.warn('Hex models load error:', e));

    // Apply default style
    await applyStyle('elemental-serenity');
  } catch (err) {
    console.error('Could not load styles:', err);
    styleList.innerHTML = '<p style="font-size:.72rem;color:rgba(0,0,0,.4);padding:8px 10px">Style yüklenemedi</p>';
    // Fall back: use default (null) style and load model
    setStyle(null);
    loadModel('settlement');
  }
}

// ─── Sidebar click handlers ───────────────────────────────────────────────────
modelItems.forEach((item) => {
  item.addEventListener('click', () => loadModel(item.dataset.modelId!));
});

// ─── Resize ───────────────────────────────────────────────────────────────────
function resize() {
  const w = canvasWrap.clientWidth;
  const h = canvasWrap.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize);

// ─── Animation loop ───────────────────────────────────────────────────────────
const clock = new THREE.Clock();
(function animate() {
  requestAnimationFrame(animate);
  controls.update();
  if (currentGroup && !isDragging) {
    (currentGroup as any).rotation.y += clock.getDelta() * 0.4;
  } else {
    clock.getDelta(); // consume delta
  }
  renderer.render(scene, camera);
})();

// ─── Hint fade ────────────────────────────────────────────────────────────────
setTimeout(() => canvasHint?.classList.add('fade'), 4000);

// ─── GLB Export ───────────────────────────────────────────────────────────────
function exportGLB() {
  if (!currentGroup) return;
  btnExport.disabled = true;
  btnExport.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Hazırlanıyor…';

  new GLTFExporter().parse(
    currentGroup,
    (gltf) => {
      const blob = new Blob([gltf as any], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentModelId}-${currentStyleId}.glb`;
      a.click();
      URL.revokeObjectURL(url);
      btnExport.disabled = false;
      btnExport.innerHTML = '<i class="fa-solid fa-download"></i> GLB İndir';
    },
    (err) => {
      console.error('GLTFExporter error:', err);
      btnExport.disabled = false;
      btnExport.innerHTML = '<i class="fa-solid fa-download"></i> GLB İndir';
    },
    { binary: true }
  );
}
btnExport.addEventListener('click', exportGLB);

// ─── Boot ─────────────────────────────────────────────────────────────────────
initStyles();
