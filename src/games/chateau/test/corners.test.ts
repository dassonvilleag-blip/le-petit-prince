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
