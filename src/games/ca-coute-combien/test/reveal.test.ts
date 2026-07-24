import { test } from "node:test";
import assert from "node:assert/strict";
import { easeOutCubic, interpolate, visibleCharacterCount } from "../reveal.ts";

test("easeOutCubic returns 0 at t=0", () => {
  assert.equal(easeOutCubic(0), 0);
});

test("easeOutCubic returns 1 at t=1", () => {
  assert.equal(easeOutCubic(1), 1);
});

test("easeOutCubic clamps values above 1", () => {
  assert.equal(easeOutCubic(1.5), 1);
});

test("easeOutCubic clamps values below 0", () => {
  assert.equal(easeOutCubic(-0.2), 0);
});

test("easeOutCubic is not linear (front-loaded easing)", () => {
  // ease-out should be further along than linear at the midpoint
  assert.ok(easeOutCubic(0.5) > 0.5);
});

test("interpolate at progress 0 returns the start value", () => {
  assert.equal(interpolate(0, 100, 0), 0);
});

test("interpolate at progress 1 returns the end value", () => {
  assert.equal(interpolate(0, 100, 1), 100);
});

test("interpolate at progress 0.5 is the linear midpoint", () => {
  assert.equal(interpolate(0, 100, 0.5), 50);
});

test("interpolate handles a decreasing range", () => {
  assert.equal(interpolate(10, 5, 0.5), 7.5);
});

test("interpolate works for large values (e.g. an 800 million euro item)", () => {
  assert.equal(interpolate(0, 800_000_000, 1), 800_000_000);
});

test("visibleCharacterCount shows nothing at elapsed=0", () => {
  assert.equal(visibleCharacterCount("bonjour", 0, 30), 0);
});

test("visibleCharacterCount shows characters proportional to elapsed time", () => {
  assert.equal(visibleCharacterCount("bonjour", 89, 30), 2);
});

test("visibleCharacterCount clamps to the text length", () => {
  assert.equal(visibleCharacterCount("bonjour", 10_000, 30), 7);
});

test("visibleCharacterCount shows the full text immediately when msPerChar is 0", () => {
  assert.equal(visibleCharacterCount("bonjour", 50, 0), 7);
});

test("visibleCharacterCount handles an empty string", () => {
  assert.equal(visibleCharacterCount("", 500, 30), 0);
});
