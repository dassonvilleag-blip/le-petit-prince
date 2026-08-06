// src/games/chateau/main.ts (temporaire — sera remplacé Task 11)
import { createSceneRig } from "./scene";

const canvas = document.getElementById("scene") as HTMLCanvasElement;
const { scene, camera, renderer, controls } = createSceneRig(canvas);

function frame(): void {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

export {};
