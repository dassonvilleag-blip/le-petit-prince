import { test } from "node:test";
import assert from "node:assert/strict";
import { ROUND_COMMENTS, pickRoundComment, CLOSING_COMMENTS, pickClosingComment } from "../comments.ts";

test("pickRoundComment for a perfect score uses the top tier", () => {
  const comment = pickRoundComment(1000);
  assert.ok(ROUND_COMMENTS[0].lines.includes(comment));
});

test("pickRoundComment for a zero score uses the bottom tier", () => {
  const comment = pickRoundComment(0);
  const bottomTier = ROUND_COMMENTS[ROUND_COMMENTS.length - 1];
  assert.ok(bottomTier.lines.includes(comment));
});

test("pickClosingComment for a perfect total uses the top tier", () => {
  const comment = pickClosingComment(10000);
  assert.ok(CLOSING_COMMENTS[0].lines.includes(comment));
});

test("pickClosingComment for a zero total uses the bottom tier", () => {
  const comment = pickClosingComment(0);
  const bottomTier = CLOSING_COMMENTS[CLOSING_COMMENTS.length - 1];
  assert.ok(bottomTier.lines.includes(comment));
});
