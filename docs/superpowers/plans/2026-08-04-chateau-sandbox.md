# Château — bac à sable de construction 3D (v1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a new mini-jeu `games/chateau/` — a 3D exterior-only château building sandbox, playable from `npm run dev`, matching `docs/superpowers/specs/2026-08-04-chateau-design.md`.

**Architecture:** Pure, unit-tested logic modules (terrain heightmap, piece/material catalogs, placement rules, save/load) are fully decoupled from Three.js. A thin rendering layer (scene rig, terrain mesh, procedural piece geometry, material loading) consumes that pure state and redraws on change. `main.ts` wires DOM/pointer events to the pure logic and triggers re-renders — mirroring how `ca-coute-combien` separates `scoring.ts`/`pool.ts` (tested) from `main.ts` (rendering glue, not unit-tested).

**Tech Stack:** Vite + TypeScript (existing), Three.js (new dependency — first 3D game on the site), free CC0 PBR textures from Poly Haven, `node --experimental-strip-types --test` for unit tests (existing convention).

---

## Spec coverage map

| Spec section | Implemented in |
|---|---|
| Terrain modelable (relief) | Task 2 (`terrain.ts`), Task 8 (`terrain-mesh.ts`) |
| Construction libre par blocs de base | Task 3 (`pieces.ts`), Task 9 (`piece-geometry.ts`) |
| Accroche automatique | Task 4 (`placement.ts`) |
| Personnalisation matériaux | Task 3 (`materials.ts`), Task 10 (`materials-three.ts`) |
| Caméra orbite | Task 7 (`scene.ts`) |
| Sauvegarde locale | Task 5 (`save.ts`), Task 12 |
| Rendu PBR + éclairage + eau | Task 6 (textures), Task 7 (lumière/ciel), Task 8 (eau) |
| Gestion des erreurs (pose invalide, plancher/plafond, save corrompue) | Task 4, Task 5 (tests), Task 11 (UI feedback) |

## A note on Three.js code in this plan

Tasks 7–11 write Three.js scene/geometry code that cannot be unit-tested with `node --experimental-strip-types --test` (no WebGL context in Node — consistent with how `main.ts`/canvas drawing in the other games on this site has no automated tests either). Each of those tasks ends with a **manual verification step in the browser** instead of a test run. The geometry numbers (translate/rotate offsets) are a solid starting point, not guaranteed pixel-perfect — if a piece looks wrong (wrong pivot, wrong facing) when you place it in Task 9's verification step, adjust the offending builder's `translate`/`rotate` calls directly; get it visually right rather than trusting the numbers blindly.

---

### Task 1: Scaffold the game shell

**Files:**
- Modify: `package.json`
- Create: `games/chateau/index.html`
- Create: `src/games/chateau/main.ts`
- Create: `src/games/chateau/chateau.css`
- Modify: `vite.config.ts`
- Modify: `index.html:99-153` (add a blueprint card in the Atelier section)
- Create: `public/tiles/chateau.svg`

- [ ] **Step 1: Install Three.js**

Run: `npm install three`
Expected: `package.json` gains `"three": "^0.185.1"` (or newer patch) under `dependencies`.

- [ ] **Step 2: Create the game HTML shell**

```html
<!-- games/chateau/index.html -->
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
    <title>Château</title>
    <meta name="description" content="Bac à sable de construction de château, vu de l'extérieur." />
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🏰</text></svg>" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400..700&family=VT323&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/src/games/chateau/chateau.css" />
  </head>
  <body>
    <canvas id="scene"></canvas>

    <a class="back-link" href="../../">← le petit prince</a>

    <div class="palette" id="palette">
      <div class="palette-section" id="palette-pieces"></div>
      <div class="palette-section" id="palette-materials"></div>
      <div class="palette-actions">
        <button id="rotate-btn" type="button">↻ Pivoter</button>
        <button id="reset-btn" type="button">Recommencer</button>
      </div>
    </div>

    <div class="hint" id="hint">
      <h1>Château</h1>
      <p>Façonne le terrain, pose des pièces, choisis leurs matériaux.<br />
      Ton château, ta forme — il n'y a pas de mauvaise réponse.</p>
    </div>

    <script type="module" src="/src/games/chateau/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 3: Create a placeholder `main.ts`**

```ts
// src/games/chateau/main.ts
// Bac à sable de construction de château — extérieur uniquement.
export {};
```

- [ ] **Step 4: Create `chateau.css`**

```css
/* src/games/chateau/chateau.css */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --ink: #17171b;
  --card: #fffdf4;
  --accent: #c9613f;
}

html,
body {
  height: 100%;
  overflow: hidden;
  background: #eaf7ff;
  font-family: "VT323", "Courier New", monospace;
  color: var(--ink);
  -webkit-user-select: none;
  user-select: none;
}

#scene {
  position: fixed;
  inset: 0;
  display: block;
  touch-action: none;
}

.back-link {
  position: fixed;
  z-index: 10;
  top: 16px;
  left: 18px;
  color: var(--ink);
  text-decoration: none;
  font-size: 1.3rem;
  line-height: 1;
  padding: 8px 14px;
  background: var(--card);
  border: 3px solid var(--ink);
  border-radius: 8px;
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.5);
}

.hint {
  position: fixed;
  z-index: 10;
  bottom: 18px;
  left: 18px;
  max-width: 360px;
  background: var(--card);
  border: 3px solid var(--ink);
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.5);
}

.hint h1 {
  font-family: "Pixelify Sans", monospace;
  font-size: 1.4rem;
  margin-bottom: 4px;
}

.hint p {
  font-size: 1.1rem;
  line-height: 1.3;
}

.palette {
  position: fixed;
  z-index: 10;
  top: 16px;
  right: 18px;
  width: 240px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  background: var(--card);
  border: 3px solid var(--ink);
  border-radius: 8px;
  padding: 10px;
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.5);
}

