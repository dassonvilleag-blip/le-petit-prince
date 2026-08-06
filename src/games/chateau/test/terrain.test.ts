import { test } from "node:test";
import assert from "node:assert/strict";
import { PLOT_SIZE, MIN_TERRAIN_LEVEL, MAX_TERRAIN_LEVEL, DEFAULT_TERRAIN_LEVEL } from "../constants.ts";
import { createHeightmap, heightAt, raiseVertex, lowerVertex, terrainLevelAtCell } from "../terrain.ts";

test("createHeightmap returns a flat grid of the right size, at the default (dry) level", () => {
  const grid = createHeightmap();
  assert.equal(grid.length, PLOT_SIZE + 1);
  for (const row of grid) {
    assert.equal(row.length, PLOT_SIZE + 1);
    assert.ok(row.every((h) => h === DEFAULT_TERRAIN_LEVEL));
  }
});

test("raiseVertex increases the target vertex only", () => {
  const grid = raiseVertex(createHeightmap(), 3, 4);
  assert.equal(heightAt(grid, 3, 4), DEFAULT_TERRAIN_LEVEL + 1);
  assert.equal(heightAt(grid, 3, 5), DEFAULT_TERRAIN_LEVEL);
  assert.equal(heightAt(grid, 4, 4), DEFAULT_TERRAIN_LEVEL);
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
  // les 4 coins de la cellule (0,0) valent DEFAULT_TERRAIN_LEVEL+1 chacun → moyenne DEFAULT_TERRAIN_LEVEL+1
  assert.equal(terrainLevelAtCell(grid, 0, 0), DEFAULT_TERRAIN_LEVEL + 1);
});

test("terrainLevelAtCell rounds a mixed slope to the nearest level", () => {
  let grid = createHeightmap();
  grid = raiseVertex(grid, 0, 0); // un seul coin à DEFAULT_TERRAIN_LEVEL+1, les 3 autres à DEFAULT_TERRAIN_LEVEL → arrondi DEFAULT_TERRAIN_LEVEL
  assert.equal(terrainLevelAtCell(grid, 0, 0), DEFAULT_TERRAIN_LEVEL);
});
