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
