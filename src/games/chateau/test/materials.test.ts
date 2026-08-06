import { test } from "node:test";
import assert from "node:assert/strict";
import { materialById, MATERIALS } from "../materials.ts";

test("materialById finds an existing material", () => {
  assert.equal(materialById("ardoise")?.label, "Ardoise");
});

test("materialById falls back to the first material for an unknown id", () => {
  assert.equal(materialById("inexistant"), MATERIALS[0]);
});
