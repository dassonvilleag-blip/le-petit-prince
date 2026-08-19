import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveDuel } from "../engine.ts";

test("resolveDuel : victoire nette si la stat du joueur domine largement", () => {
  assert.equal(resolveDuel(80, 20, () => 0.5), "victoire");
});

test("resolveDuel : blessure grave si l'adversaire domine largement", () => {
  assert.equal(resolveDuel(20, 80, () => 0.5), "blessure-grave");
});

test("resolveDuel : à la limite haute (roll pile 15), c'est une défaite légère, pas une victoire", () => {
  // playerForce - opponentPower + (rng*30-15) = 15 + (0.5*30-15) = 15 + 0 = 15 → pas > 15
  assert.equal(resolveDuel(15, 0, () => 0.5), "defaite-legere");
});

test("resolveDuel : à la limite basse (roll pile -10), c'est une blessure grave, pas une défaite légère", () => {
  // 0 - 10 + (0.5*30-15) = -10 + 0 = -10 → pas > -10
  assert.equal(resolveDuel(0, 10, () => 0.5), "blessure-grave");
});

test("resolveDuel : l'aléa peut faire pencher un combat sinon perdu", () => {
  // 10 - 10 + (1*30-15) = 0 + 15 = 15 → pas > 15, donc defaite-legere (pas victoire)
  assert.equal(resolveDuel(10, 10, () => 1), "defaite-legere");
  // 10 - 10 + (0*30-15) = 0 - 15 = -15 → blessure-grave
  assert.equal(resolveDuel(10, 10, () => 0), "blessure-grave");
});
