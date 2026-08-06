// src/games/chateau/scene.ts
import * as THREE from "three";
import { PLOT_SIZE, CELL_SIZE } from "./constants";

export interface SceneRig {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
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

export function plotCenter(): number {
  return (PLOT_SIZE * CELL_SIZE) / 2;
}

export function createSceneRig(canvas: HTMLCanvasElement): SceneRig {
  const scene = new THREE.Scene();
  scene.background = skyTexture();

  const center = plotCenter();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(center + 16, 16, center + 16);
  camera.lookAt(center, 0, center); // orientation de départ ; ensuite le vol libre (fly-controls.ts) prend le relais

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff3d6, 1.4);
  sun.position.set(center + 20, 30, center + 10);
  sun.target.position.set(center, 0, center);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const shadowSpan = PLOT_SIZE * CELL_SIZE;
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

  return { scene, camera, renderer };
}
