# Château — grille organique (chantier 1/5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone, self-contained module that generates an irregular, organic
quadrilateral grid (points, cells, vertex/cell adjacency) — the geometric foundation the
next chantiers (vertex classification, module library, Wave Function Collapse) will build
on. This plan does **not** touch the existing square-grid château game (`grid.ts`,
`main.ts`, etc.) — it coexists as new files until a later chantier switches the game over.

**Architecture:** A five-stage pure-data pipeline (Poisson-disk sampling → Delaunay
triangulation → triangle-to-quad merging → subdivision → spring relaxation), each stage
its own small testable file, composed by one orchestrator function
(`buildOrganicGrid`). Output feeds a minimal Canvas2D wireframe debug page for visual
verification — no Three.js, no game logic yet.

**Tech Stack:** TypeScript, `delaunator` (new dependency — confirmed it ships its own
`index.d.ts`, depends only on `robust-predicates`, a well-known robust-geometry library —
no `@types/` package needed), Node's built-in test runner (matches the rest of the
project).

---

## Spec

`docs/superpowers/specs/2026-08-07-chateau-grille-organique-design.md`

## File structure

```
src/games/chateau/organic-grid/
  random.ts           seeded PRNG (mulberry32)
  poisson.ts           Point type + Poisson-disk sampling
  triangulate.ts        delaunator wrapper
  quads.ts              triangle→quad merging + validity predicates
  subdivide.ts           shared-vertex-pool subdivision
  relax.ts               spring relaxation
  mesh.ts                 cell/vertex graph + adjacency
  organic-grid.ts         orchestrator: buildOrganicGrid()
  debug-main.ts            Canvas2D wireframe renderer (dev-only entry point)
  test/
    random.test.ts
    poisson.test.ts
    triangulate.test.ts
    quads.test.ts
    subdivide.test.ts
    relax.test.ts
    mesh.test.ts
    organic-grid.test.ts
games/chateau/grille-debug.html   dev-only debug page, NOT added to vite.config.ts build
                                   entries (temporary verification tool, not a shipped page)
```

---

### Task 1: Add the `delaunator` dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

Run: `npm install delaunator@5.1.0`

Expected: `package.json` gains `"delaunator": "^5.1.0"` under `"dependencies"`, and
`"robust-predicates"` appears in `package-lock.json` as a transitive dependency. No
`@types/delaunator` needed — the package ships its own `index.d.ts` (`"types":
"index.d.ts"` in its `package.json`, already confirmed present).

- [ ] **Step 2: Verify the build still works with the new dependency present**

Run: `npm run build`
Expected: succeeds, same as before (the new dependency isn't imported by anything yet, so
this just confirms `npm install` didn't break anything).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(chateau): add delaunator for organic grid triangulation"
```

---

### Task 2: Seeded PRNG

**Files:**
- Create: `src/games/chateau/organic-grid/random.ts`
- Test: `src/games/chateau/organic-grid/test/random.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/games/chateau/organic-grid/test/random.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mulberry32 } from "../random.ts";

test("mulberry32 with the same seed produces the same sequence", () => {
  const a = mulberry32(1234);
  const b = mulberry32(1234);
  const seqA = [a(), a(), a()];
  const seqB = [b(), b(), b()];
  assert.deepEqual(seqA, seqB);
});

test("mulberry32 produces values in [0, 1)", () => {
  const rng = mulberry32(42);
  for (let i = 0; i < 200; i++) {
    const v = rng();
    assert.ok(v >= 0 && v < 1, `value ${v} out of range`);
  }
});

test("different seeds produce different sequences", () => {
  const a = mulberry32(1);
  const b = mulberry32(2);
  assert.notEqual(a(), b());
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types --test "src/games/chateau/organic-grid/test/random.test.ts"`
Expected: FAIL — `random.ts` doesn't exist yet.

- [ ] **Step 3: Implement**

```ts
// src/games/chateau/organic-grid/random.ts
// Générateur pseudo-aléatoire seedé (mulberry32) — la grille organique doit être
// reproductible (même graine → même grille) pour être testable, ce que Math.random() ne
// permet pas.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --experimental-strip-types --test "src/games/chateau/organic-grid/test/random.test.ts"`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/games/chateau/organic-grid/random.ts src/games/chateau/organic-grid/test/random.test.ts
git commit -m "feat(chateau): seeded PRNG for the organic grid pipeline"
```

---

### Task 3: Poisson-disk sampling

**Files:**
- Create: `src/games/chateau/organic-grid/poisson.ts`
- Test: `src/games/chateau/organic-grid/test/poisson.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/games/chateau/organic-grid/test/poisson.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { poissonDiskSample } from "../poisson.ts";

test("same seed produces the same points", () => {
  const a = poissonDiskSample(200, 200, 20, 7);
  const b = poissonDiskSample(200, 200, 20, 7);
  assert.deepEqual(a, b);
});

test("every pair of points respects the minimum distance", () => {
  const points = poissonDiskSample(200, 200, 20, 7);
  assert.ok(points.length > 10, "sanity check: sampling should produce a reasonable number of points");
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dist = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
      assert.ok(dist >= 20 - 1e-9, `points ${i} and ${j} are ${dist} apart, below the minimum`);
    }
  }
});

