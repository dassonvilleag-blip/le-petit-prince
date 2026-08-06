// src/games/chateau/main.ts
import * as THREE from "three";
import { createSceneRig } from "./scene";
import { createFlyControls } from "./fly-controls";
import { createHeightmap, heightAt, raiseVertex, lowerVertex, type Heightmap } from "./terrain";
import { createTerrainMesh, createWaterMesh, updateTerrainMesh, nearestVertex } from "./terrain-mesh";
import { PIECES, pieceById } from "./pieces";
import { MATERIALS, DEFAULT_MATERIAL_ID } from "./materials";
import { buildPieceMesh } from "./piece-geometry";
import { threeMaterialFor, preloadAllMaterials } from "./materials-three";
import { resolvePlacement, removeTopPiece, type PlacedPiece, type Rotation } from "./placement";
import { CELL_SIZE, LEVEL_HEIGHT } from "./constants";
import { loadFromLocalStorage, saveToLocalStorage, clearSave } from "./save";

const canvas = document.getElementById("scene") as HTMLCanvasElement;
const { scene, camera, renderer } = createSceneRig(canvas);
const flyControls = createFlyControls(camera, canvas);
preloadAllMaterials();

const initialWorld = loadFromLocalStorage();

let terrain: Heightmap = initialWorld.terrain;
const terrainMesh = createTerrainMesh(terrain);
scene.add(terrainMesh);
scene.add(createWaterMesh());

const placedObjects = new Map<string, THREE.Object3D>();

// `save.ts`'s deserializeWorld only validates the terrain/pieces *shape*, not each
// piece's individual fields — a hand-edited or version-skewed localStorage value could
// contain a piece with an unknown pieceId, which makes buildPieceMesh (Task 9) throw.
// Restoring must never crash the page (per the design spec's error-handling section), so
// skip and log any piece that fails to build instead of letting one bad entry take down
// the whole boot sequence — and drop it from placedPieces too, so the next persist() call
// self-heals the save instead of re-writing the same corrupt entry forever.
let placedPieces: PlacedPiece[] = initialWorld.pieces.filter((piece) => {
  try {
    addPieceToScene(piece);
    return true;
  } catch (error) {
    console.warn("Pièce de sauvegarde corrompue ignorée :", piece, error);
    return false;
  }
});

function persist(): void {
  saveToLocalStorage({ terrain, pieces: placedPieces });
}

// Outil de façonnage du terrain, rangé dans la palette au même titre qu'une pièce plutôt
// que caché derrière un clic droit — sa sélection est mutuellement exclusive avec les
// pièces via la même variable selectedPieceId (choisir la pelle "désélectionne"
// implicitement toute pièce, et vice-versa).
const SHOVEL_TOOL_ID = "pelle";

let selectedPieceId: string = PIECES[0].id;
let selectedMaterialId = DEFAULT_MATERIAL_ID;
let rotation: Rotation = 0;

function cellCenter(cellX: number, cellZ: number): { x: number; z: number } {
  return { x: (cellX + 0.5) * CELL_SIZE, z: (cellZ + 0.5) * CELL_SIZE };
}

// placement.ts reste volontairement ignorant des catalogues (Task 4) : c'est donc ici,
// côté appelant, que l'on décide quelles pièces déjà posées comptent vraiment comme
// "occupant ce niveau" pour resolvePlacement — une pièce "edge" (mur, créneau, herse) ne
// bloque une AUTRE pièce "edge" que si elles visent le même bord (même rotation) ; une
// pièce "cell" bloque tout, comme avant. Sans ce filtre, deux murs perpendiculaires dans la
// même cellule (le geste normal pour fermer un coin ou une pièce) étaient toujours forcés à
// s'empiler l'un sur l'autre au lieu de coexister au même niveau.
function piecesBlockingLevel(cellX: number, cellZ: number, pieceId: string, pieceRotation: Rotation): PlacedPiece[] {
  const footprint = pieceById(pieceId)?.footprint ?? "cell";
  return placedPieces.filter((existing) => {
    if (existing.cellX !== cellX || existing.cellZ !== cellZ) return false;
    if (footprint === "cell") return true;
    const existingFootprint = pieceById(existing.pieceId)?.footprint ?? "cell";
    if (existingFootprint === "cell") return true;
    return existing.rotation === pieceRotation;
  });
}

