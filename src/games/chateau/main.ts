// src/games/chateau/main.ts (sera complété Task 9-12)
import * as THREE from "three";
import { createSceneRig } from "./scene";
import { createHeightmap, raiseVertex, lowerVertex } from "./terrain";
import { createTerrainMesh, createWaterMesh, updateTerrainMesh, nearestVertex } from "./terrain-mesh";

const canvas = document.getElementById("scene") as HTMLCanvasElement;
const { scene, camera, renderer, controls } = createSceneRig(canvas);

let terrain = createHeightmap();
const terrainMesh = createTerrainMesh(terrain);
scene.add(terrainMesh);
scene.add(createWaterMesh());

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(terrainMesh)[0];
  if (!hit) return;
  const { x, z } = nearestVertex(hit.point);
  terrain = event.shiftKey ? lowerVertex(terrain, x, z) : raiseVertex(terrain, x, z);
  updateTerrainMesh(terrainMesh, terrain);
});

function frame(): void {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

export {};
