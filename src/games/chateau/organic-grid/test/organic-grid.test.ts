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