function addPieceToScene(piece: PlacedPiece): void {
  const material = threeMaterialFor(piece.materialId);
  const object = buildPieceMesh(piece.pieceId, piece.rotation, material);
  const { x, z } = cellCenter(piece.cellX, piece.cellZ);
  object.position.set(x, piece.level * LEVEL_HEIGHT, z);
  scene.add(object);
  placedObjects.set(piece.id, object);
}

function removePieceFromScene(id: string): void {
  const object = placedObjects.get(id);
  if (!object) return;
  scene.remove(object);
  // Chaque pièce posée a sa propre géométrie (jamais partagée, contrairement au matériau
  // mis en cache par threeMaterialFor) — même fuite que le fantôme (voir disposeGhost) si
  // on ne la libère pas ici. Ne surtout pas disposer le matériau : il est partagé avec
  // toutes les autres pièces utilisant le même id de matériau.
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) child.geometry.dispose();
  });
  placedObjects.delete(id);
}

// --- Palette : sélection de pièce et de matériau ---

const toolsPanel = document.getElementById("palette-tools")!;
const piecesPanel = document.getElementById("palette-pieces")!;
const materialsPanel = document.getElementById("palette-materials")!;

function renderPalette(): void {
  toolsPanel.innerHTML = "";
  const shovelButton = document.createElement("button");
  shovelButton.type = "button";
  shovelButton.textContent = "🪏 Pelle";
  shovelButton.classList.toggle("active", selectedPieceId === SHOVEL_TOOL_ID);
  shovelButton.addEventListener("click", () => {
    selectedPieceId = SHOVEL_TOOL_ID;
    renderPalette();
    updateGhost(); // reflète le changement d'outil immédiatement, comme rotateSelection()
  });
  toolsPanel.appendChild(shovelButton);

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

function rotateSelection(): void {
  rotation = ((rotation + 90) % 360) as Rotation;
  updateGhost(); // reflète la rotation immédiatement, sans attendre un mouvement de souris
}

document.getElementById("rotate-btn")!.addEventListener("click", rotateSelection);

// Raccourci clavier pour pivoter la pièce sélectionnée sans lâcher la souris — le bouton
// "↻ Pivoter" seul obligeait à un aller-retour souris entre la palette et la parcelle.
window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "r" && !event.repeat) rotateSelection();
});

document.getElementById("reset-btn")!.addEventListener("click", () => {
  terrain = createHeightmap();
  updateTerrainMesh(terrainMesh, terrain);
  for (const id of [...placedObjects.keys()]) removePieceFromScene(id);
  placedPieces = [];
  clearSave();
});

// --- Prévisualisation fantôme + pose/retrait ---

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let ghost: THREE.Object3D | null = null;

// Marqueur de survol de la pelle : un unique mesh réutilisé (pas de géométrie/matériau
// recréés à chaque pointermove comme pour le fantôme de pièce, inutile ici puisque sa
// forme/couleur ne changent jamais) — on bascule juste sa position et sa visibilité.
const shovelMarker = new THREE.Mesh(
  new THREE.SphereGeometry(0.18, 12, 12),
  new THREE.MeshStandardMaterial({ color: 0xf5c15c, transparent: true, opacity: 0.85 }),
);
shovelMarker.visible = false;
scene.add(shovelMarker);

