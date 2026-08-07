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
