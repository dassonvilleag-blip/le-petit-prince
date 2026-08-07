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
