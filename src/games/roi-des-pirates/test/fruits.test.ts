import { test } from "node:test";
import assert from "node:assert/strict";
import { FRUITS, pickRandomFruit, revealsFruit, findEatenFruit } from "../fruits.ts";

test("FRUITS : contient exactement 30 fruits, 10 par type", () => {
  assert.equal(FRUITS.length, 30);
  assert.equal(FRUITS.filter((f) => f.type === "Zoan").length, 10);
  assert.equal(FRUITS.filter((f) => f.type === "Paramecia").length, 10);
  assert.equal(FRUITS.filter((f) => f.type === "Logia").length, 10);
});

test("FRUITS : identifiants tous uniques", () => {
  const ids = new Set(FRUITS.map((f) => f.id));
  assert.equal(ids.size, FRUITS.length);
});

test("pickRandomFruit : sans filtre, rng=0 renvoie le premier fruit de la table", () => {
  assert.equal(pickRandomFruit(undefined, () => 0), FRUITS[0]);
});

test("pickRandomFruit : sans filtre, rng proche de 1 renvoie le dernier fruit", () => {
  assert.equal(pickRandomFruit(undefined, () => 0.999999), FRUITS[FRUITS.length - 1]);
});

test("pickRandomFruit : avec filtre de type, ne renvoie que ce type", () => {
  const fruit = pickRandomFruit("Logia", () => 0.5);
  assert.equal(fruit.type, "Logia");
});

test("revealsFruit : un compagnon connaisseur révèle n'importe quel fruit", () => {
  const fruit = FRUITS.find((f) => f.type === "Logia")!;
  assert.equal(revealsFruit(new Set(["compagnon-connaisseur"]), fruit), true);
});

test("revealsFruit : l'origine noble ne révèle que les Paramecia", () => {
  const paramecia = FRUITS.find((f) => f.type === "Paramecia")!;
  const logia = FRUITS.find((f) => f.type === "Logia")!;
  assert.equal(revealsFruit(new Set(["origine-noble"]), paramecia), true);
  assert.equal(revealsFruit(new Set(["origine-noble"]), logia), false);
});

test("revealsFruit : sans source de connaissance, rien n'est révélé", () => {
  const fruit = FRUITS[0];
  assert.equal(revealsFruit(new Set(), fruit), false);
});

test("findEatenFruit : retrouve le fruit correspondant au drapeau fruit-<id>", () => {
  const fruit = FRUITS[3];
  const found = findEatenFruit(new Set([`fruit-${fruit.id}`, "autre-drapeau"]));
  assert.equal(found, fruit);
});

test("findEatenFruit : undefined si aucun drapeau fruit-<id>", () => {
  assert.equal(findEatenFruit(new Set(["epeiste-recrute"])), undefined);
});
