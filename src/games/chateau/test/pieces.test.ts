import { test } from "node:test";
import assert from "node:assert/strict";
import { pieceById } from "../pieces.ts";

test("pieceById finds an existing piece", () => {
  assert.equal(pieceById("tour-ronde")?.label, "Tour ronde");
});

test("pieceById returns undefined for an unknown id", () => {
  assert.equal(pieceById("donjon-inexistant"), undefined);
});
