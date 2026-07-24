import { test } from "node:test";
import assert from "node:assert/strict";
import { computeRoundScore } from "../scoring.ts";

test("an exact guess scores 1000", () => {
  assert.equal(computeRoundScore(100, 100), 1000);
});

test("a guess exactly double the price scores 0", () => {
  assert.equal(computeRoundScore(200, 100), 0);
});

test("a guess wildly above the price clamps to 0, never negative", () => {
  assert.equal(computeRoundScore(1000, 100), 0);
});

test("a guess 10% off the price scores 900", () => {
  assert.equal(computeRoundScore(110, 100), 900);
});

test("undershooting and overshooting by the same amount score the same", () => {
  assert.equal(computeRoundScore(90, 100), computeRoundScore(110, 100));
});

test("a price of 0 never divides by zero", () => {
  assert.equal(computeRoundScore(50, 0), 0);
});