.palette-section {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.palette-section button {
  font-family: "VT323", monospace;
  font-size: 1rem;
  padding: 6px 10px;
  border: 2px solid var(--ink);
  border-radius: 6px;
  background: var(--card);
  color: var(--ink);
  cursor: pointer;
}

.palette-section button.active {
  background: var(--accent);
  color: var(--card);
}

.palette-actions {
  display: flex;
  gap: 8px;
}

.palette-actions button {
  flex: 1;
  font-family: "VT323", monospace;
  font-size: 1.05rem;
  padding: 8px;
  border: 2px solid var(--ink);
  border-radius: 6px;
  background: var(--ink);
  color: var(--card);
  cursor: pointer;
}
```

- [ ] **Step 5: Register the page with Vite**

Modify `vite.config.ts` — add a `chateau` entry alongside the existing `rollupOptions.input` keys (e.g. right after `aquarium: resolve(__dirname, "games/aquarium/index.html"),`):

```ts
        chateau: resolve(__dirname, "games/chateau/index.html"),
```

- [ ] **Step 6: Create the home page placeholder tile**

```svg
<!-- public/tiles/chateau.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 240">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffd9a8"/>
      <stop offset="100%" stop-color="#ffb6a0"/>
    </linearGradient>
  </defs>
  <rect width="300" height="240" fill="url(#sky)"/>
  <rect x="0" y="190" width="300" height="50" fill="#c9a86a"/>
  <rect x="55" y="120" width="34" height="80" fill="#dcb98c"/>
  <polygon points="55,120 72,95 89,120" fill="#a94a2e"/>
  <rect x="110" y="135" width="120" height="65" fill="#dcb98c"/>
  <polygon points="105,135 170,100 235,135" fill="#a94a2e"/>
  <rect x="205" y="105" width="34" height="95" fill="#dcb98c"/>
  <polygon points="205,105 222,80 239,105" fill="#a94a2e"/>
</svg>
```

This is a stand-in illustration, not the in-game art style — swap it for a proper tile once the game has something worth screenshotting.

- [ ] **Step 7: Add the home page entry**

Modify `index.html`, inside `<div class="blueprints">` (after the `la-horde` entry, before `le-phare`, matching the existing list order):

```html
        <a class="blueprint" href="games/chateau/">
          <span class="bp-tape"></span>
          <img src="/tiles/chateau.svg" alt="" />
          <h3>Château</h3>
          <span class="bp-note">bac à sable 3D</span>
        </a>
```

- [ ] **Step 8: Verify the shell loads**

Run: `npm run dev`, open the printed local URL, navigate to `/games/chateau/`.
Expected: a blank page with the back-link, hint box, and empty palette panel visible, no console errors. Also open `/` and confirm the new "Château" card appears in the Atelier section and links correctly.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json games/chateau/index.html src/games/chateau/main.ts src/games/chateau/chateau.css vite.config.ts index.html public/tiles/chateau.svg
git commit -m "feat(chateau): scaffold new 3D game shell"
```

---

### Task 2: Terrain heightmap module

**Files:**
- Create: `src/games/chateau/constants.ts`
- Create: `src/games/chateau/terrain.ts`
- Test: `src/games/chateau/test/terrain.test.ts`

- [ ] **Step 1: Write shared constants**

```ts
// src/games/chateau/constants.ts
export const PLOT_SIZE = 12; // cellules par côté
export const MIN_TERRAIN_LEVEL = 0;
export const MAX_TERRAIN_LEVEL = 4;
export const WATER_LEVEL = 1; // niveau de terrain à/sous lequel l'eau recouvre
export const MAX_STACK_HEIGHT = 6; // pièces empilables au-dessus du sol sur une cellule
export const CELL_SIZE = 2; // unités monde par cellule (X/Z)
export const LEVEL_HEIGHT = 1; // unités monde par niveau vertical
```

- [ ] **Step 2: Write the failing tests**

```ts
// src/games/chateau/test/terrain.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { PLOT_SIZE, MIN_TERRAIN_LEVEL, MAX_TERRAIN_LEVEL } from "../constants.ts";
import { createHeightmap, heightAt, raiseVertex, lowerVertex, terrainLevelAtCell } from "../terrain.ts";

test("createHeightmap returns a flat grid of the right size", () => {
  const grid = createHeightmap();
  assert.equal(grid.length, PLOT_SIZE + 1);
  for (const row of grid) {
    assert.equal(row.length, PLOT_SIZE + 1);
    assert.ok(row.every((h) => h === 0));
  }
});

test("raiseVertex increases the target vertex only", () => {
  const grid = raiseVertex(createHeightmap(), 3, 4);
  assert.equal(heightAt(grid, 3, 4), 1);
  assert.equal(heightAt(grid, 3, 5), 0);
  assert.equal(heightAt(grid, 4, 4), 0);
});

test("raiseVertex clamps at MAX_TERRAIN_LEVEL", () => {
  let grid = createHeightmap();
  for (let i = 0; i < 20; i++) grid = raiseVertex(grid, 0, 0);
  assert.equal(heightAt(grid, 0, 0), MAX_TERRAIN_LEVEL);
});

test("lowerVertex clamps at MIN_TERRAIN_LEVEL", () => {
  let grid = createHeightmap();
  for (let i = 0; i < 20; i++) grid = lowerVertex(grid, 0, 0);
  assert.equal(heightAt(grid, 0, 0), MIN_TERRAIN_LEVEL);
});

test("raiseVertex out of bounds is a no-op", () => {
  const before = createHeightmap();
  const after = raiseVertex(before, -1, 0);
  assert.deepEqual(after, before);
});

test("heightAt out of bounds returns 0", () => {
  assert.equal(heightAt(createHeightmap(), PLOT_SIZE + 5, 0), 0);
});

test("terrainLevelAtCell averages and rounds the 4 surrounding corners", () => {
  let grid = createHeightmap();
  grid = raiseVertex(grid, 0, 0);
  grid = raiseVertex(grid, 1, 0);
  grid = raiseVertex(grid, 0, 1);
  grid = raiseVertex(grid, 1, 1);
  // les 4 coins de la cellule (0,0) valent 1 chacun → moyenne 1
  assert.equal(terrainLevelAtCell(grid, 0, 0), 1);
});

test("terrainLevelAtCell rounds a mixed slope to the nearest level", () => {
  let grid = createHeightmap();
  grid = raiseVertex(grid, 0, 0); // un seul coin à 1, les 3 autres à 0 → moyenne 0.25 → arrondi 0
  assert.equal(terrainLevelAtCell(grid, 0, 0), 0);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../terrain.ts'` (module doesn't exist yet).

- [ ] **Step 4: Implement `terrain.ts`**

```ts
// src/games/chateau/terrain.ts
// note : extension .ts nécessaire ici — `node --experimental-strip-types` résout les
// imports relatifs en ESM natif (contrairement à Vite/tsc en mode bundler), et ce fichier
// est chargé transitivement par terrain.test.ts.
import { PLOT_SIZE, MIN_TERRAIN_LEVEL, MAX_TERRAIN_LEVEL } from "./constants.ts";

export type Heightmap = number[][]; // grid[z][x], (PLOT_SIZE+1) x (PLOT_SIZE+1) vertices

export function createHeightmap(): Heightmap {
  return Array.from({ length: PLOT_SIZE + 1 }, () => Array(PLOT_SIZE + 1).fill(0));
}

function inBounds(x: number, z: number): boolean {
  return x >= 0 && x <= PLOT_SIZE && z >= 0 && z <= PLOT_SIZE;
}

export function heightAt(grid: Heightmap, x: number, z: number): number {
  return inBounds(x, z) ? grid[z][x] : 0;
}

function withVertex(grid: Heightmap, x: number, z: number, next: number): Heightmap {
  if (!inBounds(x, z)) return grid;
  const clamped = Math.max(MIN_TERRAIN_LEVEL, Math.min(MAX_TERRAIN_LEVEL, next));
  return grid.map((row, rz) => (rz !== z ? row : row.map((h, rx) => (rx !== x ? h : clamped))));
}

export function raiseVertex(grid: Heightmap, x: number, z: number): Heightmap {
  return withVertex(grid, x, z, heightAt(grid, x, z) + 1);
}

export function lowerVertex(grid: Heightmap, x: number, z: number): Heightmap {
  return withVertex(grid, x, z, heightAt(grid, x, z) - 1);
}

export function terrainLevelAtCell(grid: Heightmap, cellX: number, cellZ: number): number {
  const corners = [
    heightAt(grid, cellX, cellZ),
    heightAt(grid, cellX + 1, cellZ),
    heightAt(grid, cellX, cellZ + 1),
    heightAt(grid, cellX + 1, cellZ + 1),
  ];
  const avg = corners.reduce((a, b) => a + b, 0) / 4;
  return Math.round(avg);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all `terrain.test.ts` cases green.

- [ ] **Step 6: Commit**

```bash
git add src/games/chateau/constants.ts src/games/chateau/terrain.ts src/games/chateau/test/terrain.test.ts
git commit -m "feat(chateau): terrain heightmap module"
```

---

### Task 3: Piece and material catalogs

**Files:**
- Create: `src/games/chateau/pieces.ts`
- Create: `src/games/chateau/materials.ts`
- Test: `src/games/chateau/test/pieces.test.ts`
- Test: `src/games/chateau/test/materials.test.ts`

These are static catalogs (like `items.ts` in `ca-coute-combien`, which has no dedicated test). Only the lookup helpers with actual branching logic get tests.

- [ ] **Step 1: Write `pieces.ts`**

```ts
// src/games/chateau/pieces.ts
export type PieceCategory = "structure" | "toiture" | "verticalite" | "decor";

export interface PieceDef {
  id: string;
  category: PieceCategory;
  label: string;
  rotatable: boolean;
}

export const PIECES: PieceDef[] = [
  { id: "mur-plein", category: "structure", label: "Mur plein", rotatable: true },
  { id: "mur-ouverture", category: "structure", label: "Mur avec ouverture", rotatable: true },
  { id: "pilier", category: "structure", label: "Pilier", rotatable: false },
  { id: "sol", category: "structure", label: "Sol / plateforme", rotatable: false },
  { id: "toit-pan", category: "toiture", label: "Pan de toit", rotatable: true },
  { id: "faitage", category: "toiture", label: "Faîtage", rotatable: true },
  { id: "tourelle-conique", category: "toiture", label: "Tourelle conique", rotatable: false },
  { id: "tour-ronde", category: "verticalite", label: "Tour ronde", rotatable: false },
  { id: "tour-carree", category: "verticalite", label: "Tour carrée", rotatable: false },
  { id: "escalier", category: "verticalite", label: "Escalier extérieur", rotatable: true },
  { id: "creneau", category: "decor", label: "Créneau", rotatable: true },
  { id: "pont-levis", category: "decor", label: "Pont-levis", rotatable: true },
  { id: "grille-herse", category: "decor", label: "Grille / herse", rotatable: true },
  { id: "torche", category: "decor", label: "Torche", rotatable: true },
  { id: "blason", category: "decor", label: "Blason", rotatable: true },
  { id: "plante-grimpante", category: "decor", label: "Plante grimpante", rotatable: true },
];

export function pieceById(id: string): PieceDef | undefined {
  return PIECES.find((p) => p.id === id);
}
```

- [ ] **Step 2: Write `materials.ts`**

```ts
// src/games/chateau/materials.ts
export interface MaterialDef {
  id: string;
  label: string;
  diffuse: string;
  normal: string;
  roughness: string;
}

function texturePaths(id: string) {
  const base = `/textures/chateau/${id}`;
  return { diffuse: `${base}/diffuse.webp`, normal: `${base}/normal.webp`, roughness: `${base}/roughness.webp` };
}

export const MATERIALS: MaterialDef[] = [
  { id: "pierre-claire", label: "Pierre claire", ...texturePaths("pierre-claire") },
  { id: "pierre-sombre", label: "Pierre sombre", ...texturePaths("pierre-sombre") },
  { id: "brique", label: "Brique", ...texturePaths("brique") },
  { id: "bois", label: "Bois", ...texturePaths("bois") },
  { id: "ardoise", label: "Ardoise", ...texturePaths("ardoise") },
  { id: "tuile-terre-cuite", label: "Tuile terre cuite", ...texturePaths("tuile-terre-cuite") },
];

export const DEFAULT_MATERIAL_ID = "pierre-claire";

export function materialById(id: string): MaterialDef {
  return MATERIALS.find((m) => m.id === id) ?? MATERIALS[0];
}
```

- [ ] **Step 3: Write the tests**

```ts
// src/games/chateau/test/pieces.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { pieceById } from "../pieces.ts";

test("pieceById finds an existing piece", () => {
  assert.equal(pieceById("tour-ronde")?.label, "Tour ronde");
});

test("pieceById returns undefined for an unknown id", () => {
  assert.equal(pieceById("donjon-inexistant"), undefined);
});
```

```ts
// src/games/chateau/test/materials.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { materialById, MATERIALS } from "../materials.ts";

test("materialById finds an existing material", () => {
  assert.equal(materialById("ardoise")?.label, "Ardoise");
});

test("materialById falls back to the first material for an unknown id", () => {
  assert.equal(materialById("inexistant"), MATERIALS[0]);
});
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS — 4 new tests green (plus the terrain tests from Task 2).

- [ ] **Step 5: Commit**

```bash
git add src/games/chateau/pieces.ts src/games/chateau/materials.ts src/games/chateau/test/pieces.test.ts src/games/chateau/test/materials.test.ts
git commit -m "feat(chateau): piece and material catalogs"
```

---

### Task 4: Placement logic module

**Files:**
- Create: `src/games/chateau/placement.ts`
- Test: `src/games/chateau/test/placement.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/games/chateau/test/placement.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { PLOT_SIZE, MAX_STACK_HEIGHT } from "../constants.ts";
import { createHeightmap, raiseVertex } from "../terrain.ts";
import { resolvePlacement, removeTopPiece, type PlacedPiece } from "../placement.ts";

function piece(cellX: number, cellZ: number, level: number): PlacedPiece {
  return { id: `${cellX}-${cellZ}-${level}`, pieceId: "mur-plein", cellX, cellZ, level, rotation: 0, materialId: "pierre-claire" };
}

test("first piece on flat terrain rests at level 0", () => {
  const result = resolvePlacement(2, 3, createHeightmap(), []);
  assert.equal(result.valid, true);
  assert.equal(result.level, 0);
});

test("a second piece on the same cell stacks on top", () => {
  const existing = [piece(2, 3, 0)];
  const result = resolvePlacement(2, 3, createHeightmap(), existing);
  assert.equal(result.valid, true);
  assert.equal(result.level, 1);
});

test("placement respects terrain height on a raised cell", () => {
  let grid = createHeightmap();
  grid = raiseVertex(grid, 0, 0);
  grid = raiseVertex(grid, 1, 0);
  grid = raiseVertex(grid, 0, 1);
  grid = raiseVertex(grid, 1, 1);
  const result = resolvePlacement(0, 0, grid, []);
  assert.equal(result.valid, true);
  assert.equal(result.level, 1);
});

test("placement outside the plot is invalid", () => {
  assert.equal(resolvePlacement(-1, 0, createHeightmap(), []).valid, false);
  assert.equal(resolvePlacement(PLOT_SIZE, 0, createHeightmap(), []).valid, false);
});

test("placement is invalid once the stack is full", () => {
  const existing = Array.from({ length: MAX_STACK_HEIGHT }, (_, level) => piece(5, 5, level));
  const result = resolvePlacement(5, 5, createHeightmap(), existing);
  assert.equal(result.valid, false);
});

test("removeTopPiece removes only the highest piece on a cell", () => {
  const existing = [piece(1, 1, 0), piece(1, 1, 1), piece(9, 9, 0)];
  const after = removeTopPiece(1, 1, existing);
  assert.equal(after.length, 2);
  assert.ok(after.some((p) => p.level === 0 && p.cellX === 1));
  assert.ok(after.some((p) => p.cellX === 9));
});

test("removeTopPiece on an empty cell is a no-op", () => {
  const existing = [piece(1, 1, 0)];
  const after = removeTopPiece(4, 4, existing);
  assert.deepEqual(after, existing);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../placement.ts'`.

- [ ] **Step 3: Implement `placement.ts`**

```ts
// src/games/chateau/placement.ts
// note : extensions .ts nécessaires — voir la note dans terrain.ts (Task 2), même raison :
// ce fichier est chargé transitivement par placement.test.ts sous node --experimental-strip-types.
import { PLOT_SIZE, MAX_STACK_HEIGHT } from "./constants.ts";
import { terrainLevelAtCell, type Heightmap } from "./terrain.ts";

export type Rotation = 0 | 90 | 180 | 270;

export interface PlacedPiece {
  id: string;
  pieceId: string;
  cellX: number;
  cellZ: number;
  level: number;
  rotation: Rotation;
  materialId: string;
}

export interface PlacementResult {
  valid: boolean;
  level: number;
  reason?: string;
}

export function resolvePlacement(
  cellX: number,
  cellZ: number,
  terrain: Heightmap,
  existing: PlacedPiece[],
): PlacementResult {
  if (cellX < 0 || cellX >= PLOT_SIZE || cellZ < 0 || cellZ >= PLOT_SIZE) {
    return { valid: false, level: 0, reason: "hors de la parcelle" };
  }
  const stackLevels = existing
    .filter((p) => p.cellX === cellX && p.cellZ === cellZ)
    .map((p) => p.level);
  const groundLevel = terrainLevelAtCell(terrain, cellX, cellZ);
  const nextLevel = stackLevels.length === 0 ? groundLevel : Math.max(...stackLevels) + 1;
  if (nextLevel - groundLevel >= MAX_STACK_HEIGHT) {
    return { valid: false, level: nextLevel, reason: "pile trop haute" };
  }
  return { valid: true, level: nextLevel };
}

export function removeTopPiece(cellX: number, cellZ: number, existing: PlacedPiece[]): PlacedPiece[] {
  const stack = existing.filter((p) => p.cellX === cellX && p.cellZ === cellZ);
  if (stack.length === 0) return existing;
  const top = stack.reduce((a, b) => (a.level > b.level ? a : b));
  return existing.filter((p) => p !== top);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/games/chateau/placement.ts src/games/chateau/test/placement.test.ts
git commit -m "feat(chateau): placement and anchoring logic"
```

---

### Task 5: Save/load module

**Files:**
- Create: `src/games/chateau/save.ts`
- Test: `src/games/chateau/test/save.test.ts`

`saveToLocalStorage`/`loadFromLocalStorage`/`clearSave` wrap the browser `localStorage` global directly and are **not** unit-tested here (same pattern as `petites-orbites/main.ts`, which reads/writes `localStorage` without a test) — they're covered by Task 12's manual verification. `serializeWorld`/`deserializeWorld`/`emptyWorld` are pure and get real tests.

- [ ] **Step 1: Write the failing tests**

```ts
// src/games/chateau/test/save.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { PLOT_SIZE } from "../constants.ts";
import { emptyWorld, serializeWorld, deserializeWorld } from "../save.ts";

test("emptyWorld has a flat terrain of the right size and no pieces", () => {
  const world = emptyWorld();
  assert.equal(world.terrain.length, PLOT_SIZE + 1);
  assert.equal(world.pieces.length, 0);
});

test("serialize then deserialize round-trips", () => {
  const world = emptyWorld();
  world.pieces.push({ id: "a", pieceId: "mur-plein", cellX: 1, cellZ: 2, level: 0, rotation: 0, materialId: "bois" });
  const restored = deserializeWorld(serializeWorld(world));
  assert.deepEqual(restored, world);
});

test("deserializeWorld falls back to an empty world for null input", () => {
  assert.deepEqual(deserializeWorld(null), emptyWorld());
});

test("deserializeWorld falls back to an empty world for invalid JSON", () => {
  assert.deepEqual(deserializeWorld("{not json"), emptyWorld());
});

test("deserializeWorld falls back to an empty world when pieces is missing", () => {
  assert.deepEqual(deserializeWorld(JSON.stringify({ terrain: emptyWorld().terrain })), emptyWorld());
});

test("deserializeWorld falls back to an empty world when the terrain size is wrong", () => {
  const bad = { terrain: [[0, 0]], pieces: [] };
  assert.deepEqual(deserializeWorld(JSON.stringify(bad)), emptyWorld());
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../save.ts'`.

- [ ] **Step 3: Implement `save.ts`**

```ts
// src/games/chateau/save.ts
// note : extensions .ts nécessaires — même raison que terrain.ts (Task 2) et placement.ts
// (Task 4) : ce fichier est chargé transitivement par save.test.ts sous node --experimental-strip-types.
import { PLOT_SIZE } from "./constants.ts";
import { createHeightmap, type Heightmap } from "./terrain.ts";
import type { PlacedPiece } from "./placement.ts";

export interface WorldState {
  terrain: Heightmap;
  pieces: PlacedPiece[];
}

const STORAGE_KEY = "chateau-save-v1";

export function emptyWorld(): WorldState {
  return { terrain: createHeightmap(), pieces: [] };
}

export function serializeWorld(world: WorldState): string {
  return JSON.stringify(world);
}

function isValidWorld(value: unknown): value is WorldState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<WorldState>;
  if (!Array.isArray(candidate.terrain) || candidate.terrain.length !== PLOT_SIZE + 1) return false;
  if (!candidate.terrain.every((row) => Array.isArray(row) && row.length === PLOT_SIZE + 1)) return false;
  if (!Array.isArray(candidate.pieces)) return false;
  return true;
}

export function deserializeWorld(raw: string | null): WorldState {
  if (!raw) return emptyWorld();
  try {
    const parsed: unknown = JSON.parse(raw);
    return isValidWorld(parsed) ? parsed : emptyWorld();
  } catch {
    return emptyWorld();
  }
}

export function saveToLocalStorage(world: WorldState): void {
  localStorage.setItem(STORAGE_KEY, serializeWorld(world));
}

export function loadFromLocalStorage(): WorldState {
  return deserializeWorld(localStorage.getItem(STORAGE_KEY));
}

export function clearSave(): void {
  localStorage.removeItem(STORAGE_KEY);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/games/chateau/save.ts src/games/chateau/test/save.test.ts
git commit -m "feat(chateau): save/load serialization"
```

---

### Task 6: Download and prepare PBR textures

**Files:**
- Create: `public/textures/chateau/pierre-claire/{diffuse,normal,roughness}.webp`
- Create: `public/textures/chateau/pierre-sombre/{diffuse,normal,roughness}.webp`
- Create: `public/textures/chateau/brique/{diffuse,normal,roughness}.webp`
- Create: `public/textures/chateau/bois/{diffuse,normal,roughness}.webp`
- Create: `public/textures/chateau/ardoise/{diffuse,normal,roughness}.webp`
- Create: `public/textures/chateau/tuile-terre-cuite/{diffuse,normal,roughness}.webp`

Six real CC0 PBR texture sets from [Poly Haven](https://polyhaven.com) (no attribution legally required, but they're a great source to credit if we ever write a credits page):

| Material id | Poly Haven asset |
|---|---|
| `pierre-claire` | `castle_brick_02_white` |
| `pierre-sombre` | `medieval_blocks_02` |
| `brique` | `castle_brick_01` |
| `bois` | `brown_planks_04` |
| `ardoise` | `castle_wall_slates` |
| `tuile-terre-cuite` | `clay_roof_tiles` |

- [ ] **Step 1: Download and convert each texture set**

Run (downloads the 1k JPG diffuse/normal/roughness maps, converts each to `.webp` with `ffmpeg`, and removes the JPGs — repeat the block per material by swapping `MATID`/`SLUG`):

```bash
declare -A SLUGS=(
  [pierre-claire]=castle_brick_02_white
  [pierre-sombre]=medieval_blocks_02
  [brique]=castle_brick_01
  [bois]=brown_planks_04
  [ardoise]=castle_wall_slates
  [tuile-terre-cuite]=clay_roof_tiles
)

for MATID in "${!SLUGS[@]}"; do
  SLUG="${SLUGS[$MATID]}"
  DIR="public/textures/chateau/$MATID"
  mkdir -p "$DIR"
  curl -sL "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/${SLUG}/${SLUG}_diff_1k.jpg" -o "$DIR/diffuse.jpg"
  curl -sL "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/${SLUG}/${SLUG}_nor_gl_1k.jpg" -o "$DIR/normal.jpg"
  curl -sL "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/${SLUG}/${SLUG}_rough_1k.jpg" -o "$DIR/roughness.jpg"
  ffmpeg -y -i "$DIR/diffuse.jpg" -q:v 80 "$DIR/diffuse.webp"
  ffmpeg -y -i "$DIR/normal.jpg" -q:v 80 "$DIR/normal.webp"
  ffmpeg -y -i "$DIR/roughness.jpg" -q:v 80 "$DIR/roughness.webp"
  rm "$DIR/diffuse.jpg" "$DIR/normal.jpg" "$DIR/roughness.jpg"
done
```

Expected: `public/textures/chateau/<material-id>/{diffuse,normal,roughness}.webp` exist for all 6 materials, each a few hundred KB.

- [ ] **Step 2: Verify file sizes are reasonable**

Run: `du -sh public/textures/chateau/*/*.webp | sort -h`
Expected: each file well under 1 MB; total under ~10 MB. If `ffmpeg` isn't available in the execution environment, install it first (`winget install Gyan.FFmpeg` on Windows) — there is no fallback path in this task, the game has no textures without it.

- [ ] **Step 3: Commit**

```bash
git add public/textures/chateau
git commit -m "feat(chateau): add CC0 PBR textures from Poly Haven"
```

---

### Task 7: Three.js scene rig

**Files:**
- Create: `src/games/chateau/scene.ts`

- [ ] **Step 1: Write the scene rig**

```ts
// src/games/chateau/scene.ts
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { PLOT_SIZE, CELL_SIZE } from "./constants";

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

export function plotCenter(): number {
  return (PLOT_SIZE * CELL_SIZE) / 2;
}

export function createSceneRig(canvas: HTMLCanvasElement): SceneRig {
  const scene = new THREE.Scene();
  scene.background = skyTexture();

  const center = plotCenter();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(center + 16, 16, center + 16);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(center, 0, center);
  controls.minDistance = 6;
  controls.maxDistance = 40;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.enablePan = false;
  controls.update();

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

  return { scene, camera, renderer, controls };
}
```

- [ ] **Step 2: Wire a minimal render loop to verify it visually**

Temporarily replace the content of `src/games/chateau/main.ts` with:

```ts
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
```

Run: `npm run dev`, open `/games/chateau/`.
Expected: a sky gradient fills the canvas, orbit controls respond to drag/scroll (nothing to look at yet — that's Task 8). No console errors.

- [ ] **Step 3: Commit**

```bash
git add src/games/chateau/scene.ts src/games/chateau/main.ts
git commit -m "feat(chateau): Three.js scene rig (camera, lighting, sky)"
```

---

### Task 8: Terrain mesh rendering + sculpting interaction

**Files:**
- Create: `src/games/chateau/terrain-mesh.ts`
- Modify: `src/games/chateau/main.ts`

- [ ] **Step 1: Write the terrain mesh builder**

```ts
// src/games/chateau/terrain-mesh.ts
import * as THREE from "three";
import type { Heightmap } from "./terrain";
import { PLOT_SIZE, CELL_SIZE, LEVEL_HEIGHT, WATER_LEVEL } from "./constants";

export function buildTerrainGeometry(grid: Heightmap): THREE.BufferGeometry {
  const verticesPerSide = PLOT_SIZE + 1;
  const positions = new Float32Array(verticesPerSide * verticesPerSide * 3);
  const uvs = new Float32Array(verticesPerSide * verticesPerSide * 2);
  let vi = 0;
  let ui = 0;
  for (let iz = 0; iz < verticesPerSide; iz++) {
    for (let ix = 0; ix < verticesPerSide; ix++) {
      positions[vi++] = ix * CELL_SIZE;
      positions[vi++] = grid[iz][ix] * LEVEL_HEIGHT;
      positions[vi++] = iz * CELL_SIZE;
      uvs[ui++] = ix / PLOT_SIZE;
      uvs[ui++] = iz / PLOT_SIZE;
    }
  }

  const indices: number[] = [];
  for (let iz = 0; iz < PLOT_SIZE; iz++) {
    for (let ix = 0; ix < PLOT_SIZE; ix++) {
      const a = iz * verticesPerSide + ix;
      const b = a + 1;
      const c = a + verticesPerSide;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createTerrainMesh(grid: Heightmap): THREE.Mesh {
  const material = new THREE.MeshStandardMaterial({ color: 0x8fbf6a, roughness: 0.95 });
  const mesh = new THREE.Mesh(buildTerrainGeometry(grid), material);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}

export function updateTerrainMesh(mesh: THREE.Mesh, grid: Heightmap): void {
  mesh.geometry.dispose();
  mesh.geometry = buildTerrainGeometry(grid);
}

export function createWaterMesh(): THREE.Mesh {
  const size = PLOT_SIZE * CELL_SIZE;
  const geometry = new THREE.PlaneGeometry(size, size);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(size / 2, 0, size / 2);
  const material = new THREE.MeshStandardMaterial({
    color: 0x2f7bb0,
    transparent: true,
    opacity: 0.75,
    roughness: 0.15,
    metalness: 0.05,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = WATER_LEVEL * LEVEL_HEIGHT;
  return mesh;
}

/** Coordonnées de cellule (arrondi au sommet de grille le plus proche) sous un point d'intersection sur le maillage du terrain. */
export function nearestVertex(point: THREE.Vector3): { x: number; z: number } {
  return {
    x: Math.round(point.x / CELL_SIZE),
    z: Math.round(point.z / CELL_SIZE),
  };
}
```

- [ ] **Step 2: Wire terrain + water into the scene, add click-to-sculpt**

Replace `src/games/chateau/main.ts` with:

```ts
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
```

- [ ] **Step 3: Verify terrain sculpting manually**

Run: `npm run dev`, open `/games/chateau/`.
Expected: a flat green plot with a translucent blue water plane sits at the edges/low areas. Clicking raises the nearest grid point (visible bump); shift-clicking lowers it. Orbit/zoom still work. No console errors.

- [ ] **Step 4: Commit**

```bash
git add src/games/chateau/terrain-mesh.ts src/games/chateau/main.ts
git commit -m "feat(chateau): terrain mesh rendering and sculpting"
```

---

### Task 9: Piece geometry builders

**Files:**
- Create: `src/games/chateau/piece-geometry.ts`

- [ ] **Step 1: Write the geometry builders**

```ts
// src/games/chateau/piece-geometry.ts
import * as THREE from "three";
import { CELL_SIZE, LEVEL_HEIGHT } from "./constants";

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function wallSolid(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const geo = new THREE.BoxGeometry(CELL_SIZE, LEVEL_HEIGHT, 0.25);
  geo.translate(0, LEVEL_HEIGHT / 2, 0);
  group.add(mesh(geo, material));
  return group;
}

function wallWithOpening(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const postWidth = CELL_SIZE * 0.25;
  const postGeo = new THREE.BoxGeometry(postWidth, LEVEL_HEIGHT, 0.25);
  postGeo.translate(0, LEVEL_HEIGHT / 2, 0);
  const left = mesh(postGeo, material);
  left.position.x = -(CELL_SIZE / 2 - postWidth / 2);
  const right = mesh(postGeo.clone(), material);
  right.position.x = CELL_SIZE / 2 - postWidth / 2;
  const lintelHeight = LEVEL_HEIGHT * 0.3;
  const lintelGeo = new THREE.BoxGeometry(CELL_SIZE, lintelHeight, 0.25);
  lintelGeo.translate(0, LEVEL_HEIGHT - lintelHeight / 2, 0);
  group.add(left, right, mesh(lintelGeo, material));
  return group;
}

function pillar(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const geo = new THREE.CylinderGeometry(CELL_SIZE * 0.18, CELL_SIZE * 0.2, LEVEL_HEIGHT, 12);
  geo.translate(0, LEVEL_HEIGHT / 2, 0);
  group.add(mesh(geo, material));
  return group;
}

function platform(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const thickness = LEVEL_HEIGHT * 0.15;
  const geo = new THREE.BoxGeometry(CELL_SIZE, thickness, CELL_SIZE);
  geo.translate(0, thickness / 2, 0);
  group.add(mesh(geo, material));
  return group;
}

function roofSlope(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const half = CELL_SIZE / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-half, 0);
  shape.lineTo(half, 0);
  shape.lineTo(-half, LEVEL_HEIGHT);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: CELL_SIZE, bevelEnabled: false });
  geo.translate(0, 0, -half);
  group.add(mesh(geo, material));
  return group;
}

function ridgeCap(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const w = CELL_SIZE * 0.18;
  const shape = new THREE.Shape();
  shape.moveTo(-w, 0);
  shape.lineTo(w, 0);
  shape.lineTo(0, w * 0.8);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: CELL_SIZE, bevelEnabled: false });
  geo.rotateY(Math.PI / 2);
  geo.translate(0, LEVEL_HEIGHT, CELL_SIZE / 2);
  group.add(mesh(geo, material));
  return group;
}

function conicalTurretRoof(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const geo = new THREE.ConeGeometry(CELL_SIZE * 0.55, LEVEL_HEIGHT * 1.4, 16);
  geo.translate(0, LEVEL_HEIGHT * 0.7, 0);
  group.add(mesh(geo, material));
  return group;
}

function roundTower(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const geo = new THREE.CylinderGeometry(CELL_SIZE * 0.5, CELL_SIZE * 0.5, LEVEL_HEIGHT, 20);
  geo.translate(0, LEVEL_HEIGHT / 2, 0);
  group.add(mesh(geo, material));
  return group;
}

function squareTower(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const geo = new THREE.BoxGeometry(CELL_SIZE, LEVEL_HEIGHT, CELL_SIZE);
  geo.translate(0, LEVEL_HEIGHT / 2, 0);
  group.add(mesh(geo, material));
  return group;
}

function stairs(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const steps = 4;
  const stepDepth = CELL_SIZE / steps;
  for (let s = 0; s < steps; s++) {
    const stepHeight = ((s + 1) / steps) * LEVEL_HEIGHT;
    const geo = new THREE.BoxGeometry(CELL_SIZE, stepHeight, stepDepth);
    geo.translate(0, stepHeight / 2, -CELL_SIZE / 2 + stepDepth * (s + 0.5));
    group.add(mesh(geo, material));
  }
  return group;
}

function crenellation(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const baseHeight = LEVEL_HEIGHT * 0.15;
  const baseGeo = new THREE.BoxGeometry(CELL_SIZE, baseHeight, CELL_SIZE * 0.5);
  baseGeo.translate(0, baseHeight / 2, 0);
  group.add(mesh(baseGeo, material));
  const merlonCount = 3;
  const merlonWidth = CELL_SIZE / (merlonCount * 2);
  const merlonHeight = LEVEL_HEIGHT * 0.35;
  for (let i = 0; i < merlonCount; i++) {
    const geo = new THREE.BoxGeometry(merlonWidth, merlonHeight, CELL_SIZE * 0.5);
    const x = -CELL_SIZE / 2 + merlonWidth * (2 * i + 1);
    geo.translate(x, baseHeight + merlonHeight / 2, 0);
    group.add(mesh(geo, material));
  }
  return group;
}

function drawbridge(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const thickness = LEVEL_HEIGHT * 0.1;
  const geo = new THREE.BoxGeometry(CELL_SIZE, thickness, CELL_SIZE);
  geo.translate(0, thickness / 2, 0);
  group.add(mesh(geo, material));
  return group;
}

function portcullis(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const barThickness = 0.06;
  const verticalBars = 5;
  const span = CELL_SIZE * 0.7;
  for (let i = 0; i < verticalBars; i++) {
    const geo = new THREE.BoxGeometry(barThickness, LEVEL_HEIGHT * 0.9, barThickness);
    geo.translate(-span / 2 + (span / (verticalBars - 1)) * i, LEVEL_HEIGHT * 0.45, 0);
    group.add(mesh(geo, material));
  }
  const horizontalBars = 4;
  for (let i = 0; i < horizontalBars; i++) {
    const geo = new THREE.BoxGeometry(span, barThickness, barThickness);
    geo.translate(0, (LEVEL_HEIGHT * 0.9 * (i + 0.5)) / horizontalBars, 0);
    group.add(mesh(geo, material));
  }
  return group;
}

// La torche et la plante grimpante ignorent volontairement le matériau choisi :
// flamme et feuillage n'ont pas de sens en "ardoise" ou "tuile terre cuite".
function torch(_material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const handleMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3320, roughness: 0.8 });
  const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, LEVEL_HEIGHT * 0.5, 8);
  handleGeo.translate(0, LEVEL_HEIGHT * 0.25, 0);
  group.add(mesh(handleGeo, handleMaterial));
  const flameMaterial = new THREE.MeshStandardMaterial({ color: 0xffaa33, emissive: 0xff6a00, emissiveIntensity: 1.2 });
  const flameGeo = new THREE.SphereGeometry(0.09, 10, 10);
  flameGeo.translate(0, LEVEL_HEIGHT * 0.55, 0);
  group.add(mesh(flameGeo, flameMaterial));
  return group;
}

function shieldDecor(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const geo = new THREE.BoxGeometry(CELL_SIZE * 0.35, LEVEL_HEIGHT * 0.5, 0.06);
  geo.translate(0, LEVEL_HEIGHT * 0.5, CELL_SIZE / 2 - 0.1);
  group.add(mesh(geo, material));
  return group;
}

function climbingVine(_material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const vineMaterial = new THREE.MeshStandardMaterial({ color: 0x4c8a3e, roughness: 0.9 });
  const clusters = 5;
  for (let i = 0; i < clusters; i++) {
    const geo = new THREE.SphereGeometry(0.1, 8, 8);
    const y = (LEVEL_HEIGHT * (i + 0.5)) / clusters;
    geo.translate((i % 2 === 0 ? -1 : 1) * 0.05, y, CELL_SIZE / 2 - 0.1);
    group.add(mesh(geo, vineMaterial));
  }
  return group;
}

const BUILDERS: Record<string, (material: THREE.Material) => THREE.Group> = {
  "mur-plein": wallSolid,
  "mur-ouverture": wallWithOpening,
  pilier: pillar,
  sol: platform,
  "toit-pan": roofSlope,
  faitage: ridgeCap,
  "tourelle-conique": conicalTurretRoof,
  "tour-ronde": roundTower,
  "tour-carree": squareTower,
  escalier: stairs,
  creneau: crenellation,
  "pont-levis": drawbridge,
  "grille-herse": portcullis,
  torche: torch,
  blason: shieldDecor,
  "plante-grimpante": climbingVine,
};

export function buildPieceMesh(pieceId: string, rotationDeg: number, material: THREE.Material): THREE.Object3D {
  const builder = BUILDERS[pieceId];
  if (!builder) throw new Error(`pièce inconnue : ${pieceId}`);
  const group = builder(material);
  group.rotation.y = (rotationDeg * Math.PI) / 180;
  return group;
}
```

- [ ] **Step 2: Verify every piece renders**

Temporarily add this snippet at the bottom of `main.ts` (remove it again in Task 11 once the real palette exists):

```ts
import { PIECES } from "./pieces";
import { buildPieceMesh } from "./piece-geometry";
import { CELL_SIZE } from "./constants";

PIECES.forEach((piece, i) => {
  const placeholderMaterial = new THREE.MeshStandardMaterial({ color: 0xd8c9a8 });
  const obj = buildPieceMesh(piece.id, 0, placeholderMaterial);
  obj.position.set((i % 4) * CELL_SIZE * 1.5 + 1, 0, Math.floor(i / 4) * CELL_SIZE * 1.5 + 1);
  scene.add(obj);
});
```

Run: `npm run dev`, open `/games/chateau/`.
Expected: a 4×4 grid of 16 distinct beige shapes appears near the terrain origin — walls, a wedge roof, a cone, towers, stairs, crenellations, a portcullis lattice, a torch, a shield, vine dots. For any piece that looks wrong (flipped, floating, wrong facing), fix the offending builder's `translate`/`rotate` calls now. Remove the verification snippet once every piece looks right (Task 11 replaces it with real placement).

- [ ] **Step 3: Commit**

```bash
git add src/games/chateau/piece-geometry.ts
git commit -m "feat(chateau): procedural piece geometry builders"
```

---

### Task 10: Material texture loading

**Files:**
- Create: `src/games/chateau/materials-three.ts`

- [ ] **Step 1: Write the texture-to-material bridge**

```ts
// src/games/chateau/materials-three.ts
import * as THREE from "three";
import { MATERIALS, materialById } from "./materials";

const loader = new THREE.TextureLoader();
const cache = new Map<string, THREE.MeshStandardMaterial>();

function loadTiledTexture(url: string): THREE.Texture {
  const texture = loader.load(url);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function threeMaterialFor(materialId: string): THREE.MeshStandardMaterial {
  const cached = cache.get(materialId);
  if (cached) return cached;
  const def = materialById(materialId);
  const map = loadTiledTexture(def.diffuse);
  map.colorSpace = THREE.SRGBColorSpace;
  const normalMap = loadTiledTexture(def.normal);
  const roughnessMap = loadTiledTexture(def.roughness);
  const material = new THREE.MeshStandardMaterial({ map, normalMap, roughnessMap });
  cache.set(materialId, material);
  return material;
}

export function preloadAllMaterials(): void {
  for (const def of MATERIALS) threeMaterialFor(def.id);
}
```

- [ ] **Step 2: Swap the placeholder material in the Task 9 verification snippet**

In `main.ts`, replace `const placeholderMaterial = new THREE.MeshStandardMaterial({ color: 0xd8c9a8 });` with:

```ts
import { threeMaterialFor } from "./materials-three";
// ...
const placeholderMaterial = threeMaterialFor("pierre-claire");
```

Run: `npm run dev`, open `/games/chateau/`.
Expected: the 16 pieces from Task 9 now show real stone texture instead of flat beige — visible brick/stone pattern, believable shading under the directional light.

- [ ] **Step 3: Commit**

```bash
git add src/games/chateau/materials-three.ts src/games/chateau/main.ts
git commit -m "feat(chateau): load PBR textures into Three.js materials"
```

---

### Task 11: Palette UI + placement/removal interaction

**Files:**
- Modify: `src/games/chateau/main.ts` (full rewrite of the interaction layer)

- [ ] **Step 1: Replace `main.ts` with the complete interaction wiring**

```ts
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
import { CELL_SIZE, LEVEL_HEIGHT } from "./constants";

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
  object.position.set(x, piece.level * LEVEL_HEIGHT, z);
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
  ghost.position.set(x, result.level * LEVEL_HEIGHT, z);
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
```

- [ ] **Step 2: Verify the full interaction loop manually**

Run: `npm run dev`, open `/games/chateau/`.
Expected:
- The palette on the right lists all 16 pieces and 6 materials as clickable buttons; clicking one highlights it.
- Moving the mouse over the terrain shows a green (valid) or red (invalid, e.g. outside the plot) translucent ghost piece following the cursor.
- Left-click (a quick tap, not a drag) places the selected piece with the selected material at the hovered cell; a second click on the same cell stacks another piece on top.
- Left-click-and-drag orbits the camera as usual and does NOT place a piece at the drag's starting point — this is the click-vs-drag guard from Task 8's review; if a piece gets placed every time you orbit, the guard isn't working.
- Right-click raises terrain; shift+right-click lowers it (terrain updates immediately).
- "↻ Pivoter" rotates the ghost/next placed piece by 90°.
- Alt+click removes the topmost piece on the hovered cell.
- "Recommencer" clears both terrain and every placed piece back to the starting flat plot.

- [ ] **Step 3: Commit**

```bash
git add src/games/chateau/main.ts
git commit -m "feat(chateau): palette UI and placement/removal interaction"
```

---

### Task 12: Save/load wiring

**Files:**
- Modify: `src/games/chateau/main.ts`

- [ ] **Step 1: Load any existing save on boot, and save after every change**

In `main.ts`, add the import:

```ts
import { loadFromLocalStorage, saveToLocalStorage, clearSave } from "./save";
```

Then replace this whole block (from `let terrain: Heightmap = createHeightmap();` down to `const placedObjects = new Map<string, THREE.Object3D>();`):

```ts
let terrain: Heightmap = createHeightmap();
const terrainMesh = createTerrainMesh(terrain);
scene.add(terrainMesh);
scene.add(createWaterMesh());

let placedPieces: PlacedPiece[] = [];
const placedObjects = new Map<string, THREE.Object3D>();
```

with:

```ts
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
```

(`addPieceToScene` is a hoisted `function` declaration defined further down in the file, so calling it here — after `placedObjects` exists — is safe.)

Add a `persist()` call at the end of: the right-click terrain sculpt handler, the alt-click removal branch, and the left-click placement branch (right after `addPieceToScene(piece);`).

In the "Recommencer" button handler, replace the body with:

```ts
document.getElementById("reset-btn")!.addEventListener("click", () => {
  terrain = createHeightmap();
  updateTerrainMesh(terrainMesh, terrain);
  for (const id of [...placedObjects.keys()]) removePieceFromScene(id);
  placedPieces = [];
  clearSave();
});
```

- [ ] **Step 2: Verify persistence manually**

Run: `npm run dev`, open `/games/chateau/`. Sculpt some terrain, place a few pieces, then reload the page (F5).
Expected: the terrain shape and every placed piece are exactly as left before reload. Click "Recommencer", reload again — the plot is back to flat and empty (the save was actually cleared, not just the in-memory state).

Then verify the corrupted-save safeguard: with at least one piece placed, open the browser devtools console and run
`localStorage.setItem("chateau-save-v1", JSON.stringify({ ...JSON.parse(localStorage.getItem("chateau-save-v1")), pieces: [...JSON.parse(localStorage.getItem("chateau-save-v1")).pieces, { id: "x", pieceId: "donjon-inexistant", cellX: 0, cellZ: 0, level: 0, rotation: 0, materialId: "bois" }] }))`
(this appends one piece with an unknown `pieceId`) then reload the page.
Expected: the page loads normally, every valid piece is still there, a `console.warn` about the corrupted piece appears in devtools, and no uncaught exception is thrown. Reload once more — the corrupted entry should be gone from `localStorage` too (self-healed by the next `persist()`).

- [ ] **Step 3: Commit**

```bash
git add src/games/chateau/main.ts
git commit -m "feat(chateau): persist and restore the world from localStorage"
```

---

### Task 13: Manual end-to-end verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full automated test suite**

Run: `npm test`
Expected: PASS — every test from Tasks 2–5 (terrain, pieces, materials, placement, save) green, nothing skipped.

- [ ] **Step 2: Run a production build**

Run: `npm run build`
Expected: build succeeds, `dist/` contains a `games/chateau/index.html` alongside the other games' output, no TypeScript or bundling errors.

- [ ] **Step 3: Full manual playthrough**

Run: `npm run dev`, open `/games/chateau/`, and walk through the spec's testing checklist:
- Modeler le terrain (relief, colline, douves visibles sous l'eau)
- Poser, pivoter puis retirer au moins une pièce de chacune des 4 catégories (structure, toiture, verticalité, décor)
- Changer le matériau d'une pièce avant de la poser, vérifier que la texture appliquée correspond au choix
- Recharger la page (F5) : le château et le terrain sont bien restaurés
- Cliquer "Recommencer" : la parcelle redevient vide et plate, et le reste après un nouveau F5
- Depuis `/`, ouvrir la carte "Château" dans la section Atelier et vérifier qu'elle mène bien au jeu

Expected: every step behaves as described, no console errors at any point.

- [ ] **Step 4: Final review of the diff**

Run: `git log --oneline master..HEAD` and `git diff master --stat`
Expected: a clean, reviewable stack of commits scoped to `chateau` (plus the two shared files it had to touch: `index.html`, `vite.config.ts`), ready for `superpowers:finishing-a-development-branch`.

---

## Self-review notes

- **Spec coverage:** every row of the coverage map above maps to a task; no spec requirement (terrain relief, free block building, auto-anchor, material palette, orbit camera, local save, PBR rendering, water, error handling) is left unimplemented.
- **Placeholders:** none — every step has real code, real commands, or an explicit, itemized manual-verification checklist instead of a vague "test it" instruction.
- **Type/name consistency checked:** `PieceDef.id` (Task 3) ↔ `BUILDERS` keys (Task 9) ↔ `resolvePlacement`'s `pieceId` field (Task 4) all use the same 16 string ids. `MaterialDef.id` (Task 3) ↔ `threeMaterialFor` (Task 10) ↔ `PlacedPiece.materialId` (Task 4) all use the same 6 string ids. `Heightmap`/`WorldState`/`PlacedPiece` types are defined once (`terrain.ts`, `save.ts`, `placement.ts`) and imported everywhere else, never redefined.
