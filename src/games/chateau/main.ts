// src/games/chateau/main.ts
import * as THREE from "three";
import { createSceneRig } from "./scene";
import { createHeightmap, raiseVertex, lowerVertex, type Heightmap } from "./terrain";
import { createTerrainMesh, createWaterMesh, updateTerrainMesh, nearestVertex } from "./terrain-mesh";
import { PIECES } from "./pieces";
import { MATERIALS, DEFAULT_MATERIAL_ID } from "./materials";
import { buildPieceMesh } from "./piece-geometry";
import { threeMaterialFor, preloadAllMaterials } from "./materials-three";
import { resolvePlacement, removeTopPiece, type PlacedPiece, type Rotation } from "./placement";
import { CELL_SIZE } from "./constants";

const canvas = document.getElementById("scene") as HTMLCanvasElement;
const { scene, camera, renderer, controls } = createSceneRig(canvas);
preloadAllMaterials();

let terrain: Heightmap = createHeightmap();
const terrainMesh = createTerrainMesh(terrain);
scene.add(terrainMesh);
scene.add(createWaterMesh());

let placedPieces: PlacedPiece[] = [];
const placedObjects = new Map<string, THREE.Object3D>();

let selectedPieceId = PIECES[0].id;
let selectedMaterialId = DEFAULT_MATERIAL_ID;
let rotation: Rotation = 0;

function cellCenter(cellX: number, cellZ: number): { x: number; z: number } {
  return { x: (cellX + 0.5) * CELL_SIZE, z: (cellZ + 0.5) * CELL_SIZE };
}

function addPieceToScene(piece: PlacedPiece): void {
  const material = threeMaterialFor(piece.materialId);
  const object = buildPieceMesh(piece.pieceId, piece.rotation, material);
  const { x, z } = cellCenter(piece.cellX, piece.cellZ);
  object.position.set(x, piece.level, z);
  scene.add(object);
  placedObjects.set(piece.id, object);
}

function removePieceFromScene(id: string): void {
  const object = placedObjects.get(id);
  if (!object) return;
  scene.remove(object);
  placedObjects.delete(id);
}

// --- Palette : sélection de pièce et de matériau ---

const piecesPanel = document.getElementById("palette-pieces")!;
const materialsPanel = document.getElementById("palette-materials")!;

function renderPalette(): void {
  piecesPanel.innerHTML = "";
  for (const piece of PIECES) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = piece.label;
    button.classList.toggle("active", piece.id === selectedPieceId);
    button.addEventListener("click", () => {
      selectedPieceId = piece.id;
      renderPalette();
    });
    piecesPanel.appendChild(button);
  }

  materialsPanel.innerHTML = "";
  for (const material of MATERIALS) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = material.label;
    button.classList.toggle("active", material.id === selectedMaterialId);
    button.addEventListener("click", () => {
      selectedMaterialId = material.id;
      renderPalette();
    });
    materialsPanel.appendChild(button);
  }
}
renderPalette();

document.getElementById("rotate-btn")!.addEventListener("click", () => {
  rotation = ((rotation + 90) % 360) as Rotation;
});

document.getElementById("reset-btn")!.addEventListener("click", () => {
  terrain = createHeightmap();
  updateTerrainMesh(terrainMesh, terrain);
  for (const id of [...placedObjects.keys()]) removePieceFromScene(id);
  placedPieces = [];
});

// --- Prévisualisation fantôme + pose/retrait ---

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let ghost: THREE.Object3D | null = null;

function updatePointer(event: PointerEvent): void {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function hoveredCell(): { cellX: number; cellZ: number } | null {
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(terrainMesh)[0];
  if (!hit) return null;
  const cellX = Math.floor(hit.point.x / CELL_SIZE);
  const cellZ = Math.floor(hit.point.z / CELL_SIZE);
  return { cellX, cellZ };
}

canvas.addEventListener("pointermove", (event) => {
  updatePointer(event);
  const cell = hoveredCell();
  if (ghost) {
    scene.remove(ghost);
    ghost = null;
  }
  if (!cell) return;
  const result = resolvePlacement(cell.cellX, cell.cellZ, terrain, placedPieces);
  const tint = new THREE.MeshStandardMaterial({
    color: result.valid ? 0x6fd08c : 0xd0625a,
    transparent: true,
    opacity: 0.55,
  });
  ghost = buildPieceMesh(selectedPieceId, rotation, tint);
  const { x, z } = cellCenter(cell.cellX, cell.cellZ);
  ghost.position.set(x, result.level, z);
  scene.add(ghost);
});

// OrbitControls (Task 7) listens for pointerdown on this same canvas to start its
// rotate-drag (left button) — it doesn't stopPropagation, so a bare "act on pointerdown"
// handler here would ALSO place/sculpt/remove on every orbit-drag's starting pixel, not
// just on genuine clicks (found during Task 8's review). Track movement between
// pointerdown and pointerup instead, and only act if the pointer barely moved — a real
// click/tap — so orbiting the camera and placing a piece stay independent gestures.
const CLICK_DRAG_THRESHOLD_PX = 6;
let pointerDownAt: { x: number; y: number } | null = null;

canvas.addEventListener("pointerdown", (event) => {
  pointerDownAt = { x: event.clientX, y: event.clientY };
});

canvas.addEventListener("pointerup", (event) => {
  const downAt = pointerDownAt;
  pointerDownAt = null;
  if (!downAt) return;
  const moved = Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y);
  if (moved > CLICK_DRAG_THRESHOLD_PX) return; // c'était une orbite, pas un clic

  updatePointer(event);
  const cell = hoveredCell();
  if (!cell) return;

  if (event.button === 2) {
    // clic droit : sculpter le terrain (shift = creuser)
    const hit = raycaster.intersectObject(terrainMesh)[0];
    if (!hit) return;
    const { x, z } = nearestVertex(hit.point);
    terrain = event.shiftKey ? lowerVertex(terrain, x, z) : raiseVertex(terrain, x, z);
    updateTerrainMesh(terrainMesh, terrain);
    return;
  }

  if (event.altKey) {
    // alt-clic : retirer la pièce du dessus sur cette cellule
    placedPieces = removeTopPiece(cell.cellX, cell.cellZ, placedPieces);
    const stillThere = new Set(placedPieces.map((p) => p.id));
    for (const id of [...placedObjects.keys()]) {
      if (!stillThere.has(id)) removePieceFromScene(id);
    }
    return;
  }

  const result = resolvePlacement(cell.cellX, cell.cellZ, terrain, placedPieces);
  if (!result.valid) return;
  const piece: PlacedPiece = {
    id: `${cell.cellX}-${cell.cellZ}-${result.level}-${Date.now()}`,
    pieceId: selectedPieceId,
    cellX: cell.cellX,
    cellZ: cell.cellZ,
    level: result.level,
    rotation,
    materialId: selectedMaterialId,
  };
  placedPieces.push(piece);
  addPieceToScene(piece);
});

canvas.addEventListener("contextmenu", (event) => event.preventDefault());

function frame(): void {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

export {};
