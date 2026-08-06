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
