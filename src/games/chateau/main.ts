// src/games/chateau/main.ts
import * as THREE from "three";
import { createSceneRig } from "./scene";
import { createGrid, growCell, shrinkCell, type Grid } from "./grid";
import { classifyCorners } from "./corners";
import { buildBuildingColumn, disposeBuildingColumn } from "./building-geometry";
import { COLORS, DEFAULT_COLOR_ID, colorById } from "./palette";
import { CELL_SIZE, GRID_SIZE, WATER_LEVEL } from "./constants";
import { loadFromLocalStorage, saveToLocalStorage, clearSave } from "./save";

const canvas = document.getElementById("scene") as HTMLCanvasElement;
const { scene, camera, renderer, controls } = createSceneRig(canvas);

const initialWorld = loadFromLocalStorage();
let grid: Grid = initialWorld.grid;

const columns = new Map<string, THREE.Group>();
const wallMaterials = new Map<string, THREE.MeshStandardMaterial>();
const roofMaterials = new Map<string, THREE.MeshStandardMaterial>();

function materialsFor(colorId: string): { walls: THREE.Material; roof: THREE.Material } {
  const def = colorById(colorId);
  let walls = wallMaterials.get(def.id);
  if (!walls) {
    // side: DoubleSide est une sécurité gratuite (le sens des normales des murs a été
    // vérifié correct par calcul dans building-geometry.ts, mais ce réglage ne coûte rien
    // et évite qu'un mur ne devienne invisible si jamais un futur changement de géométrie
    // inversait le sens d'enroulement sans qu'on s'en rende compte).
    walls = new THREE.MeshStandardMaterial({ color: def.hex, roughness: 0.85, side: THREE.DoubleSide });
    wallMaterials.set(def.id, walls);
  }
  let roof = roofMaterials.get(def.id);
  if (!roof) {
    const roofColor = new THREE.Color(def.hex).multiplyScalar(0.75); // toit légèrement plus sombre
    roof = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.85 });
    roofMaterials.set(def.id, roof);
  }
  return { walls, roof };
}

function cellKey(cellX: number, cellZ: number): string {
  return `${cellX}-${cellZ}`;
}

function cellCenter(cellX: number, cellZ: number): { x: number; z: number } {
  return { x: (cellX + 0.5) * CELL_SIZE, z: (cellZ + 0.5) * CELL_SIZE };
}

// Chaque colonne a sa propre géométrie (jamais partagée), mais ses matériaux SONT
// partagés (mis en cache par couleur ci-dessus, réutilisés par toutes les cases de la
// même couleur) — disposeBuildingColumn (building-geometry.ts) ne touche jamais aux
// matériaux, seulement à la géométrie, exactement pour cette raison.
function rebuildColumn(cellX: number, cellZ: number): void {
  const key = cellKey(cellX, cellZ);
  const existing = columns.get(key);
  if (existing) {
    scene.remove(existing);
    disposeBuildingColumn(existing);
    columns.delete(key);
  }

  const cell = grid[cellZ][cellX];
  if (cell.height === 0) return;

  const corners = classifyCorners(grid, cellX, cellZ);
  const column = buildBuildingColumn(corners, cell.height, cellX, cellZ, materialsFor(cell.colorId));
  const { x, z } = cellCenter(cellX, cellZ);
  column.position.set(x, WATER_LEVEL, z);
  scene.add(column);
  columns.set(key, column);
}

// Une modification à (cellX,cellZ) peut changer la classification de coin de TOUTES ses
// cellules voisines (jusqu'en diagonale) — pas seulement la case elle-même — puisque
// classifyCorners lit les voisins de chaque case. Reconstruire ce voisinage à chaque
// modification, pas juste la case cliquée.
function rebuildNeighborhood(cellX: number, cellZ: number): void {
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      rebuildColumn(cellX + dx, cellZ + dz);
    }
  }
}

function rebuildEverything(): void {
  for (const key of [...columns.keys()]) {
    const object = columns.get(key)!;
    scene.remove(object);
    disposeBuildingColumn(object);
  }
  columns.clear();
  for (let z = 0; z < GRID_SIZE; z++) {
    for (let x = 0; x < GRID_SIZE; x++) rebuildColumn(x, z);
  }
}
rebuildEverything();

function persist(): void {
  saveToLocalStorage({ grid });
}

// --- Plan d'eau statique (le sol est fixe, seule la masse des bâtiments grandit) ---

