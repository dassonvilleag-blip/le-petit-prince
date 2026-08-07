import { test } from "node:test";
import assert from "node:assert/strict";
import { poissonDiskSample } from "../poisson.ts";

test("same seed produces the same points", () => {
  const a = poissonDiskSample(200, 200, 20, 7);
  const b = poissonDiskSample(200, 200, 20, 7);
  assert.deepEqual(a, b);
});

test("every pair of points respects the minimum distance", () => {
  const points = poissonDiskSample(200, 200, 20, 7);
  assert.ok(points.length > 10, "sanity check: sampling should produce a reasonable number of points");
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dist = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
      assert.ok(dist >= 20 - 1e-9, `points ${i} and ${j} are ${dist} apart, below the minimum`);
    }
  }
});

test("all points stay within the requested bounds", () => {
  const points = poissonDiskSample(200, 200, 20, 7);
  for (const p of points) {
    assert.ok(p.x >= 0 && p.x < 200, `x=${p.x} out of bounds`);
    assert.ok(p.y >= 0 && p.y < 200, `y=${p.y} out of bounds`);
  }
});
