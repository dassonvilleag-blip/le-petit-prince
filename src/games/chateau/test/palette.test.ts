import { test } from "node:test";
import assert from "node:assert/strict";
import { colorById, COLORS } from "../palette.ts";

test("colorById finds an existing color", () => {
  assert.equal(colorById("bleu")?.label, "Bleu");
});

test("colorById falls back to the first color for an unknown id", () => {
  assert.equal(colorById("inexistant"), COLORS[0]);
});
