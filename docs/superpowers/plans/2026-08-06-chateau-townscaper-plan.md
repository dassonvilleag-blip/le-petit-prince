# Château → Townscaper (v2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the v1 château (piece catalog + placement/pile + sculptable terrain) with a Townscaper-style building sandbox — a grid where clicking/dragging grows building mass, corners round automatically (convex outward, concave via a chamfer — see note below), floors taper with height, and each column gets a small gabled roof.

**Architecture:** Two new pure, unit-tested logic modules (`grid.ts`, `corners.ts`) replace `terrain.ts`/`placement.ts`. A new Three.js geometry module (`building-geometry.ts`, not unit-testable — no WebGL under Node) replaces `piece-geometry.ts`/`terrain-mesh.ts`, built from primitives already proven in this codebase (`THREE.Shape` + `ExtrudeGeometry`). `scene.ts` regains `OrbitControls` (removed during the v1's fly-camera detour), reconfigured Townscaper-style. `save.ts` is rewritten around the new, much simpler `WorldState` (just a grid, no piece list). `main.ts` is rewritten for paint-to-grow interaction.

**Tech Stack:** Vite + TypeScript + Three.js (all already in place — no new dependency). `node --experimental-strip-types --test` for the pure-logic unit tests (existing convention).

---

## A note on the concave-corner geometry (read before starting Task 7)

The design spec asked for smooth rounding on **both** convex and concave corners, matching the real Townscaper. While preparing this plan, I derived the exact circle-tangency math for both cases by hand (verified via explicit per-quadrant angle computation, not guessed) to make sure the plan wouldn't hand an implementer a broken formula. Result:

- **Convex** corners: a standard rounded-rectangle corner (tangent circle inset by the radius from the corner, short 90° arc bulging toward the corner). This is the well-known, verified-correct construction — no issue.
- **Concave** corners: a small circular arc that is *tangent* to both adjoining straight edges *and* recedes inward (rather than bulging outward or overshooting) does not exist for this configuration — every tangent-circle construction I tried (inset center, outset center, both arc directions) either reproduces the convex bulge or overshoots into a large, badly-shaped loop. This isn't a coding gap, it's a real geometric constraint: a small, simple arc tangent to two perpendicular edges near a plain square's corner is *inherently* the convex case; making it recede requires either literally moving the material's own edges inward first (which breaks the "same classification, just scaled" reuse the tapering relies on) or a genuine boolean-subtraction geometry engine (a much bigger dependency than this project needs).

**Decision:** concave corners are rendered as a **chamfer** (a 45°-cut notch through the same inset point the convex arc's center would use) instead of a smooth arc. This is simple, definitely correct (non-self-intersecting, genuinely recedes inward — verified below), and clearly reads as "different from flush/convex" — it just isn't curved. This is a deliberate, flagged v1 simplification, not an oversight. A true smooth concave fillet is a viable follow-up (it would need each floor built from separate per-corner primitive pieces unioned together, rather than one continuous `THREE.Shape` path) but is out of scope here.

If, after building this, the chamfered look reads as noticeably worse than the design intended, that's a real product question worth raising — but it should be assessed by looking at the actual built game, not re-litigated in the abstract.

## A note on the wall-extrusion rotation (read before starting Task 7)

`extrudeFlat()` builds each floor's 2D footprint in `THREE.Shape`'s own (x, y) plane, then calls `geometry.rotateX(-Math.PI / 2)` to stand it upright. I checked numerically (not from memory) what this rotation actually does to the shape's coordinates, because getting it wrong would misalign every rounded/chamfered corner with the real grid neighbor it's supposed to match:

```
Shape y-range [-0.5, 0.9] → after rotateX(-Math.PI/2) → world Z-range [-0.9, 0.5]
```

**`rotateX(-Math.PI/2)` sends the shape's `y` to `-worldZ`, not `+worldZ`.** Without compensating for this, a corner classified using the grid's real `+cellZ` neighbor would render its convex bulge or concave chamfer on the world `-Z` side instead — i.e., mirrored relative to the actual neighboring cells, which would misalign adjoining cells' corners instead of knitting them together. `buildFloorShape` below compensates by using `gz = -dz` for every y-coordinate in the shape (while `dx` needs no such correction — the X range was confirmed unaffected by this rotation).

**Both the alignment fix and the side-wall winding were then actually run, not just derived** — I built the real `buildFloorShape`/`extrudeFlat` code, bundled it, and ran the exact checks in Task 7's Step 2 before writing this plan's final version:

- A `pp` (dx=+1, dz=+1) corner classified `"concave"` recedes specifically in the world `(+X, +Z)` octant (measured: `0.4243` vs. a `0.5831` all-convex baseline in that same octant), while the `(+X, -Z)` octant — left convex in the same test — stays unchanged (`0.5831` both times). This confirms the `gz = -dz` compensation genuinely fixes the alignment, not just in theory.
- The `+X` side wall's outward normal measures `(1, 0, -0)` — correctly pointing in `+X`, away from the column's center, not inward. Winding is correct; no reversal is needed.

Task 7's Step 2 walks through reproducing both checks yourself against the real files you create — treat it as confirmation, not as open-ended debugging, since the underlying math is already known-good. `THREE.DoubleSide` is still set on the wall material in Task 8 as a free, zero-cost safety net regardless (it can only help, never hurt, if anything about the real build's material setup differs from this isolated check).

---

## Spec coverage map

| Spec section | Implemented in |
|---|---|
| Grille + hauteur par case, faire grandir/retirer | Task 2 (`grid.ts`) |
| Arrondi automatique (convexe/concave/tout-droit/diagonal indépendant) | Task 3 (`corners.ts`) |
| Construction du volume (Shape+Extrude), rétrécissement par étage | Task 7 (`building-geometry.ts`) |
| Toit à deux pans par case, orientation déterministe | Task 7 (`building-geometry.ts`) |
| Palette de couleurs (remplace les matériaux PBR) | Task 4 (`palette.ts`) |
| Eau plate sous toute la grille | Task 7/8 (plan d'eau statique) |
| Interaction (glisser pour construire, alt+clic pour retirer) | Task 8 (`main.ts`) |
| Caméra en orbite fidèle à Townscaper | Task 6 (`scene.ts`) |
| Sauvegarde (nouveau format) | Task 5 (`save.ts`) |
| Suppression des mécaniques v1 abandonnées | Task 1 |

---

### Task 1: Clean slate — remove v1 files, rewrite constants

**Files:**
- Delete: `src/games/chateau/terrain.ts`, `src/games/chateau/terrain-mesh.ts`, `src/games/chateau/pieces.ts`, `src/games/chateau/piece-geometry.ts`, `src/games/chateau/materials.ts`, `src/games/chateau/materials-three.ts`, `src/games/chateau/placement.ts`, `src/games/chateau/fly-controls.ts`
- Delete: `src/games/chateau/test/terrain.test.ts`, `src/games/chateau/test/pieces.test.ts`, `src/games/chateau/test/placement.test.ts`, `src/games/chateau/test/materials.test.ts`
- Delete: `public/textures/chateau/` (entire directory — PBR textures no longer used, replaced by flat colors)
- Modify: `src/games/chateau/constants.ts` (full rewrite)
- Modify: `games/chateau/index.html` (palette markup + hint text)
- Keep as-is for now (later tasks modify them): `src/games/chateau/scene.ts`, `src/games/chateau/main.ts`, `src/games/chateau/save.ts`, `src/games/chateau/chateau.css`

- [ ] **Step 1: Delete the v1 game-logic and geometry files**

```bash
git rm src/games/chateau/terrain.ts src/games/chateau/terrain-mesh.ts src/games/chateau/pieces.ts src/games/chateau/piece-geometry.ts src/games/chateau/materials.ts src/games/chateau/materials-three.ts src/games/chateau/placement.ts src/games/chateau/fly-controls.ts
git rm src/games/chateau/test/terrain.test.ts src/games/chateau/test/pieces.test.ts src/games/chateau/test/placement.test.ts src/games/chateau/test/materials.test.ts
git rm -r public/textures/chateau
```

Expected: all listed files/directories removed from the working tree and staged for deletion.

- [ ] **Step 2: Rewrite `constants.ts`**

```ts
// src/games/chateau/constants.ts
export const GRID_SIZE = 20; // cellules par côté
export const MAX_FLOORS = 8; // étages max par case
export const CELL_SIZE = 1; // unités monde par cellule (X/Z)
export const FLOOR_HEIGHT = 1; // unités monde par étage
export const CORNER_RADIUS = CELL_SIZE / 3; // rayon des coins arrondis/chamfrés
export const FLOOR_INSET = CELL_SIZE * 0.06; // rétrécissement par étage au-dessus du rez-de-chaussée
export const MIN_HALF_EXTENT = CELL_SIZE * 0.15; // demi-largeur plancher, pour qu'un étage très haut ne s'inverse jamais
export const ROOF_HEIGHT = FLOOR_HEIGHT * 0.6; // hauteur du toit à deux pans
export const WATER_LEVEL = 0; // les bâtiments poussent à partir du niveau de l'eau, pas de terrain variable
```

- [ ] **Step 3: Rewrite the game's HTML shell for the new palette/hint**

Replace the `<div class="palette">` and `<div class="hint">` blocks in `games/chateau/index.html`:

```html
    <div class="palette" id="palette">
      <div class="palette-section" id="palette-colors"></div>
      <div class="palette-actions">
        <button id="reset-btn" type="button">Recommencer</button>
      </div>
    </div>

    <div class="hint" id="hint">
      <h1>Château</h1>
      <p>Clic gauche (ou glisser) : construire/faire grandir.<br />
      Alt + clic : retirer un étage.<br />
      Clic droit + glisser : tourner la caméra · molette : zoomer · clic milieu + glisser : déplacer la vue.<br />
      Ton village, ta forme — il n'y a pas de mauvaise réponse.</p>
    </div>
```

Leave everything else in `games/chateau/index.html` (the `<head>`, `<canvas id="scene">`, back-link, script tag) exactly as-is.

- [ ] **Step 4: Verify nothing else references the deleted files**

Run: `grep -rn "terrain\|piece-geometry\|placement\|materials-three\|fly-controls" src/games/chateau/main.ts src/games/chateau/scene.ts src/games/chateau/save.ts games/chateau/index.html`
Expected: no matches (these files still exist and will be rewritten in later tasks, but should not reference anything just deleted). If matches appear, that's expected to be cleaned up by the task that rewrites that specific file — don't fix it here, just confirm you understand what's pending.

- [ ] **Step 5: Commit**

```bash
git add src/games/chateau/constants.ts games/chateau/index.html
git commit -m "feat(chateau): remove v1 piece/terrain system, prep for Townscaper-style grid"
```

---

**Known interim state after Task 1 (expected, resolved by Task 5):** `src/games/chateau/save.ts` was deliberately left untouched by Task 1, but it imports `createHeightmap`/`Heightmap` from the now-deleted `./terrain.ts` — so `save.test.ts` fails with a module-not-found error (not an assertion failure) until Task 5 rewrites `save.ts`. This is the same kind of expected breakage as `main.ts`/`scene.ts` failing to build until Tasks 6/8 — Tasks 2-4's own tests (`grid`, `corners`, `palette`) are unaffected and should pass cleanly; only ignore the pre-existing `save.test.ts` failure specifically, don't treat it as something those tasks broke.

### Task 2: Grid module (pure, TDD)

**Files:**
- Create: `src/games/chateau/grid.ts`
- Test: `src/games/chateau/test/grid.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/games/chateau/test/grid.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { GRID_SIZE, MAX_FLOORS } from "../constants.ts";
import { createGrid, heightAt, cellAt, growCell, shrinkCell } from "../grid.ts";

test("createGrid returns a GRID_SIZE x GRID_SIZE grid, all empty", () => {
  const grid = createGrid();
  assert.equal(grid.length, GRID_SIZE);
  for (const row of grid) {
    assert.equal(row.length, GRID_SIZE);
    for (const cell of row) {
      assert.equal(cell.height, 0);
      assert.equal(cell.colorId, "");
    }
  }
});

test("heightAt out of bounds returns 0", () => {
  assert.equal(heightAt(createGrid(), GRID_SIZE + 5, 0), 0);
  assert.equal(heightAt(createGrid(), -1, 0), 0);
});

test("growCell on an empty cell sets height to 1 with the given color", () => {
  const grid = growCell(createGrid(), 3, 4, "rouge");
  assert.equal(heightAt(grid, 3, 4), 1);
  assert.equal(cellAt(grid, 3, 4).colorId, "rouge");
});

test("growCell on an already-filled cell increments height but keeps the original color", () => {
  let grid = growCell(createGrid(), 3, 4, "rouge");
  grid = growCell(grid, 3, 4, "bleu"); // couleur ignorée : la case garde sa couleur d'origine
  assert.equal(heightAt(grid, 3, 4), 2);
  assert.equal(cellAt(grid, 3, 4).colorId, "rouge");
});

test("growCell clamps at MAX_FLOORS", () => {
  let grid = createGrid();
  for (let i = 0; i < MAX_FLOORS + 5; i++) grid = growCell(grid, 0, 0, "rouge");
  assert.equal(heightAt(grid, 0, 0), MAX_FLOORS);
});

test("growCell out of bounds is a no-op", () => {
  const before = createGrid();
  const after = growCell(before, -1, 0, "rouge");
  assert.deepEqual(after, before);
});

test("growCell only touches the target cell", () => {
  const grid = growCell(createGrid(), 3, 4, "rouge");
  assert.equal(heightAt(grid, 3, 5), 0);
  assert.equal(heightAt(grid, 4, 4), 0);
});

test("shrinkCell decrements height, clamped at 0", () => {
  let grid = growCell(createGrid(), 1, 1, "rouge");
  grid = growCell(grid, 1, 1, "rouge");
  grid = shrinkCell(grid, 1, 1);
  assert.equal(heightAt(grid, 1, 1), 1);
  grid = shrinkCell(grid, 1, 1);
  assert.equal(heightAt(grid, 1, 1), 0);
  grid = shrinkCell(grid, 1, 1); // sur une case déjà vide : ne descend pas sous 0
  assert.equal(heightAt(grid, 1, 1), 0);
});

test("shrinkCell resets the color once the cell becomes empty", () => {
  let grid = growCell(createGrid(), 1, 1, "rouge");
  grid = shrinkCell(grid, 1, 1);
  assert.equal(cellAt(grid, 1, 1).colorId, "");
});

test("shrinkCell out of bounds is a no-op", () => {
  const before = createGrid();
  const after = shrinkCell(before, -1, 0);
  assert.deepEqual(after, before);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../grid.ts'`.

- [ ] **Step 3: Implement `grid.ts`**

```ts
// src/games/chateau/grid.ts
// note : extensions .ts nécessaires sur les imports relatifs — node --experimental-strip-types
// (utilisé par `npm test`) résout les imports en ESM natif, contrairement à Vite/tsc en mode
// bundler, et ce fichier est chargé transitivement par grid.test.ts.
import { GRID_SIZE, MAX_FLOORS } from "./constants.ts";

export interface Cell {
  height: number; // 0 = eau/vide
  colorId: string;
}

export type Grid = Cell[][]; // grid[cellZ][cellX], GRID_SIZE x GRID_SIZE cases

const EMPTY_CELL: Cell = { height: 0, colorId: "" };

export function createGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({ height: 0, colorId: "" })),
  );
}

function inBounds(cellX: number, cellZ: number): boolean {
  return cellX >= 0 && cellX < GRID_SIZE && cellZ >= 0 && cellZ < GRID_SIZE;
}

export function cellAt(grid: Grid, cellX: number, cellZ: number): Cell {
  return inBounds(cellX, cellZ) ? grid[cellZ][cellX] : EMPTY_CELL;
}

export function heightAt(grid: Grid, cellX: number, cellZ: number): number {
  return cellAt(grid, cellX, cellZ).height;
}

function withCell(grid: Grid, cellX: number, cellZ: number, next: Cell): Grid {
  if (!inBounds(cellX, cellZ)) return grid;
  return grid.map((row, z) => (z !== cellZ ? row : row.map((cell, x) => (x !== cellX ? cell : next))));
}

export function growCell(grid: Grid, cellX: number, cellZ: number, colorId: string): Grid {
  const current = cellAt(grid, cellX, cellZ);
  if (current.height === 0) {
    return withCell(grid, cellX, cellZ, { height: 1, colorId });
  }
  return withCell(grid, cellX, cellZ, {
    height: Math.min(MAX_FLOORS, current.height + 1),
    colorId: current.colorId,
  });
}

export function shrinkCell(grid: Grid, cellX: number, cellZ: number): Grid {
  const current = cellAt(grid, cellX, cellZ);
  const height = Math.max(0, current.height - 1);
  return withCell(grid, cellX, cellZ, { height, colorId: height === 0 ? "" : current.colorId });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all `grid.test.ts` cases green.

- [ ] **Step 5: Commit**

```bash
git add src/games/chateau/grid.ts src/games/chateau/test/grid.test.ts
git commit -m "feat(chateau): grid module (per-cell height + color)"
```

---

### Task 3: Corner classification module (pure, TDD)

**Files:**
- Create: `src/games/chateau/corners.ts`
- Test: `src/games/chateau/test/corners.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/games/chateau/test/corners.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGrid, growCell } from "../grid.ts";
import { classifyCorners } from "../corners.ts";

test("an isolated single filled cell has all 4 corners convex", () => {
  const grid = growCell(createGrid(), 5, 5, "rouge");
  const corners = classifyCorners(grid, 5, 5);
  assert.deepEqual(corners, { pp: "convex", pn: "convex", np: "convex", nn: "convex" });
});

test("an L-shape: the cell diagonal to the missing corner is concave there", () => {
  // (0,0), (1,0), (0,1) remplies ; (1,1) vide → le coude en L est au coin pp de (0,0)
  let grid = createGrid();
  grid = growCell(grid, 0, 0, "rouge");
  grid = growCell(grid, 1, 0, "rouge");
  grid = growCell(grid, 0, 1, "rouge");
  assert.equal(classifyCorners(grid, 0, 0).pp, "concave");
});

test("an L-shape: the two edge-adjacent cells see that same vertex as flush, not concave", () => {
  let grid = createGrid();
  grid = growCell(grid, 0, 0, "rouge");
  grid = growCell(grid, 1, 0, "rouge");
  grid = growCell(grid, 0, 1, "rouge");
  assert.equal(classifyCorners(grid, 1, 0).np, "flush");
  assert.equal(classifyCorners(grid, 0, 1).pn, "flush");
});

test("two cells touching only diagonally each get their own independent convex corner", () => {
  let grid = createGrid();
  grid = growCell(grid, 0, 0, "rouge");
  grid = growCell(grid, 1, 1, "bleu");
  assert.equal(classifyCorners(grid, 0, 0).pp, "convex");
  assert.equal(classifyCorners(grid, 1, 1).nn, "convex");
});

test("a cell fully surrounded on all sides and diagonals has every corner flush", () => {
  let grid = createGrid();
  for (let x = 4; x <= 6; x++) {
    for (let z = 4; z <= 6; z++) grid = growCell(grid, x, z, "rouge");
  }
  assert.deepEqual(classifyCorners(grid, 5, 5), { pp: "flush", pn: "flush", np: "flush", nn: "flush" });
});

test("a cell at the grid edge treats out-of-bounds neighbors as empty (convex there)", () => {
  const grid = growCell(createGrid(), 0, 0, "rouge");
  const corners = classifyCorners(grid, 0, 0);
  // (0,0) n'a aucun voisin réel (grille vide autour) : les 4 coins restent convexes,
  // y compris ceux qui regardent hors-grille (x=-1 ou z=-1, traités comme vides).
  assert.deepEqual(corners, { pp: "convex", pn: "convex", np: "convex", nn: "convex" });
});

test("only one side neighbor filled (no diagonal involved) is flush, never concave", () => {
  let grid = createGrid();
  grid = growCell(grid, 0, 0, "rouge");
  grid = growCell(grid, 1, 0, "rouge"); // voisin est rempli, nord vide, diagonale peu importe
  assert.equal(classifyCorners(grid, 0, 0).pp, "flush");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../corners.ts'`.

- [ ] **Step 3: Implement `corners.ts`**

```ts
// src/games/chateau/corners.ts
import { heightAt, type Grid } from "./grid.ts";

export type CornerRounding = "flush" | "convex" | "concave";

export interface CellCorners {
  pp: CornerRounding; // coin (+x, +z) : voisins (cellX+1,cellZ) et (cellX,cellZ+1), diagonale (cellX+1,cellZ+1)
  pn: CornerRounding; // coin (+x, -z) : voisins (cellX+1,cellZ) et (cellX,cellZ-1), diagonale (cellX+1,cellZ-1)
  np: CornerRounding; // coin (-x, +z) : voisins (cellX-1,cellZ) et (cellX,cellZ+1), diagonale (cellX-1,cellZ+1)
  nn: CornerRounding; // coin (-x, -z) : voisins (cellX-1,cellZ) et (cellX,cellZ-1), diagonale (cellX-1,cellZ-1)
}

function isFilled(grid: Grid, cellX: number, cellZ: number): boolean {
  return heightAt(grid, cellX, cellZ) > 0;
}

// Ne regarde que 3 voisines pour classer UN coin : les 2 côtés qui le touchent, et la
// diagonale. Ne dépend jamais de la case elle-même — l'appelant ne classe que des cases
// déjà remplies, mais la fonction n'a pas besoin de le vérifier.
function classifyCorner(grid: Grid, cellX: number, cellZ: number, dx: 1 | -1, dz: 1 | -1): CornerRounding {
  const sideXFilled = isFilled(grid, cellX + dx, cellZ);
  const sideZFilled = isFilled(grid, cellX, cellZ + dz);
  if (!sideXFilled && !sideZFilled) return "convex";
  if (sideXFilled && sideZFilled) {
    const diagFilled = isFilled(grid, cellX + dx, cellZ + dz);
    return diagFilled ? "flush" : "concave";
  }
  return "flush"; // un seul côté rempli : le mur continue tout droit, pas de coin ici
}

export function classifyCorners(grid: Grid, cellX: number, cellZ: number): CellCorners {
  return {
    pp: classifyCorner(grid, cellX, cellZ, 1, 1),
    pn: classifyCorner(grid, cellX, cellZ, 1, -1),
    np: classifyCorner(grid, cellX, cellZ, -1, 1),
    nn: classifyCorner(grid, cellX, cellZ, -1, -1),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all `corners.test.ts` cases green.

- [ ] **Step 5: Commit**

```bash
git add src/games/chateau/corners.ts src/games/chateau/test/corners.test.ts
git commit -m "feat(chateau): corner rounding classification (convex/concave/flush)"
```

---

### Task 4: Color palette catalog (pure, minimal test)

**Files:**
- Create: `src/games/chateau/palette.ts`
- Test: `src/games/chateau/test/palette.test.ts`

This is a static catalog (like the old `materials.ts`/`pieces.ts`) — only the lookup helper gets a test.

- [ ] **Step 1: Write `palette.ts`**

```ts
// src/games/chateau/palette.ts
export interface ColorDef {
  id: string;
  label: string;
  hex: number;
}

export const COLORS: ColorDef[] = [
  { id: "rouge", label: "Rouge", hex: 0xe6533c },
  { id: "orange", label: "Orange", hex: 0xf08c3c },
  { id: "jaune", label: "Jaune", hex: 0xf0c93c },
  { id: "vert", label: "Vert", hex: 0x6fbf6a },
  { id: "bleu", label: "Bleu", hex: 0x4a90d9 },
  { id: "violet", label: "Violet", hex: 0x8a6fd9 },
  { id: "rose", label: "Rose", hex: 0xd97ba0 },
  { id: "brun", label: "Brun", hex: 0xa9754a },
  { id: "gris", label: "Gris", hex: 0x9a9a9a },
];

export const DEFAULT_COLOR_ID = COLORS[0].id;

export function colorById(id: string): ColorDef {
  return COLORS.find((c) => c.id === id) ?? COLORS[0];
}
```

- [ ] **Step 2: Write the test**

```ts
// src/games/chateau/test/palette.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { colorById, COLORS } from "../palette.ts";

test("colorById finds an existing color", () => {
  assert.equal(colorById("bleu")?.label, "Bleu");
});

test("colorById falls back to the first color for an unknown id", () => {
  assert.equal(colorById("inexistant"), COLORS[0]);
});
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: PASS — 2 new tests green.

- [ ] **Step 4: Commit**

```bash
git add src/games/chateau/palette.ts src/games/chateau/test/palette.test.ts
git commit -m "feat(chateau): flat color palette catalog"
```

---

### Task 5: Save/load module, new format (pure, TDD)

**Files:**
- Modify: `src/games/chateau/save.ts` (full rewrite)
- Test: `src/games/chateau/test/save.test.ts` (full rewrite)

- [ ] **Step 1: Write the failing tests**

```ts
// src/games/chateau/test/save.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { GRID_SIZE, MAX_FLOORS } from "../constants.ts";
import { emptyWorld, serializeWorld, deserializeWorld } from "../save.ts";
import { growCell } from "../grid.ts";

test("emptyWorld has a GRID_SIZE x GRID_SIZE grid, all empty", () => {
  const world = emptyWorld();
  assert.equal(world.grid.length, GRID_SIZE);
  assert.equal(world.grid[0].length, GRID_SIZE);
});

test("serialize then deserialize round-trips", () => {
  const world = emptyWorld();
  world.grid = growCell(world.grid, 2, 3, "rouge");
  const restored = deserializeWorld(serializeWorld(world));
  assert.deepEqual(restored, world);
});

test("deserializeWorld falls back to an empty world for null input", () => {
  assert.deepEqual(deserializeWorld(null), emptyWorld());
});

test("deserializeWorld falls back to an empty world for invalid JSON", () => {
  assert.deepEqual(deserializeWorld("{not json"), emptyWorld());
});

test("deserializeWorld falls back to an empty world when the grid size is wrong", () => {
  const bad = { grid: [[{ height: 0, colorId: "" }]] };
  assert.deepEqual(deserializeWorld(JSON.stringify(bad)), emptyWorld());
});

test("deserializeWorld falls back to an empty world when a cell has the wrong shape", () => {
  const grid = emptyWorld().grid;
  const bad = { grid: grid.map((row, z) => (z === 0 ? [{ height: "pas-un-nombre", colorId: "" }, ...row.slice(1)] : row)) };
  assert.deepEqual(deserializeWorld(JSON.stringify(bad)), emptyWorld());
});

test("deserializeWorld falls back to an empty world when a cell's height is out of range", () => {
  // Une sauvegarde trafiquée avec une hauteur infinie/négative/non entière ne doit jamais
  // atteindre buildBuildingColumn (Task 7) : sa boucle `for (floor < height)` tournerait
  // indéfiniment plutôt que de simplement planter — pire que le bug équivalent de la v1.
  const grid = emptyWorld().grid;
  const withHeight = (height: number) => {
    const bad = { grid: grid.map((row, z) => (z === 0 ? [{ height, colorId: "" }, ...row.slice(1)] : row)) };
    return deserializeWorld(JSON.stringify(bad));
  };
  assert.deepEqual(withHeight(Infinity), emptyWorld());
  assert.deepEqual(withHeight(-1), emptyWorld());
  assert.deepEqual(withHeight(2.5), emptyWorld());
  assert.deepEqual(withHeight(MAX_FLOORS + 1), emptyWorld());
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL (existing `save.test.ts` still references the old piece-based format, or the module won't match). If the old `test/save.test.ts` still exists with the old content, delete it first (`git rm src/games/chateau/test/save.test.ts`) then write the new one above — the module under test (`save.ts`) is about to change shape entirely, so the old tests are not "still valid old tests to keep," they test a format that's being deleted.

- [ ] **Step 3: Rewrite `save.ts`**

```ts
// src/games/chateau/save.ts
// note : extensions .ts nécessaires sur les imports relatifs (même raison que grid.ts).
import { GRID_SIZE, MAX_FLOORS } from "./constants.ts";
import { createGrid, type Grid, type Cell } from "./grid.ts";

export interface WorldState {
  grid: Grid;
}

const STORAGE_KEY = "chateau-townscaper-save-v1";

export function emptyWorld(): WorldState {
  return { grid: createGrid() };
}

export function serializeWorld(world: WorldState): string {
  return JSON.stringify(world);
}

function isValidCell(value: unknown): value is Cell {
  if (typeof value !== "object" || value === null) return false;
  const cell = value as Partial<Cell>;
  if (typeof cell.colorId !== "string") return false;
  // Une hauteur non bornée (Infinity, un flottant, un nombre négatif ou juste très grand)
  // passerait un simple `typeof === "number"` tout en faisant boucler indéfiniment
  // buildBuildingColumn (Task 7 : `for (floor = 0; floor < height; floor++)`) au chargement
  // — un blocage du navigateur, pire que le plantage récupérable que ce genre de contrôle
  // évitait déjà côté v1. Trouvé par la revue de code de cette tâche.
  return (
    typeof cell.height === "number" &&
    Number.isInteger(cell.height) &&
    cell.height >= 0 &&
    cell.height <= MAX_FLOORS
  );
}

function isValidWorld(value: unknown): value is WorldState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<WorldState>;
  if (!Array.isArray(candidate.grid) || candidate.grid.length !== GRID_SIZE) return false;
  return candidate.grid.every(
    (row) => Array.isArray(row) && row.length === GRID_SIZE && row.every(isValidCell),
  );
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

Note: unlike the v1 (where a corrupted save could reference an unknown `pieceId` and crash `buildPieceMesh`, requiring a defensive try/catch at load time), this format validates every cell's shape directly (`height` is a bounded, non-negative integer; `colorId` is a string) — there's no equivalent "unknown id that crashes the renderer" risk, since an unrecognized `colorId` just falls back gracefully via `colorById`. `height` specifically needs the numeric bounds check above (not just `typeof === "number"`) — an unbounded value (`Infinity`, negative, non-integer, or just very large) would otherwise reach Task 7's `buildBuildingColumn`, whose `for (floor = 0; floor < height; floor++)` loop would hang the tab rather than crash it. No extra defensive wrapping is needed when this is wired into `main.ts` in Task 8.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all `save.test.ts` cases green.

- [ ] **Step 5: Commit**

```bash
git add src/games/chateau/save.ts src/games/chateau/test/save.test.ts
git commit -m "feat(chateau): rewrite save/load around the new grid-only WorldState"
```

---

### Task 6: Scene rig — bring back OrbitControls, Townscaper-style

**Files:**
- Modify: `src/games/chateau/scene.ts` (full rewrite)

- [ ] **Step 1: Rewrite `scene.ts`**

```ts
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
```

- [ ] **Step 2: Verify the module compiles and the dev server serves it**

`main.ts` still references the old `plotCenter`/fly-controls API at this point and will fail to build — that's expected and fixed in Task 8. For now, just confirm this file alone has no syntax errors:

Run: `npx tsc --noEmit src/games/chateau/scene.ts 2>&1 | grep -v "main.ts\|Cannot find module './fly-controls'\|Cannot find module './terrain\|Cannot find module './pieces\|Cannot find module './placement\|Cannot find module './materials"`
Expected: no output related to `scene.ts` itself (errors about OTHER files that haven't been updated yet, if any leak through the filter, are not this task's concern — this step is just a sanity check on `scene.ts`'s own syntax, full compilation is verified at the end of Task 8).

- [ ] **Step 3: Commit**

```bash
git add src/games/chateau/scene.ts
git commit -m "feat(chateau): bring back OrbitControls, configured Townscaper-style"
```

---

### Task 7: Building geometry (Three.js, not unit-testable — mandatory headless verification)

**Files:**
- Create: `src/games/chateau/building-geometry.ts`

This is the single most important new module — it turns a cell's corner classification into an actual rounded 3D volume with tapering floors and a roof. **Do not skip the verification step**: this task's math was derived by hand (see the note at the top of this plan) and must be checked numerically, the same way Task 9 of the original château plan caught a real rotation bug in `ridgeCap` by computing bounding boxes instead of trusting the formula on sight.

- [ ] **Step 1: Write the shape-building function**

```ts
// src/games/chateau/building-geometry.ts
import * as THREE from "three";
import type { CellCorners, CornerRounding } from "./corners";
import { CORNER_RADIUS, FLOOR_HEIGHT, FLOOR_INSET, MIN_HALF_EXTENT, ROOF_HEIGHT, CELL_SIZE } from "./constants";

interface Quadrant {
  dx: 1 | -1;
  dz: 1 | -1;
  rounding: CornerRounding;
}

// Construit le contour 2D (plan propre au Shape) d'un étage, à partir de sa classification
// de coins, pour une demi-largeur `half` et un rayon `radius` donnés. Parcours dans l'ordre
// pn → pp → np → nn.
//
// IMPORTANT — lire la note "wall-extrusion rotation" en tête de plan avant de modifier
// cette fonction : extrudeFlat() applique rotateX(-PI/2) pour mettre l'extrusion debout,
// et cette rotation envoie l'axe Y du Shape sur -Z monde (vérifié numériquement, pas une
// supposition). `gz = -dz` compense ce renversement pour que "dz" représente bien le
// voisin de grille réel (cellZ+1/cellZ-1) une fois le mur rendu en 3D — sans cette
// compensation, les coins arrondis/chamfrés se retrouveraient du mauvais côté par rapport
// aux vraies cases voisines. `dx` n'a besoin d'aucune compensation (axe X non affecté par
// cette rotation, vérifié aussi).
//
// - "convex" : arc de coin de rectangle arrondi standard (centre en retrait de `radius`
//   dans les deux axes, arc court de 90° qui bombe vers le coin). Construction vérifiée
//   par calcul de tangence.
// - "concave" : chamfre (coupe droite à 45°) via le même point en retrait que le centre de
//   l'arc convexe — un vrai arc lisse tangent aux mêmes bords n'existe pas pour cette
//   configuration (voir la note en tête de plan). Recule bien vers le centre par rapport
//   au coin plein (vérifié : distance à l'origine strictement plus petite).
// - "flush" : angle droit, jusqu'au coin plein, sans traitement.
export function buildFloorShape(corners: CellCorners, half: number, radius: number): THREE.Shape {
  const r = Math.min(radius, half);
  const shape = new THREE.Shape();
  const quadrants: Quadrant[] = [
    { dx: 1, dz: -1, rounding: corners.pn },
    { dx: 1, dz: 1, rounding: corners.pp },
    { dx: -1, dz: 1, rounding: corners.np },
    { dx: -1, dz: -1, rounding: corners.nn },
  ];

  let started = false;
  const moveOrLine = (x: number, y: number): void => {
    if (!started) {
      shape.moveTo(x, y);
      started = true;
    } else {
      shape.lineTo(x, y);
    }
  };

  for (const { dx, dz, rounding } of quadrants) {
    const gz = (-dz) as 1 | -1; // compensation du renversement d'axe — voir la note ci-dessus
    const cornerX = dx * half;
    const cornerY = gz * half;

    if (rounding === "flush") {
      moveOrLine(cornerX, cornerY);
      continue;
    }

    const tangentAX = cornerX - dx * r; // point d'entrée
    const tangentAY = cornerY;
    const tangentBX = cornerX; // point de sortie
    const tangentBY = cornerY - gz * r;

    moveOrLine(tangentAX, tangentAY);

    if (rounding === "convex") {
      const centerX = cornerX - dx * r;
      const centerY = cornerY - gz * r;
      const startAngle = Math.atan2(tangentAY - centerY, tangentAX - centerX);
      const endAngle = Math.atan2(tangentBY - centerY, tangentBX - centerX);
      // Sens vérifié par calcul de tangence (pas deviné) : sens horaire quand dx et gz ont
      // le même signe, sens inverse sinon — dx*gz>0 capture exactement ce cas.
      shape.absarc(centerX, centerY, r, startAngle, endAngle, dx * gz > 0);
    } else {
      shape.lineTo(cornerX - dx * r, cornerY - gz * r);
      shape.lineTo(tangentBX, tangentBY);
    }
  }
  shape.closePath();
  return shape;
}

function extrudeFlat(shape: THREE.Shape, height: number, material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2); // Shape est dans le plan XY ; on le couche pour extruder vers le haut
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// Toit à deux pans + faîtière, technique reprise de piece-geometry.ts v1 (Shape triangulaire
// extrudé) plutôt qu'inventée de zéro. `half` est la demi-largeur du DERNIER étage (déjà
// rétréci). `alongX` détermine l'orientation de la faîtière (décidée par l'appelant, de
// façon déterministe — voir main.ts / le document de conception).
function buildRoof(half: number, alongX: boolean, material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-half, 0);
  shape.lineTo(half, 0);
  shape.lineTo(0, ROOF_HEIGHT);
  shape.closePath();
  const depth = half * 2;
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.translate(0, 0, -half); // centre l'extrusion sur l'axe de la faîtière
  if (!alongX) geometry.rotateY(Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}

export interface BuildingMaterials {
  walls: THREE.Material;
  roof: THREE.Material;
}

// Construit la colonne complète d'une case (tous les étages, rétrécis, + toit), positionnée
// à l'origine locale (0,0) — l'appelant place le groupe résultant au centre monde de la
// case. `height` = nombre d'étages (>=1 — n'appelle jamais cette fonction pour une case
// vide). `cellX`/`cellZ` ne servent qu'à dériver une orientation de toit déterministe.
export function buildBuildingColumn(
  corners: CellCorners,
  height: number,
  cellX: number,
  cellZ: number,
  materials: BuildingMaterials,
): THREE.Group {
  const group = new THREE.Group();
  // Une case vide (height <= 0) ne doit jamais produire de toit flottant sans mur dessous —
  // ce garde-fou rend visible un appel invalide plutôt que de rendre silencieusement un bug.
  if (height <= 0) return group;

  const baseHalf = CELL_SIZE / 2;
  let lastHalf = baseHalf;

  for (let floor = 0; floor < height; floor++) {
    const half = Math.max(MIN_HALF_EXTENT, baseHalf - floor * FLOOR_INSET);
    const shape = buildFloorShape(corners, half, CORNER_RADIUS);
    const mesh = extrudeFlat(shape, FLOOR_HEIGHT, materials.walls);
    mesh.position.y = floor * FLOOR_HEIGHT;
    group.add(mesh);
    lastHalf = half;
  }

  const roof = buildRoof(lastHalf, (cellX + cellZ) % 2 === 0, materials.roof);
  roof.position.y = height * FLOOR_HEIGHT;
  group.add(roof);

  return group;
}

// Libère les géométries de tous les meshes de la colonne (murs + toit). Ne touche jamais aux
// matériaux : ils sont partagés entre colonnes (un par couleur/usage, voir BuildingMaterials)
// et restent la responsabilité de l'appelant — même piège que celui déjà rencontré côté v1
// avec les meshes de pièces/fantômes jamais disposés.
export function disposeBuildingColumn(group: THREE.Group): void {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) child.geometry.dispose();
  });
}
```

**Post-implementation fix (from code-quality review):** the code above already includes two fixes applied after the initial implementation — a `height <= 0` guard in `buildBuildingColumn` (prevents a floating roof with no walls if ever called on an empty cell) and an exported `disposeBuildingColumn` helper (so the Task 8 `main.ts` rewrite has a ready-made, correct way to dispose geometry when a building is rebuilt/removed, avoiding this codebase's recurring GPU-leak failure mode from v1). Task 8's implementer should call `disposeBuildingColumn` on any building group before removing/replacing it.

- [ ] **Step 2: Mandatory headless verification — reproduce the check, don't skip it**

I ran this exact script (bundled with esbuild, plain `node`) against the real `buildFloorShape` code above before finalizing this plan, so the numbers below are actual confirmed output, not predictions. Reproduce it against the files you just created — this step exists to catch a *transcription* error (a typo while copying the code above), not to re-derive the math from scratch.

```bash
npx esbuild src/games/chateau/building-geometry.ts --bundle --platform=node --format=esm --external:three --outfile=verify-geo-tmp-bundle.mjs
```

```js
// verify-geo-tmp-runner.mjs
import * as THREE from "three";
import { buildFloorShape } from "./verify-geo-tmp-bundle.mjs";

const half = 0.5;
const radius = 0.2;

function boundsOf(shape) {
  const points = shape.getPoints(32);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}
function maxDistFromOrigin(shape) {
  return Math.max(...shape.getPoints(64).map((p) => Math.hypot(p.x, p.y)));
}

// 1. Coin totalement convexe (case isolée) : reste dans les bornes de la case, jamais
//    au-delà du coin plein théorique (half*sqrt2).
const allConvex = buildFloorShape({ pp: "convex", pn: "convex", np: "convex", nn: "convex" }, half, radius);
console.log("1. all-convex bounds:", boundsOf(allConvex));
console.log("   all-convex maxDist (<=", (half * Math.SQRT2).toFixed(4), "):", maxDistFromOrigin(allConvex).toFixed(4));

// 2. Coin concave : DOIT reculer vers l'origine par rapport au coin plein équivalent — mesuré
//    UNIQUEMENT dans le quadrant du coin pp (x>=0, y<=0 en coordonnées du Shape), sinon les
//    3 autres coins "flush" (qui restent tous à half*sqrt2 dans les deux cas) dominent le
//    maxDist global et masquent complètement l'effet qu'on veut isoler ici.
function maxDistInPPQuadrant(shape) {
  return Math.max(...shape.getPoints(64).filter((p) => p.x >= 0 && p.y <= 0).map((p) => Math.hypot(p.x, p.y)));
}
const withConcave = buildFloorShape({ pp: "concave", pn: "flush", np: "flush", nn: "flush" }, half, radius);
const flushOnly = buildFloorShape({ pp: "flush", pn: "flush", np: "flush", nn: "flush" }, half, radius);
console.log(
  "2. concave maxDist (pp quadrant only):",
  maxDistInPPQuadrant(withConcave).toFixed(4),
  "vs flush:",
  maxDistInPPQuadrant(flushOnly).toFixed(4),
  "-> concave < flush?",
  maxDistInPPQuadrant(withConcave) < maxDistInPPQuadrant(flushOnly),
);

// 3. Pas d'auto-intersection grossière : aucun point non-fini.
let anyNonFinite = false;
for (const p of allConvex.getPoints(64)) {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) anyNonFinite = true;
}
console.log("3. any non-finite point?", anyNonFinite);

// 5. Alignement monde après rotation (le point le plus important à vérifier, vu la note
//    "wall-extrusion rotation" en tête de plan) : un coin "pp" (dx=+1,dz=+1) concave doit
//    reculer dans le monde réel côté (+X,+Z) — pas côté (+X,-Z), qui serait le signe d'un
//    renversement d'axe mal compensé.
function minAxisDistInOctant(mesh, xSign, zSign) {
  const pos = mesh.geometry.attributes.position;
  let min = Infinity;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    if (Math.sign(x) !== xSign || Math.sign(z) !== zSign) continue;
    const dist = Math.hypot(x, z);
    if (dist < min) min = dist;
  }
  return min;
}

const ppConcaveShape = buildFloorShape({ pp: "concave", pn: "convex", np: "convex", nn: "convex" }, half, radius);
const ppConcaveGeo = new THREE.ExtrudeGeometry(ppConcaveShape, { depth: 1, bevelEnabled: false });
ppConcaveGeo.rotateX(-Math.PI / 2);
const ppConcaveMesh = new THREE.Mesh(ppConcaveGeo);

const baselineGeo = new THREE.ExtrudeGeometry(allConvex, { depth: 1, bevelEnabled: false });
baselineGeo.rotateX(-Math.PI / 2);
const baselineMesh = new THREE.Mesh(baselineGeo);

const ppQuadrantConcave = minAxisDistInOctant(ppConcaveMesh, 1, 1); // (+X,+Z) : doit avoir reculé
const ppQuadrantBaseline = minAxisDistInOctant(baselineMesh, 1, 1);
const pnQuadrantConcave = minAxisDistInOctant(ppConcaveMesh, 1, -1); // (+X,-Z) : resté convexe, ne doit presque pas bouger
const pnQuadrantBaseline = minAxisDistInOctant(baselineMesh, 1, -1);

console.log("5. (+X,+Z) concave:", ppQuadrantConcave.toFixed(4), "vs baseline:", ppQuadrantBaseline.toFixed(4), "-> receded?", ppQuadrantConcave < ppQuadrantBaseline - 0.01);
console.log("   (+X,-Z) concave:", pnQuadrantConcave.toFixed(4), "vs baseline:", pnQuadrantBaseline.toFixed(4), "-> nearly equal?", Math.abs(pnQuadrantConcave - pnQuadrantBaseline) < 0.01);

// 6. Sens des normales des murs. Une extrusion stocke des sommets séparés pour les
//    capuchons et pour chaque face latérale, même à la même position 3D — on liste TOUTES
//    les normales à ce sommet et on retient celle dont la composante x est significative
//    (la face latérale +X), pas celle dominée par y (le capuchon).
function findAllNormalsNear(mesh, targetX, targetY, targetZ, tolerance) {
  mesh.geometry.computeVertexNormals();
  const pos = mesh.geometry.attributes.position;
  const norm = mesh.geometry.attributes.normal;
  const results = [];
  for (let i = 0; i < pos.count; i++) {
    const dx = pos.getX(i) - targetX;
    const dy = pos.getY(i) - targetY;
    const dz = pos.getZ(i) - targetZ;
    if (Math.hypot(dx, dy, dz) < tolerance) results.push({ x: norm.getX(i), y: norm.getY(i), z: norm.getZ(i) });
  }
  return results;
}

const flushShape = buildFloorShape({ pp: "flush", pn: "flush", np: "flush", nn: "flush" }, half, radius);
const flushGeo = new THREE.ExtrudeGeometry(flushShape, { depth: 1, bevelEnabled: false });
flushGeo.rotateX(-Math.PI / 2);
const flushMesh = new THREE.Mesh(flushGeo);
const allNormalsAtCorner = findAllNormalsNear(flushMesh, half, 0, -half, 0.05);
const wallNormal = allNormalsAtCorner.find((n) => Math.abs(n.x) > 0.5);
console.log("6. wall-face normal at that corner (expect x near +1):", wallNormal);
```

```bash
node verify-geo-tmp-runner.mjs
```

Expected output (this is the actual output from the real run, not a prediction — your numbers should match closely):

```
1. all-convex bounds: { minX: -0.5, maxX: 0.5, minY: -0.5, maxY: 0.5 }
   all-convex maxDist (<= 0.7071 ): 0.6243
2. concave maxDist (pp quadrant only): 0.5831 vs flush: 0.7071 -> concave < flush? true
3. any non-finite point? false
5. (+X,+Z) concave: 0.4243 vs baseline: 0.5831 -> receded? true
   (+X,-Z) concave: 0.5831 vs baseline: 0.5831 -> nearly equal? true
6. wall-face normal at that corner (expect x near +1): { x: 1, y: 0, z: -0 }
```

If your numbers diverge meaningfully from these (not just floating-point noise in the last digit), you introduced a transcription error somewhere in `buildFloorShape` relative to the code in Step 1 — compare line by line rather than trying to re-derive the geometry from scratch, since the math itself is already confirmed correct.

- [ ] **Step 3: Delete the throwaway verification files**

```bash
rm -f verify-geo-tmp-bundle.mjs verify-geo-tmp-runner.mjs
git status --short
```

Expected: only `src/games/chateau/building-geometry.ts` shows as a new file — no leftover verification scripts.

- [ ] **Step 4: Commit**

```bash
git add src/games/chateau/building-geometry.ts
git commit -m "feat(chateau): procedural building geometry (rounded corners, tapering, roof)"
```

---

### Task 8: Interaction — paint to grow, remove, colors, camera, save/load

**Files:**
- Modify: `src/games/chateau/main.ts` (full rewrite)

- [ ] **Step 1: Rewrite `main.ts`**

```ts
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
    // side: DoubleSide est une sécurité gratuite (voir la note "wall-extrusion rotation" en
    // tête de plan) — le sens des normales a été vérifié correct par calcul, mais ce
    // réglage ne coûte rien et évite qu'un mur ne devienne invisible si jamais un futur
    // changement de géométrie inversait le sens d'enroulement sans qu'on s'en rende compte.
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
// sur une case déjà construite lui ajouterait des étages en rafale (voir le document de
// conception : le glissement ne doit remplir que les cases VIDES traversées).
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
// de raycaster — piège réel rencontré pendant la revue de qualité de cette tâche : la
// version initiale avec deux écouteurs séparés omettait updatePointer() côté construction,
// laissant le premier clic d'un clic/glissement raycaster contre une position obsolète).
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
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS — all pure-logic tests (`grid`, `corners`, `palette`, `save`) green, nothing else broken.

- [ ] **Step 3: Run a production build**

Run: `npm run build`
Expected: succeeds with zero errors. This is the first point where `main.ts`, `scene.ts`, and `building-geometry.ts` are all compiled together — if any of the earlier tasks left a mismatched import or signature, this is where it surfaces.

- [ ] **Step 4: Verify serving via dev server**

Run: `npm run dev` in the background, then:

```bash
curl -s -o /dev/null -w "chateau page: %{http_code}\n" http://localhost:5173/games/chateau/
curl -s -o /dev/null -w "main.ts: %{http_code}\n" http://localhost:5173/src/games/chateau/main.ts
curl -s -o /dev/null -w "building-geometry.ts: %{http_code}\n" http://localhost:5173/src/games/chateau/building-geometry.ts
```

Expected: all `200`. Stop the dev server afterward — don't leave it running.

- [ ] **Step 5: Commit**

```bash
git add src/games/chateau/main.ts
git commit -m "feat(chateau): paint-to-grow interaction, colors, camera, save/load wiring"
```

---

### Task 9: Manual end-to-end verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full automated test suite**

Run: `npm test`
Expected: PASS — every test from Tasks 2–5 (`grid`, `corners`, `palette`, `save`) green.

- [ ] **Step 2: Run a production build**

Run: `npm run build`
Expected: succeeds, `dist/games/chateau/` present, no TypeScript or bundling errors.

- [ ] **Step 3: Full manual playthrough**

Run: `npm run dev`, open `/games/chateau/`, and check:
- Clicking an empty cell grows a 1-floor building; clicking the same cell again adds a floor.
- Dragging with the left button held paints a run of empty cells to 1 floor each, without repeatedly adding floors to cells already built earlier in the same drag.
- Placing an L-shaped or U-shaped cluster of cells shows a visibly different (chamfered) corner where cells meet at an inner elbow, versus a normal rounded (convex) corner on the outside.
- Two buildings that only touch diagonally (no shared edge) each show their own independent rounded corner, not a merged shape.
- Alt+click removes one floor from a cell; repeating it down to 0 floors returns that cell to water.
- Taller buildings visibly taper (each floor slightly narrower than the one below).
- Every building has a two-sided roof with a ridge; neighboring cells' roofs alternate orientation.
- Camera: right-click-drag rotates the view around a fixed target; the scroll wheel zooms; middle-click-drag pans the target across the ground; left-click never rotates or pans the camera, only builds.
- Reload the page (F5): the town persists exactly as left. Click "Recommencer", reload again: the grid is back to empty water.

Expected: every point behaves as described, no console errors at any point.

- [ ] **Step 4: Final review of the diff**

Run: `git log --oneline` (from the château-related commits onward) and `git status --short`
Expected: a clean, reviewable stack of commits, working tree clean, ready for `superpowers:finishing-a-development-branch`.

---

## Self-review notes

- **Spec coverage:** every row of the coverage map maps to a task; no spec requirement is left unimplemented.
- **Placeholders:** none — every step has real code, real commands, or an explicit itemized manual-verification checklist.
- **Type/name consistency checked:** `Cell`/`Grid` (Task 2) are imported unchanged by `corners.ts` (Task 3), `save.ts` (Task 5), and `main.ts` (Task 8). `CellCorners`/`CornerRounding` (Task 3) are imported unchanged by `building-geometry.ts` (Task 7). `ColorDef`/`colorById` (Task 4) are used consistently in `main.ts`. `WorldState` (Task 5) matches exactly what `main.ts` reads/writes (`{ grid }`, nothing else).
- **Known, flagged simplification:** concave corners are chamfered, not smoothly arced (see the note at the top of this plan) — this was derived, not guessed, and is called out explicitly so it isn't mistaken for an oversight during review.
- **Verified against the actual installed library, not memory:** the `OrbitControls.mouseButtons.LEFT = -1` disable trick (Task 6) was confirmed correct by reading `node_modules/three/examples/jsm/controls/OrbitControls.js` directly, not assumed.
- **Verified by running real code, not just hand derivation:** the corner-rounding geometry in Task 7 (`buildFloorShape`) went through several rounds of hand-derived math that turned out wrong on the first two attempts (a sign error in the arc's sweep direction, and a missed axis-flip introduced by `extrudeFlat`'s `rotateX`). Both were caught and fixed by actually building the real file, bundling it, and running the numerical checks in Task 7's Step 2 — not by re-reasoning harder. The plan's final numbers are real output from that run.