function updatePointer(event: PointerEvent): void {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function raycastTerrainPoint(): THREE.Vector3 | null {
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(terrainMesh)[0];
  return hit ? hit.point : null;
}

function hoveredCell(): { cellX: number; cellZ: number } | null {
  const point = raycastTerrainPoint();
  if (!point) return null;
  const cellX = Math.floor(point.x / CELL_SIZE);
  const cellZ = Math.floor(point.z / CELL_SIZE);
  return { cellX, cellZ };
}

// buildPieceMesh() allocates fresh geometries (and, for the ghost, a fresh tint material)
// on every call — scene.remove() only unlinks an object from the graph, it never frees the
// underlying GPU buffers. pointermove fires at display refresh rate while hovering the
// viewport, so without this the ghost preview would leak geometry/material on the busiest
// code path in the game (found in Task 11's review). Dispose everything the outgoing ghost
// owns before building the next one. Never reuse this on a *placed* piece's object — those
// share cached materials from materials-three.ts's threeMaterialFor(), which other pieces
// still reference.
function disposeGhost(object: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    geometries.add(child.geometry);
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      materials.add(material);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}

// Rebuilds the ghost/marker at whatever point `pointer` currently points at (the last
// known pointer position, updated by updatePointer). Factored out of the "pointermove"
// handler so rotating the selection or switching tool (button or keyboard shortcut) can
// refresh the preview immediately, without waiting for the mouse to move again.
function updateGhost(): void {
  if (ghost) {
    scene.remove(ghost);
    disposeGhost(ghost);
    ghost = null;
  }

  if (selectedPieceId === SHOVEL_TOOL_ID) {
    const point = raycastTerrainPoint();
    if (!point) {
      shovelMarker.visible = false;
      return;
    }
    const { x, z } = nearestVertex(point);
    shovelMarker.position.set(x * CELL_SIZE, heightAt(terrain, x, z) * LEVEL_HEIGHT, z * CELL_SIZE);
    shovelMarker.visible = true;
    return;
  }
  shovelMarker.visible = false;

  const cell = hoveredCell();
  if (!cell) return;
  const blocking = piecesBlockingLevel(cell.cellX, cell.cellZ, selectedPieceId, rotation);
  const result = resolvePlacement(cell.cellX, cell.cellZ, terrain, blocking);
  const tint = new THREE.MeshStandardMaterial({
    color: result.valid ? 0x6fd08c : 0xd0625a,
    transparent: true,
    opacity: 0.55,
  });
  ghost = buildPieceMesh(selectedPieceId, rotation, tint);
  const { x, z } = cellCenter(cell.cellX, cell.cellZ);
  ghost.position.set(x, result.level * LEVEL_HEIGHT, z);
  scene.add(ghost);
}

canvas.addEventListener("pointermove", (event) => {
  updatePointer(event);
  updateGhost();
});

// Track movement between pointerdown and pointerup and only act if the pointer barely
// moved — a real click/tap, not a shaky drag — so a slightly wobbly click never places
// a piece or sculpts terrain by accident.
const CLICK_DRAG_THRESHOLD_PX = 6;
let pointerDownAt: { x: number; y: number } | null = null;

canvas.addEventListener("pointerdown", (event) => {
  pointerDownAt = { x: event.clientX, y: event.clientY };
});

canvas.addEventListener("pointerup", (event) => {
  const downAt = pointerDownAt;
  pointerDownAt = null;
  // Ctrl + clic gauche est réservé au regard caméra (fly-controls.ts) — jamais une pose,
  // un creusement ou un retrait, même si le clic n'a pas bougé.
  if (event.ctrlKey) return;
  if (!downAt) return;
  const moved = Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y);
  if (moved > CLICK_DRAG_THRESHOLD_PX) return; // c'était un glissement, pas un clic

  updatePointer(event);

  if (selectedPieceId === SHOVEL_TOOL_ID) {
    // Pelle sélectionnée : clic = monter le terrain, shift + clic = creuser.
    const point = raycastTerrainPoint();
    if (!point) return;
    const { x, z } = nearestVertex(point);
    terrain = event.shiftKey ? lowerVertex(terrain, x, z) : raiseVertex(terrain, x, z);
    updateTerrainMesh(terrainMesh, terrain);
    persist();
    return;
  }

  const cell = hoveredCell();
  if (!cell) return;

  if (event.altKey) {
    // alt-clic : retirer la pièce du dessus sur cette cellule
    placedPieces = removeTopPiece(cell.cellX, cell.cellZ, placedPieces);
    const stillThere = new Set(placedPieces.map((p) => p.id));
    for (const id of [...placedObjects.keys()]) {
      if (!stillThere.has(id)) removePieceFromScene(id);
    }
    persist();
    return;
  }

  const blocking = piecesBlockingLevel(cell.cellX, cell.cellZ, selectedPieceId, rotation);
  const result = resolvePlacement(cell.cellX, cell.cellZ, terrain, blocking);
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
  persist();
});

let lastFrameTime = performance.now();

function frame(now: number): void {
  const deltaSeconds = Math.min(0.1, (now - lastFrameTime) / 1000); // borne haute : ignore les à-coups après un onglet en arrière-plan
  lastFrameTime = now;
  flyControls.update(deltaSeconds);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

export {};
