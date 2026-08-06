// src/games/chateau/test/placement.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { PLOT_SIZE, MAX_STACK_HEIGHT, DEFAULT_TERRAIN_LEVEL } from "../constants.ts";
import { createHeightmap, raiseVertex } from "../terrain.ts";
import { resolvePlacement, removeTopPiece, type PlacedPiece } from "../placement.ts";

function piece(cellX: number, cellZ: number, level: number): PlacedPiece {
  return { id: `${cellX}-${cellZ}-${level}`, pieceId: "mur-plein", cellX, cellZ, level, rotation: 0, materialId: "pierre-claire" };
}

test("first piece on flat terrain rests at ground level", () => {
  const result = resolvePlacement(2, 3, createHeightmap(), []);
  assert.equal(result.valid, true);
  assert.equal(result.level, DEFAULT_TERRAIN_LEVEL);
});

test("a second piece on the same cell stacks on top", () => {
  const existing = [piece(2, 3, DEFAULT_TERRAIN_LEVEL)];
  const result = resolvePlacement(2, 3, createHeightmap(), existing);
  assert.equal(result.valid, true);
  assert.equal(result.level, DEFAULT_TERRAIN_LEVEL + 1);
});

test("placement respects terrain height on a raised cell", () => {
  let grid = createHeightmap();
  grid = raiseVertex(grid, 0, 0);
  grid = raiseVertex(grid, 1, 0);
  grid = raiseVertex(grid, 0, 1);
  grid = raiseVertex(grid, 1, 1);
  const result = resolvePlacement(0, 0, grid, []);
  assert.equal(result.valid, true);
  assert.equal(result.level, DEFAULT_TERRAIN_LEVEL + 1);
});

test("placement outside the plot is invalid", () => {
  assert.equal(resolvePlacement(-1, 0, createHeightmap(), []).valid, false);
  assert.equal(resolvePlacement(PLOT_SIZE, 0, createHeightmap(), []).valid, false);
});

test("placement is invalid once the stack is full", () => {
  const existing = Array.from({ length: MAX_STACK_HEIGHT }, (_, i) => piece(5, 5, DEFAULT_TERRAIN_LEVEL + i));
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
