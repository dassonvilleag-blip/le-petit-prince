import { test } from "node:test";
import assert from "node:assert/strict";
import { relax } from "../relax.ts";
import type { Point } from "../poisson.ts";
import type { Polygon } from "../quads.ts";

test("relax pulls a stretched edge length toward the target length", () => {
  const points: Point[] = [
    { x: 0, y: 0 },
    { x: 3, y: 0 },
    { x: 3, y: 0.1 },
    { x: 0, y: 0.1 },
  ];
  const polygons: Polygon[] = [{ vertices: [0, 1, 2, 3] }];
  const edgeLength = () => Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
  const before = edgeLength();

  relax(points, polygons, { iterations: 50, targetEdgeLength: 1, strength: 0.2 });

  const after = edgeLength();
  assert.ok(Math.abs(after - 1) < Math.abs(before - 1), `expected ${after} closer to 1 than ${before}`);
});

test("relax leaves an already-uniform square close to unchanged", () => {
  const points: Point[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
  const original = points.map((p) => ({ ...p }));
  const polygons: Polygon[] = [{ vertices: [0, 1, 2, 3] }];

  relax(points, polygons, { iterations: 20, targetEdgeLength: 1, strength: 0.2 });

  for (let i = 0; i < points.length; i++) {
    assert.ok(Math.hypot(points[i].x - original[i].x, points[i].y - original[i].y) < 0.05);
  }
});
