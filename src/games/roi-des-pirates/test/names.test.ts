import { test } from "node:test";
import assert from "node:assert/strict";
import { pickRandomName } from "../names.ts";

test("pickRandomName : rng=0 renvoie toujours le premier nom du pool masculin", () => {
  assert.equal(pickRandomName("homme", () => 0), "Gaspard");
});

test("pickRandomName : rng=0 renvoie toujours le premier nom du pool féminin", () => {
  assert.equal(pickRandomName("femme", () => 0), "Isaline");
});

test("pickRandomName : rng proche de 1 renvoie le dernier nom du pool", () => {
  assert.equal(pickRandomName("homme", () => 0.999999), "Kolt");
});

test("pickRandomName : ne renvoie jamais une chaîne vide, quel que soit le genre", () => {
  assert.ok(pickRandomName("homme").length > 0);
  assert.ok(pickRandomName("femme").length > 0);
});