const waterGeometry = new THREE.PlaneGeometry(GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);
waterGeometry.rotateX(-Math.PI / 2);
waterGeometry.translate((GRID_SIZE * CELL_SIZE) / 2, WATER_LEVEL, (GRID_SIZE * CELL_SIZE) / 2);
const waterMaterial = new THREE.MeshStandardMaterial({
  color: 0x2f7bb0,
  transparent: true,
  opacity: 0.75,
  roughness: 0.15,
  metalness: 0.05,
});
const water = new THREE.Mesh(waterGeometry, waterMaterial);
scene.add(water);

// Un simple plan invisible au niveau de l'eau pour le raycasting (viser une case même là
// où aucun bâtiment n'existe encore) — le plan d'eau visuel ci-dessus fait déjà l'affaire
// géométriquement, pas besoin d'un second plan : on raycast directement contre `water`.

// --- Palette de couleurs ---

const colorsPanel = document.getElementById("palette-colors")!;
let selectedColorId = DEFAULT_COLOR_ID;

function renderPalette(): void {
  colorsPanel.innerHTML = "";
  for (const color of COLORS) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = color.label;
    button.style.background = `#${color.hex.toString(16).padStart(6, "0")}`;
    button.classList.toggle("active", color.id === selectedColorId);
    button.addEventListener("click", () => {
      selectedColorId = color.id;
      renderPalette();
    });
    colorsPanel.appendChild(button);
  }
}
renderPalette();

document.getElementById("reset-btn")!.addEventListener("click", () => {
  grid = createGrid();
  rebuildEverything();
  clearSave();
});

// --- Interaction : construire (glisser pour peindre), retirer (alt + clic) ---

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function updatePointer(event: PointerEvent): void {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function hoveredCell(): { cellX: number; cellZ: number } | null {
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(water)[0];
  if (!hit) return null;
  const cellX = Math.floor(hit.point.x / CELL_SIZE);
  const cellZ = Math.floor(hit.point.z / CELL_SIZE);
  if (cellX < 0 || cellX >= GRID_SIZE || cellZ < 0 || cellZ >= GRID_SIZE) return null;
  return { cellX, cellZ };
}

let painting = false;
// Pendant un même glissement, ne touche chaque case qu'une fois — sinon glisser lentement
// sur une case déjà construite lui ajouterait des étages en rafale (le glissement ne doit
// remplir que les cases VIDES traversées).
const paintedThisStroke = new Set<string>();

function paintCell(cellX: number, cellZ: number): void {
  const key = cellKey(cellX, cellZ);
  if (paintedThisStroke.has(key)) return;
  paintedThisStroke.add(key);
  if (grid[cellZ][cellX].height > 0) return; // ne fait grandir QUE les cases vides pendant un glissement
  grid = growCell(grid, cellX, cellZ, selectedColorId);
  rebuildNeighborhood(cellX, cellZ);
  persist();
}

// Un seul écouteur pointerdown pour construire ET retirer (branché par event.altKey) : les
// deux chemins partagent le même calcul de case survolée, donc il ne peut plus y avoir de
// divergence accidentelle entre eux (ex. l'un des deux qui oublierait updatePointer avant
// de raycaster — piège réel rencontré pendant la revue de qualité de cette tâche).
canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return; // le clic gauche seul
  updatePointer(event);
  const cell = hoveredCell();
  if (!cell) return;

  if (event.altKey) {
    // Alt + clic : retrait d'un étage, pas de glissement pour cette action.
    if (grid[cell.cellZ][cell.cellX].height === 0) return;
    grid = shrinkCell(grid, cell.cellX, cell.cellZ);
    rebuildNeighborhood(cell.cellX, cell.cellZ);
    persist();
    return;
  }

  painting = true;
  paintedThisStroke.clear();
  // Un simple clic (sans glisser) sur une case déjà construite doit quand même ajouter un
  // étage — paintCell() ignore les cases non-vides, donc on gère ce cas séparément ici,
  // une seule fois par pointerdown (pas à chaque pointermove).
  if (grid[cell.cellZ][cell.cellX].height > 0) {
    grid = growCell(grid, cell.cellX, cell.cellZ, selectedColorId);
    rebuildNeighborhood(cell.cellX, cell.cellZ);
    persist();
  } else {
    paintCell(cell.cellX, cell.cellZ);
  }
});

canvas.addEventListener("pointermove", (event) => {
  updatePointer(event);
  if (!painting) return;
  const cell = hoveredCell();
  if (cell) paintCell(cell.cellX, cell.cellZ);
});

function stopPainting(): void {
  painting = false;
}
window.addEventListener("pointerup", stopPainting);
window.addEventListener("pointercancel", stopPainting);

function frame(): void {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

export {};