test("all points stay within the requested bounds", () => {
  const points = poissonDiskSample(200, 200, 20, 7);
  for (const p of points) {
    assert.ok(p.x >= 0 && p.x < 200, `x=${p.x} out of bounds`);
    assert.ok(p.y >= 0 && p.y < 200, `y=${p.y} out of bounds`);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types --test "src/games/chateau/organic-grid/test/poisson.test.ts"`
Expected: FAIL — `poisson.ts` doesn't exist yet.

- [ ] **Step 3: Implement**

```ts
// src/games/chateau/organic-grid/poisson.ts
import { mulberry32 } from "./random.ts";

export interface Point {
  x: number;
  y: number;
}

// Échantillonnage de Poisson-disk (algorithme de Bridson) : produit des points répartis
// aléatoirement mais jamais plus proches que `minDistance` les uns des autres — la base de
// la grille organique (voir docs/superpowers/specs/2026-08-07-chateau-grille-organique-design.md).
export function poissonDiskSample(
  width: number,
  height: number,
  minDistance: number,
  seed: number,
  maxAttempts = 30,
): Point[] {
  const rng = mulberry32(seed);
  const cellSize = minDistance / Math.SQRT2;
  const gridWidth = Math.max(1, Math.ceil(width / cellSize));
  const gridHeight = Math.max(1, Math.ceil(height / cellSize));
  const grid: (Point | null)[] = new Array(gridWidth * gridHeight).fill(null);
  const points: Point[] = [];
  const active: Point[] = [];

  const gridIndexOf = (p: Point): number => {
    const gx = Math.min(gridWidth - 1, Math.floor(p.x / cellSize));
    const gy = Math.min(gridHeight - 1, Math.floor(p.y / cellSize));
    return gy * gridWidth + gx;
  };

  const farEnough = (candidate: Point): boolean => {
    const gx = Math.floor(candidate.x / cellSize);
    const gy = Math.floor(candidate.y / cellSize);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = gx + dx;
        const ny = gy + dy;
        if (nx < 0 || ny < 0 || nx >= gridWidth || ny >= gridHeight) continue;
        const neighbor = grid[ny * gridWidth + nx];
        if (!neighbor) continue;
        const ddx = neighbor.x - candidate.x;
        const ddy = neighbor.y - candidate.y;
        if (ddx * ddx + ddy * ddy < minDistance * minDistance) return false;
      }
    }
    return true;
  };

  const first: Point = { x: rng() * width, y: rng() * height };
  points.push(first);
  active.push(first);
  grid[gridIndexOf(first)] = first;

  while (active.length > 0) {
    const activeIndex = Math.floor(rng() * active.length);
    const origin = active[activeIndex];
    let placed = false;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const angle = rng() * Math.PI * 2;
      const radius = minDistance * (1 + rng());
      const candidate: Point = {
        x: origin.x + Math.cos(angle) * radius,
        y: origin.y + Math.sin(angle) * radius,
      };
      if (candidate.x < 0 || candidate.y < 0 || candidate.x >= width || candidate.y >= height) continue;
      if (!farEnough(candidate)) continue;

      points.push(candidate);
      active.push(candidate);
      grid[gridIndexOf(candidate)] = candidate;
      placed = true;
      break;
    }

    if (!placed) active.splice(activeIndex, 1);
  }

  return points;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --experimental-strip-types --test "src/games/chateau/organic-grid/test/poisson.test.ts"`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/games/chateau/organic-grid/poisson.ts src/games/chateau/organic-grid/test/poisson.test.ts
git commit -m "feat(chateau): Poisson-disk point sampling for the organic grid"
```

---

### Task 4: Delaunay triangulation wrapper

**Files:**
- Create: `src/games/chateau/organic-grid/triangulate.ts`
- Test: `src/games/chateau/organic-grid/test/triangulate.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/games/chateau/organic-grid/test/triangulate.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { triangulate } from "../triangulate.ts";
import type { Point } from "../poisson.ts";

test("triangulating a square produces 2 triangles with exactly one shared internal edge", () => {
  const points: Point[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
  const { triangles, halfedges } = triangulate(points);
  assert.equal(triangles.length, 6); // 2 triangles × 3 vertex indices
  assert.equal(halfedges.length, 6);
  const internalEdges = Array.from(halfedges).filter((h) => h !== -1);
  assert.equal(internalEdges.length, 2); // les deux moitiés de la diagonale partagée
});

test("every triangle vertex index is a valid index into the input points", () => {
  const points: Point[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
    { x: 0.5, y: 0.5 },
  ];
  const { triangles } = triangulate(points);
  for (const index of triangles) {
    assert.ok(index >= 0 && index < points.length, `index ${index} out of range`);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types --test "src/games/chateau/organic-grid/test/triangulate.test.ts"`
Expected: FAIL — `triangulate.ts` doesn't exist yet.

- [ ] **Step 3: Implement**

```ts
// src/games/chateau/organic-grid/triangulate.ts
import Delaunator from "delaunator";
import type { Point } from "./poisson.ts";

export interface Triangulation {
  // Uint32Array de longueur (nb de triangles × 3) : chaque groupe de 3 est un triangle,
  // dans le sens anti-horaire (garanti par delaunator).
  triangles: Uint32Array;
  // Int32Array de même longueur : halfedges[i] est l'index du demi-bord jumeau dans le
  // triangle voisin qui partage le bord de triangles[i], ou -1 si ce bord est sur
  // l'enveloppe convexe (aucun voisin).
  halfedges: Int32Array;
}

export function triangulate(points: Point[]): Triangulation {
  const delaunay = Delaunator.from(
    points,
    (p) => p.x,
    (p) => p.y,
  );
  return { triangles: delaunay.triangles, halfedges: delaunay.halfedges };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --experimental-strip-types --test "src/games/chateau/organic-grid/test/triangulate.test.ts"`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/games/chateau/organic-grid/triangulate.ts src/games/chateau/organic-grid/test/triangulate.test.ts
git commit -m "feat(chateau): Delaunay triangulation wrapper around delaunator"
```

---

### Task 5: Triangle-to-quad merging

**Files:**
- Create: `src/games/chateau/organic-grid/quads.ts`
- Test: `src/games/chateau/organic-grid/test/quads.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/games/chateau/organic-grid/test/quads.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeTrianglesToQuads, isConvexQuad, anglesWithinRange } from "../quads.ts";
import { triangulate } from "../triangulate.ts";
import type { Point } from "../poisson.ts";

