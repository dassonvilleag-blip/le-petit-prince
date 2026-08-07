import { test } from "node:test";
import assert from "node:assert/strict";
import { mulberry32 } from "../random.ts";

test("mulberry32 with the same seed produces the same sequence", () => {
  const a = mulberry32(1234);
  const b = mulberry32(1234);
  const seqA = [a(), a(), a()];
  const seqB = [b(), b(), b()];
  assert.deepEqual(seqA, seqB);
});

test("mulberry32 produces values in [0, 1)", () => {
  const rng = mulberry32(42);
  for (let i = 0; i < 200; i++) {
    const v = rng();
    assert.ok(v >= 0 && v < 1, `value ${v} out of range`);
  }
});

test("different seeds produce different sequences", () => {
  const a = mulberry32(1);
  const b = mulberry32(2);
  assert.notEqual(a(), b());
});
