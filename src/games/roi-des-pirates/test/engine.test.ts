import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveDuel, filterChoices, resolveText, describeInjuries } from "../engine.ts";
import type { Choice } from "../types.ts";

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

test("filterChoices : cache un choix dont requiresFlags n'est pas satisfait", () => {
  const choices: Choice[] = [
    { text: "A", effects: {}, next: "x", requiresFlags: ["epeiste-recrute"] },
    { text: "B", effects: {}, next: "y" },
  ];
  const result = filterChoices(choices, new Set());
  assert.deepEqual(result.map((c) => c.text), ["B"]);
});

test("filterChoices : montre le choix requiresFlags quand le drapeau est posé", () => {
  const choices: Choice[] = [
    { text: "A", effects: {}, next: "x", requiresFlags: ["epeiste-recrute"] },
  ];
  const result = filterChoices(choices, new Set(["epeiste-recrute"]));
  assert.deepEqual(result.map((c) => c.text), ["A"]);
});

test("filterChoices : cache un choix dont forbidsFlags est posé", () => {
  const choices: Choice[] = [
    { text: "Recruter", effects: {}, next: "x", forbidsFlags: ["epeiste-recrute"] },
    { text: "Continuer", effects: {}, next: "y" },
  ];
  const result = filterChoices(choices, new Set(["epeiste-recrute"]));
  assert.deepEqual(result.map((c) => c.text), ["Continuer"]);
});

test("resolveText : renvoie une chaîne fixe telle quelle", () => {
  assert.equal(resolveText("Bonjour", new Set()), "Bonjour");
});

test("resolveText : appelle la fonction avec les drapeaux courants", () => {
  const text = (flags: Set<string>) => (flags.has("x") ? "avec x" : "sans x");
  assert.equal(resolveText(text, new Set()), "sans x");
  assert.equal(resolveText(text, new Set(["x"])), "avec x");
});

test("describeInjuries : liste vide sans blessure", () => {
  assert.deepEqual(describeInjuries(new Set()), []);
});

test("describeInjuries : décrit chaque blessure connue posée", () => {
  const result = describeInjuries(new Set(["bras-coupe", "jambe-blessee"]));
  assert.equal(result.length, 2);
  assert.ok(result.every((s) => typeof s === "string" && s.length > 0));
});
