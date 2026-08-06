import { test } from "node:test";
import assert from "node:assert/strict";
import { GRID_SIZE } from "../constants.ts";
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
