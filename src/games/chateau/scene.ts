// src/games/chateau/scene.ts
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GRID_SIZE, CELL_SIZE } from "./constants";

export interface SceneRig {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
}

function skyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, "#bfe6ff");
  gradient.addColorStop(1, "#eaf7ff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function gridCenter(): number {
  return (GRID_SIZE * CELL_SIZE) / 2;
}

export function createSceneRig(canvas: HTMLCanvasElement): SceneRig {
  const scene = new THREE.Scene();
  scene.background = skyTexture();

  const center = gridCenter();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(center + 14, 12, center + 14);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(center, 0, center);
  controls.enablePan = true;
  // false = le panoramique déplace la cible sur le plan du sol (X/Z), pas dans l'espace
  // écran de la caméra — essentiel pour une caméra "diorama" qui ne doit pas dériver en Y.
  controls.screenSpacePanning = false;
  controls.minDistance = 4;
  controls.maxDistance = 60;
  controls.maxPolarAngle = Math.PI * 0.49; // jamais à l'horizontale stricte
  controls.minPolarAngle = 0.05; // jamais à la verticale stricte (vue de dessus pure)
  // Le clic gauche est réservé à la construction (main.ts) — -1 ne correspond à aucune
  // action connue de OrbitControls (ROTATE/DOLLY/PAN), donc ce bouton est un no-op pour
  // la caméra, vérifié directement dans node_modules/three/.../OrbitControls.js (le
  // switch interne tombe sur son cas "default" et ne fait rien). Molette = zoom, toujours
  // actif indépendamment de mouseButtons.
  controls.mouseButtons.LEFT = -1;
  controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
  controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
  controls.update();

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff3d6, 1.3);
  sun.position.set(center + 20, 30, center + 10);
  sun.target.position.set(center, 0, center);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const shadowSpan = GRID_SIZE * CELL_SIZE;
  sun.shadow.camera.left = -shadowSpan;
  sun.shadow.camera.right = shadowSpan;
  sun.shadow.camera.top = shadowSpan;
  sun.shadow.camera.bottom = -shadowSpan;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 100;
  scene.add(sun, sun.target);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer, controls };
}
