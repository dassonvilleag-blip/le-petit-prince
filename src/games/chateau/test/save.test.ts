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