test("merging the two triangles of a square produces one quad using all four vertices", () => {
  const points: Point[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
  const { triangles, halfedges } = triangulate(points);
  const polygons = mergeTrianglesToQuads(points, triangles, halfedges);
  assert.equal(polygons.length, 1);
  assert.equal(polygons[0].vertices.length, 4);
  assert.deepEqual([...polygons[0].vertices].sort((a, b) => a - b), [0, 1, 2, 3]);
});

test("isConvexQuad accepts a square traversed in order", () => {
  const points: Point[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
  assert.equal(isConvexQuad([0, 1, 2, 3], points), true);
});

test("isConvexQuad rejects a self-crossing (bowtie) vertex order", () => {
  const points: Point[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
  assert.equal(isConvexQuad([0, 2, 1, 3], points), false);
});

test("anglesWithinRange rejects a very thin sliver quad", () => {
  const points: Point[] = [
    { x: 0, y: 0 },
    { x: 10, y: 0.01 },
    { x: 20, y: 0 },
    { x: 10, y: -0.01 },
  ];
  assert.equal(anglesWithinRange([0, 1, 2, 3], points), false);
});

test("anglesWithinRange accepts a square (all angles at 90°)", () => {
  const points: Point[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
  assert.equal(anglesWithinRange([0, 1, 2, 3], points), true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types --test "src/games/chateau/organic-grid/test/quads.test.ts"`
Expected: FAIL — `quads.ts` doesn't exist yet.

- [ ] **Step 3: Implement**

```ts
// src/games/chateau/organic-grid/quads.ts
import type { Point } from "./poisson.ts";

export interface Polygon {
  vertices: number[]; // indices dans le tableau de points, dans l'ordre du contour
}

const MIN_ANGLE = 0.2 * Math.PI;
const MAX_ANGLE = 0.9 * Math.PI;

function nextEdge(e: number): number {
  return e % 3 === 2 ? e - 2 : e + 1;
}

function prevEdge(e: number): number {
  return e % 3 === 0 ? e + 2 : e - 1;
}

function triangleVertices(t: number, triangles: Uint32Array): number[] {
  return [triangles[t * 3], triangles[t * 3 + 1], triangles[t * 3 + 2]];
}

// Fusionne les deux triangles qui partagent le bord `edge` (dans le triangle A) / `opposite`
// (dans le triangle B, le demi-bord jumeau) en un quadrilatère. Ordre dérivé du sens de
// parcours réel des deux triangles (pas deviné) : le contour de A est a0→a1→apexA→a0, celui
// de B est a1→a0→apexB→a1 (le demi-bord jumeau parcourt le bord partagé en sens inverse,
// convention documentée de delaunator) — en retirant le bord interne partagé, le contour
// combiné est apexA→a0→apexB→a1.
function mergeQuad(triangles: Uint32Array, edge: number, opposite: number): number[] {
  const a0 = triangles[edge];
  const a1 = triangles[nextEdge(edge)];
  const apexA = triangles[prevEdge(edge)];
  const apexB = triangles[prevEdge(opposite)];
  return [apexA, a0, apexB, a1];
}

function turnCross(p0: Point, p1: Point, p2: Point): number {
  const ux = p1.x - p0.x;
  const uy = p1.y - p0.y;
  const vx = p2.x - p1.x;
  const vy = p2.y - p1.y;
  return ux * vy - uy * vx;
}

export function isConvexQuad(quad: number[], points: Point[]): boolean {
  const n = quad.length;
  let sign = 0;
  for (let i = 0; i < n; i++) {
    const p0 = points[quad[i]];
    const p1 = points[quad[(i + 1) % n]];
    const p2 = points[quad[(i + 2) % n]];
    const cross = turnCross(p0, p1, p2);
    if (Math.abs(cross) < 1e-9) continue; // presque colinéaire : toléré, pas décisif
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
}

function interiorAngle(prev: Point, corner: Point, next: Point): number {
  const v1x = prev.x - corner.x;
  const v1y = prev.y - corner.y;
  const v2x = next.x - corner.x;
  const v2y = next.y - corner.y;
  const dot = v1x * v2x + v1y * v2y;
  const det = v1x * v2y - v1y * v2x;
  return Math.atan2(Math.abs(det), dot); // dans [0, π]
}

export function anglesWithinRange(quad: number[], points: Point[]): boolean {
  const n = quad.length;
  for (let i = 0; i < n; i++) {
    const prev = points[quad[(i - 1 + n) % n]];
    const corner = points[quad[i]];
    const next = points[quad[(i + 1) % n]];
    const angle = interiorAngle(prev, corner, next);
    if (angle < MIN_ANGLE || angle > MAX_ANGLE) return false;
  }
  return true;
}

// Fusionne les triangles adjacents deux par deux quand le quadrilatère résultant est
// convexe et a des angles raisonnables ; les triangles qui n'ont aucune fusion valide
// restent des triangles (voir docs/superpowers/specs/2026-08-07-chateau-grille-organique-design.md).
// Parcours déterministe (ordre des triangles, puis ordre de leurs 3 bords) : premier
// voisin valide trouvé, pas de recherche du "meilleur" appariement — suffisant pour
// reproduire l'esprit de la technique documentée.
export function mergeTrianglesToQuads(points: Point[], triangles: Uint32Array, halfedges: Int32Array): Polygon[] {
  const numTriangles = triangles.length / 3;
  const used = new Array(numTriangles).fill(false);
  const polygons: Polygon[] = [];

  for (let t = 0; t < numTriangles; t++) {
    if (used[t]) continue;
    let merged = false;

    for (let corner = 0; corner < 3; corner++) {
      const edge = t * 3 + corner;
      const opposite = halfedges[edge];
      if (opposite === -1) continue;
      const neighbor = Math.floor(opposite / 3);
      if (used[neighbor]) continue;

      const quad = mergeQuad(triangles, edge, opposite);
      if (!isConvexQuad(quad, points)) continue;
      if (!anglesWithinRange(quad, points)) continue;

      polygons.push({ vertices: quad });
      used[t] = true;
      used[neighbor] = true;
      merged = true;
      break;
    }

    if (!merged) {
      polygons.push({ vertices: triangleVertices(t, triangles) });
      used[t] = true;
    }
  }

  return polygons;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --experimental-strip-types --test "src/games/chateau/organic-grid/test/quads.test.ts"`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/games/chateau/organic-grid/quads.ts src/games/chateau/organic-grid/test/quads.test.ts
git commit -m "feat(chateau): merge adjacent Delaunay triangles into quads"
```

---

### Task 6: Subdivision with a shared vertex pool

**Files:**
- Create: `src/games/chateau/organic-grid/subdivide.ts`
- Test: `src/games/chateau/organic-grid/test/subdivide.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/games/chateau/organic-grid/test/subdivide.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { VertexPool, subdivide } from "../subdivide.ts";
import type { Point } from "../poisson.ts";
import type { Polygon } from "../quads.ts";

test("subdividing a single quad produces 4 quads, each including the centroid", () => {
  const points: Point[] = [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 2 },
    { x: 0, y: 2 },
  ];
  const pool = new VertexPool(points);
  const result = subdivide([{ vertices: [0, 1, 2, 3] }], pool);

  assert.equal(result.length, 4);
  for (const poly of result) assert.equal(poly.vertices.length, 4);

  const centroidIndex = result[0].vertices[2]; // [corner, edgeMid, centroid, prevEdgeMid]
  for (const poly of result) assert.ok(poly.vertices.includes(centroidIndex));
});

test("subdividing a triangle produces 3 quads", () => {
  const points: Point[] = [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 1, y: 2 },
  ];
  const pool = new VertexPool(points);
  const result = subdivide([{ vertices: [0, 1, 2] }], pool);
  assert.equal(result.length, 3);
  for (const poly of result) assert.equal(poly.vertices.length, 4);
});

test("two quads sharing an edge reuse the same midpoint vertex instead of duplicating it", () => {
  const points: Point[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
    { x: 2, y: 0 },
    { x: 2, y: 1 },
  ];
  const pool = new VertexPool(points);
  const quadA: Polygon = { vertices: [0, 1, 2, 3] };
  const quadB: Polygon = { vertices: [1, 4, 5, 2] }; // partage l'arête (1,2) avec quadA

  subdivide([quadA, quadB], pool);
  const countAfterSubdivide = pool.points.length;
  const midShared = pool.midpoint(1, 2); // doit retrouver le point déjà créé
  assert.equal(pool.points.length, countAfterSubdivide);
  assert.ok(midShared < countAfterSubdivide);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types --test "src/games/chateau/organic-grid/test/subdivide.test.ts"`
Expected: FAIL — `subdivide.ts` doesn't exist yet.

- [ ] **Step 3: Implement**

```ts
// src/games/chateau/organic-grid/subdivide.ts
import type { Point } from "./poisson.ts";
import type { Polygon } from "./quads.ts";

// Garde un point milieu d'arête unique par paire de sommets, partagé entre les polygones
// voisins qui touchent cette arête — sans ça, la subdivision dupliquerait le point à
// chaque polygone et la grille ne serait plus connectée (chaque cellule aurait ses propres
// sommets, sans voisinage partagé).
export class VertexPool {
  points: Point[];
  private midpointCache = new Map<string, number>();

  constructor(points: Point[]) {
    this.points = points;
  }

  private key(a: number, b: number): string {
    return a < b ? `${a}:${b}` : `${b}:${a}`;
  }

  midpoint(a: number, b: number): number {
    const key = this.key(a, b);
    const cached = this.midpointCache.get(key);
    if (cached !== undefined) return cached;
    const pa = this.points[a];
    const pb = this.points[b];
    const index = this.points.length;
    this.points.push({ x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 });
    this.midpointCache.set(key, index);
    return index;
  }

  centroid(vertices: number[]): number {
    let x = 0;
    let y = 0;
    for (const v of vertices) {
      x += this.points[v].x;
      y += this.points[v].y;
    }
    const index = this.points.length;
    this.points.push({ x: x / vertices.length, y: y / vertices.length });
    return index; // le centroïde n'est jamais partagé entre polygones, toujours un nouveau point
  }
}

// Subdivise chaque polygone (triangle ou quadrilatère) en autant de quadrilatères qu'il a
// de sommets, via ses milieux d'arête et son centroïde — après un passage, tous les
// polygones sont des quadrilatères, y compris ceux qui étaient des triangles.
export function subdivide(polygons: Polygon[], pool: VertexPool): Polygon[] {
  const result: Polygon[] = [];
  for (const poly of polygons) {
    const v = poly.vertices;
    const n = v.length;
    const mids = v.map((_, i) => pool.midpoint(v[i], v[(i + 1) % n]));
    const center = pool.centroid(v);
    for (let i = 0; i < n; i++) {
      const prevMid = mids[(i - 1 + n) % n];
      result.push({ vertices: [v[i], mids[i], center, prevMid] });
    }
  }
  return result;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --experimental-strip-types --test "src/games/chateau/organic-grid/test/subdivide.test.ts"`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/games/chateau/organic-grid/subdivide.ts src/games/chateau/organic-grid/test/subdivide.test.ts
git commit -m "feat(chateau): subdivide polygons into quads with a shared vertex pool"
```

---

### Task 7: Spring relaxation

**Files:**
- Create: `src/games/chateau/organic-grid/relax.ts`
- Test: `src/games/chateau/organic-grid/test/relax.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/games/chateau/organic-grid/test/relax.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { relax } from "../relax.ts";
import type { Point } from "../poisson.ts";
import type { Polygon } from "../quads.ts";

test("relax pulls a stretched edge length toward the target length", () => {
  const points: Point[] = [
    { x: 0, y: 0 },
    { x: 3, y: 0 },
    { x: 3, y: 0.1 },
    { x: 0, y: 0.1 },
  ];
  const polygons: Polygon[] = [{ vertices: [0, 1, 2, 3] }];
  const edgeLength = () => Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
  const before = edgeLength();

  relax(points, polygons, { iterations: 50, targetEdgeLength: 1, strength: 0.2 });

  const after = edgeLength();
  assert.ok(Math.abs(after - 1) < Math.abs(before - 1), `expected ${after} closer to 1 than ${before}`);
});

test("relax leaves an already-uniform square close to unchanged", () => {
  const points: Point[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
  const original = points.map((p) => ({ ...p }));
  const polygons: Polygon[] = [{ vertices: [0, 1, 2, 3] }];

  relax(points, polygons, { iterations: 20, targetEdgeLength: 1, strength: 0.2 });

  for (let i = 0; i < points.length; i++) {
    assert.ok(Math.hypot(points[i].x - original[i].x, points[i].y - original[i].y) < 0.05);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types --test "src/games/chateau/organic-grid/test/relax.test.ts"`
Expected: FAIL — `relax.ts` doesn't exist yet.

- [ ] **Step 3: Implement**

```ts
// src/games/chateau/organic-grid/relax.ts
import type { Point } from "./poisson.ts";
import type { Polygon } from "./quads.ts";

export interface RelaxOptions {
  iterations: number;
  targetEdgeLength: number;
  strength: number; // 0..1, fraction de la correction appliquée par itération
}

// Simplification assumée par rapport au document de conception : au lieu de dériver la
// formule fermée du "carré optimal" par arctan (technique de référence, risquée à
// implémenter sans pouvoir la vérifier numériquement pas à pas), cette relaxation utilise
// un lissage par ressorts — chaque sommet est tiré vers ses voisins pour que la longueur
// de chaque arête se rapproche de `targetEdgeLength`. Même effet recherché (rapprocher la
// grille d'un aspect régulier sans la rendre parfaitement carrée), technique standard et
// vérifiable. Un sommet en bordure du monde a moins de voisins : la force qu'il reçoit est
// simplement moins contrainte (normalisée par son propre nombre de voisins, pas par un
// nombre fixe), ce qui suffit à éviter une divergence — pas besoin de traitement spécial
// des bords pour ce chantier.
export function relax(points: Point[], polygons: Polygon[], options: RelaxOptions): void {
  const neighbors: Set<number>[] = points.map(() => new Set<number>());
  for (const poly of polygons) {
    const v = poly.vertices;
    for (let i = 0; i < v.length; i++) {
      const a = v[i];
      const b = v[(i + 1) % v.length];
      neighbors[a].add(b);
      neighbors[b].add(a);
    }
  }

  for (let iter = 0; iter < options.iterations; iter++) {
    const forces = points.map(() => ({ x: 0, y: 0 }));

    for (let i = 0; i < points.length; i++) {
      const neigh = neighbors[i];
      if (neigh.size === 0) continue;
      const p = points[i];
      for (const j of neigh) {
        const q = points[j];
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const dist = Math.hypot(dx, dy) || 1e-6;
        const correction = (dist - options.targetEdgeLength) / dist;
        forces[i].x += dx * correction;
        forces[i].y += dy * correction;
      }
      forces[i].x /= neigh.size;
      forces[i].y /= neigh.size;
    }

    for (let i = 0; i < points.length; i++) {
      points[i].x += forces[i].x * options.strength;
      points[i].y += forces[i].y * options.strength;
    }
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --experimental-strip-types --test "src/games/chateau/organic-grid/test/relax.test.ts"`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/games/chateau/organic-grid/relax.ts src/games/chateau/organic-grid/test/relax.test.ts
git commit -m "feat(chateau): spring relaxation toward uniform edge length"
```

---

### Task 8: Cell/vertex graph and adjacency

**Files:**
- Create: `src/games/chateau/organic-grid/mesh.ts`
- Test: `src/games/chateau/organic-grid/test/mesh.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/games/chateau/organic-grid/test/mesh.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCellGraph } from "../mesh.ts";
import type { Point } from "../poisson.ts";
import type { Polygon } from "../quads.ts";

test("two quads sharing an edge become mutual neighbors at the right edge index", () => {
  const points: Point[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
    { x: 2, y: 0 },
    { x: 2, y: 1 },
  ];
  const polygons: Polygon[] = [
    { vertices: [0, 1, 2, 3] }, // cell 0
    { vertices: [1, 4, 5, 2] }, // cell 1, partage l'arête (1,2) avec cell 0
  ];

  const grid = buildCellGraph(points, polygons);

  assert.equal(grid.cells.length, 2);
  assert.equal(grid.cells[0].neighborCellIds[1], 1); // edge 1 de cell0 = (1,2)
  assert.equal(grid.cells[1].neighborCellIds[3], 0); // edge 3 de cell1 = (2,1), même arête
  assert.equal(grid.cells[0].neighborCellIds[0], -1); // edge 0 = (0,1), bord, aucune voisine
});

test("every vertex lists the cells that touch it", () => {
  const points: Point[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
  const polygons: Polygon[] = [{ vertices: [0, 1, 2, 3] }];

  const grid = buildCellGraph(points, polygons);

  for (const v of grid.vertices) assert.deepEqual(v.incidentCellIds, [0]);
});

test("cells start unbuilt (height 0, no color)", () => {
  const points: Point[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
  const grid = buildCellGraph(points, [{ vertices: [0, 1, 2, 3] }]);
  assert.equal(grid.cells[0].height, 0);
  assert.equal(grid.cells[0].colorId, null);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types --test "src/games/chateau/organic-grid/test/mesh.test.ts"`
Expected: FAIL — `mesh.ts` doesn't exist yet.

- [ ] **Step 3: Implement**

```ts
// src/games/chateau/organic-grid/mesh.ts
import type { Point } from "./poisson.ts";
import type { Polygon } from "./quads.ts";

export interface OrganicCell {
  id: number;
  vertexIndices: number[]; // indices dans OrganicGrid.vertices, dans l'ordre du contour
  // même longueur/ordre que vertexIndices : neighborCellIds[i] est la cellule voisine qui
  // partage l'arête (vertexIndices[i] -> vertexIndices[i+1]), ou -1 si c'est un bord.
  neighborCellIds: number[];
  height: number; // repris de l'actuel Cell (grid.ts) — 0 = vide, ≥1 = construit
  colorId: string | null;
}

export interface OrganicVertex extends Point {
  incidentCellIds: number[]; // nécessaire pour la classification par sommet du chantier 2
}

export interface OrganicGrid {
  cells: OrganicCell[];
  vertices: OrganicVertex[];
}

function edgeKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function buildCellGraph(points: Point[], polygons: Polygon[]): OrganicGrid {
  const vertices: OrganicVertex[] = points.map((p) => ({ x: p.x, y: p.y, incidentCellIds: [] }));
  const cells: OrganicCell[] = polygons.map((poly, id) => ({
    id,
    vertexIndices: poly.vertices,
    neighborCellIds: new Array(poly.vertices.length).fill(-1),
    height: 0,
    colorId: null,
  }));

  for (const cell of cells) {
    for (const v of cell.vertexIndices) vertices[v].incidentCellIds.push(cell.id);
  }

  const edgeOwner = new Map<string, { cellId: number; edgeIndex: number }>();
  for (const cell of cells) {
    const n = cell.vertexIndices.length;
    for (let i = 0; i < n; i++) {
      const a = cell.vertexIndices[i];
      const b = cell.vertexIndices[(i + 1) % n];
      const key = edgeKey(a, b);
      const existing = edgeOwner.get(key);
      if (existing) {
        cell.neighborCellIds[i] = existing.cellId;
        cells[existing.cellId].neighborCellIds[existing.edgeIndex] = cell.id;
      } else {
        edgeOwner.set(key, { cellId: cell.id, edgeIndex: i });
      }
    }
  }

  return { cells, vertices };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --experimental-strip-types --test "src/games/chateau/organic-grid/test/mesh.test.ts"`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/games/chateau/organic-grid/mesh.ts src/games/chateau/organic-grid/test/mesh.test.ts
git commit -m "feat(chateau): cell/vertex adjacency graph for the organic grid"
```

---

### Task 9: Orchestrator (`buildOrganicGrid`)

**Files:**
- Create: `src/games/chateau/organic-grid/organic-grid.ts`
- Test: `src/games/chateau/organic-grid/test/organic-grid.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/games/chateau/organic-grid/test/organic-grid.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildOrganicGrid } from "../organic-grid.ts";

const OPTIONS = { width: 300, height: 300, cellSpacing: 40, subdivisions: 1, relaxIterations: 10, seed: 99 };

test("buildOrganicGrid is deterministic for the same options", () => {
  const a = buildOrganicGrid(OPTIONS);
  const b = buildOrganicGrid(OPTIONS);
  assert.equal(a.cells.length, b.cells.length);
  assert.deepEqual(
    a.cells.map((c) => c.vertexIndices),
    b.cells.map((c) => c.vertexIndices),
  );
});

test("buildOrganicGrid produces a non-empty, structurally valid grid", () => {
  const grid = buildOrganicGrid(OPTIONS);
  assert.ok(grid.cells.length > 0);
  for (const cell of grid.cells) {
    assert.ok(cell.vertexIndices.length >= 3, "every cell must be at least a triangle");
    for (const vIndex of cell.vertexIndices) {
      assert.ok(vIndex >= 0 && vIndex < grid.vertices.length, `vertex index ${vIndex} out of range`);
    }
  }
});

test("after at least one subdivision pass, every cell is a quad", () => {
  const grid = buildOrganicGrid(OPTIONS);
  for (const cell of grid.cells) assert.equal(cell.vertexIndices.length, 4);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types --test "src/games/chateau/organic-grid/test/organic-grid.test.ts"`
Expected: FAIL — `organic-grid.ts` doesn't exist yet.

- [ ] **Step 3: Implement**

```ts
// src/games/chateau/organic-grid/organic-grid.ts
import { poissonDiskSample, type Point } from "./poisson.ts";
import { triangulate } from "./triangulate.ts";
import { mergeTrianglesToQuads, type Polygon } from "./quads.ts";
import { VertexPool, subdivide } from "./subdivide.ts";
import { relax } from "./relax.ts";
import { buildCellGraph, type OrganicGrid } from "./mesh.ts";

export interface OrganicGridOptions {
  width: number;
  height: number;
  cellSpacing: number; // distance minimale entre points avant subdivision
  subdivisions: number; // nombre de passages de subdivision (contrôle la densité finale)
  relaxIterations: number;
  seed: number;
}

export function buildOrganicGrid(options: OrganicGridOptions): OrganicGrid {
  const samples = poissonDiskSample(options.width, options.height, options.cellSpacing, options.seed);
  const points: Point[] = samples.map((p) => ({ ...p }));

  const { triangles, halfedges } = triangulate(points);
  let polygons: Polygon[] = mergeTrianglesToQuads(points, triangles, halfedges);

  const pool = new VertexPool(points);
  for (let i = 0; i < options.subdivisions; i++) {
    polygons = subdivide(polygons, pool);
  }

  const targetEdgeLength = options.cellSpacing / Math.pow(2, options.subdivisions);
  relax(pool.points, polygons, { iterations: options.relaxIterations, targetEdgeLength, strength: 0.3 });

  return buildCellGraph(pool.points, polygons);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --experimental-strip-types --test "src/games/chateau/organic-grid/test/organic-grid.test.ts"`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/games/chateau/organic-grid/organic-grid.ts src/games/chateau/organic-grid/test/organic-grid.test.ts
git commit -m "feat(chateau): buildOrganicGrid orchestrator tying the pipeline together"
```

---

### Task 10: Debug visualization page

**Files:**
- Create: `games/chateau/grille-debug.html`
- Create: `src/games/chateau/organic-grid/debug-main.ts`

This page is a **dev-only verification tool** — deliberately not added to
`vite.config.ts`'s `build.rollupOptions.input`, so it never ships in the production build.
It's reached only via `npm run dev`.

- [ ] **Step 1: Create the debug page**

```html
<!-- games/chateau/grille-debug.html -->
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Château — debug grille organique</title>
    <style>
      html, body { margin: 0; height: 100%; background: #14181c; }
      canvas { display: block; margin: 24px auto; background: #1c2228; border-radius: 8px; }
    </style>
  </head>
  <body>
    <canvas id="debug-canvas" width="700" height="700"></canvas>
    <script type="module" src="/src/games/chateau/organic-grid/debug-main.ts"></script>
  </body>
</html>
```

- [ ] **Step 2: Create the renderer**

```ts
// src/games/chateau/organic-grid/debug-main.ts
import { buildOrganicGrid } from "./organic-grid.ts";

const canvas = document.getElementById("debug-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

const grid = buildOrganicGrid({
  width: 600,
  height: 600,
  cellSpacing: 60,
  subdivisions: 1,
  relaxIterations: 20,
  seed: 42,
});

ctx.translate(50, 50);
ctx.strokeStyle = "#7fd4c1";
ctx.lineWidth = 1.5;

for (const cell of grid.cells) {
  ctx.beginPath();
  cell.vertexIndices.forEach((vIndex, i) => {
    const v = grid.vertices[vIndex];
    if (i === 0) ctx.moveTo(v.x, v.y);
    else ctx.lineTo(v.x, v.y);
  });
  ctx.closePath();
  ctx.stroke();
}

export {};
```

- [ ] **Step 3: Verify it renders**

Run: `npm run dev` (in the background if needed), then:

```bash
curl -s -o /dev/null -w "grille-debug page: %{http_code}\n" http://localhost:5173/games/chateau/grille-debug.html
curl -s -o /dev/null -w "debug-main.ts: %{http_code}\n" http://localhost:5173/src/games/chateau/organic-grid/debug-main.ts
```

Expected: both `200`. Then open `http://localhost:5173/games/chateau/grille-debug.html` in
a browser and confirm a wireframe of irregular-but-grid-like quadrilaterals is visible
(compare by eye to the organic quad-grid look of the townscaper.org reference screenshots
already saved under `docs/superpowers/specs/assets/`). Stop the dev server afterward if it
was started just for this check.

- [ ] **Step 4: Commit**

```bash
git add games/chateau/grille-debug.html src/games/chateau/organic-grid/debug-main.ts
git commit -m "feat(chateau): dev-only wireframe debug page for the organic grid"
```

---

### Task 11: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full automated test suite**

Run: `npm test`
Expected: PASS — every test from Tasks 2–9 (24 new tests across `random`, `poisson`,
`triangulate`, `quads`, `subdivide`, `relax`, `mesh`, `organic-grid`), plus the pre-existing
71 tests for the untouched square-grid game (`grid`, `corners`, `palette`, `save`, and the
other games) — all green, nothing broken by coexistence.

- [ ] **Step 2: Run a production build**

Run: `npm run build`
Expected: succeeds. `games/chateau/grille-debug.html` does **not** appear in `dist/` (it
was deliberately left out of `vite.config.ts`), while `dist/games/chateau/index.html` (the
real, still-untouched square-grid game) is present as before.

- [ ] **Step 3: Manual visual check of the debug page**

Run: `npm run dev`, open `http://localhost:5173/games/chateau/grille-debug.html`.
Expected, checked by eye against the townscaper.org reference screenshots
(`docs/superpowers/specs/assets/2026-08-07-chateau-ref-*.png`):
- The cells are irregular quadrilaterals, not a perfect square grid.
- They're also not chaotic — roughly similar sizes, no wildly stretched or self-crossing
  shapes.
- No console errors.

Stop the dev server afterward — don't leave it running.

- [ ] **Step 4: Confirm the existing château game still works, untouched**

Open `http://localhost:5173/games/chateau/` (the real game, unrelated files). Build a
couple of cells. Expected: works exactly as before this plan — this chantier added new
files only, it did not modify `grid.ts`, `corners.ts`, `main.ts`, `scene.ts`, or
`building-geometry.ts`.

- [ ] **Step 5: Final review of the diff**

Run: `git log --oneline` (from Task 1's commit onward) and `git status --short`
Expected: a clean, reviewable stack of ~9 commits, working tree clean, ready for the next
chantier (brique 2 : classification par sommet) to build on top of `OrganicGrid`.

---

## Self-review notes

- **Spec coverage:** every stage in `2026-08-07-chateau-grille-organique-design.md`
  (échantillonnage, triangulation, fusion en quads, subdivision, relaxation, structure de
  données, vérification visuelle) maps to a task. The spec's "hors scope" list (vertex
  classification, 3D modules, WFC, real building geometry) is respected — nothing in this
  plan touches those.
- **Flagged deviation from the spec, explained where it happens:** Task 7's relaxation uses
  spring/edge-length equalization instead of the spec's "quad squaring by arctan" — called
  out explicitly in that task's code comment, not silently substituted.
- **New dependency:** `delaunator` (Task 1) — the spec calls this out as breaking the
  project's "zero runtime dependency beyond `three`" pattern; verified (not assumed) that
  it ships its own types and has one small, well-known transitive dependency
  (`robust-predicates`).
- **Type/name consistency checked:** `Point` (Task 3) is imported unchanged by
  `triangulate.ts`, `quads.ts`, `subdivide.ts`, `relax.ts`, `mesh.ts`. `Polygon` (Task 5) is
  imported unchanged by `subdivide.ts`, `relax.ts`, `mesh.ts`, `organic-grid.ts`.
  `OrganicGrid`/`OrganicCell`/`OrganicVertex` (Task 8) match exactly what `organic-grid.ts`
  (Task 9) returns and what `debug-main.ts` (Task 10) reads.
- **No placeholders:** every step has real, complete code or an exact command with an
  expected result — no "add appropriate handling" left for the implementer to invent.
- **Coexistence verified in the plan, not just claimed:** Task 11 Step 4 explicitly re-opens
  the untouched square-grid game to confirm nothing broke, since this whole chantier's
  premise is additive-only.
