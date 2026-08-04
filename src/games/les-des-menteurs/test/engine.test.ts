import { test } from "node:test";
import assert from "node:assert/strict";
import { countMatching, isValidBid, resolveCalza, resolveDudo, rollDice } from "../engine.ts";

const bid = (count: number, face: number) => ({ count, face });

test("ouverture : toute face sauf les pacos", () => {
  assert.equal(isValidBid(null, bid(1, 2), 10, false), true);
  assert.equal(isValidBid(null, bid(3, 6), 10, false), true);
  assert.equal(isValidBid(null, bid(2, 1), 10, false), false);
  assert.equal(isValidBid(null, bid(2, 1), 10, true), true); // palifico : pacos ok
});

test("ouverture invalide : compte nul, hors bornes, face inconnue", () => {
  assert.equal(isValidBid(null, bid(0, 3), 10, false), false);
  assert.equal(isValidBid(null, bid(11, 3), 10, false), false);
  assert.equal(isValidBid(null, bid(2, 7), 10, false), false);
  assert.equal(isValidBid(null, bid(2.5, 3), 10, false), false);
});

test("surenchère classique : compte supérieur, ou même compte et face supérieure", () => {
  assert.equal(isValidBid(bid(3, 4), bid(4, 2), 20, false), true);
  assert.equal(isValidBid(bid(3, 4), bid(3, 5), 20, false), true);
  assert.equal(isValidBid(bid(3, 4), bid(3, 4), 20, false), false);
  assert.equal(isValidBid(bid(3, 4), bid(3, 3), 20, false), false);
  assert.equal(isValidBid(bid(3, 4), bid(2, 6), 20, false), false);
});

test("passage aux pacos : moitié arrondie au-dessus", () => {
  assert.equal(isValidBid(bid(5, 4), bid(3, 1), 20, false), true);
  assert.equal(isValidBid(bid(5, 4), bid(2, 1), 20, false), false);
  assert.equal(isValidBid(bid(4, 6), bid(2, 1), 20, false), true);
});

test("retour des pacos : double plus un", () => {
  assert.equal(isValidBid(bid(3, 1), bid(7, 2), 20, false), true);
  assert.equal(isValidBid(bid(3, 1), bid(6, 6), 20, false), false);
  assert.equal(isValidBid(bid(3, 1), bid(4, 1), 20, false), true); // pacos sur pacos : compte supérieur
  assert.equal(isValidBid(bid(3, 1), bid(3, 1), 20, false), false);
});

test("palifico : face figée, seul le compte grimpe", () => {
  assert.equal(isValidBid(bid(2, 3), bid(3, 3), 10, true), true);
  assert.equal(isValidBid(bid(2, 3), bid(3, 4), 10, true), false);
  assert.equal(isValidBid(bid(2, 3), bid(2, 3), 10, true), false);
});

test("comptage : les pacos sont jokers", () => {
  const dice = [
    [2, 2, 1, 5],
    [1, 3, 2],
  ];
  assert.equal(countMatching(dice, 2, false), 5); // trois 2 + deux pacos
  assert.equal(countMatching(dice, 1, false), 2); // les pacos se comptent seuls
  assert.equal(countMatching(dice, 5, false), 3);
});

test("comptage palifico : les pacos ne comptent plus", () => {
  const dice = [[2, 2, 1], [1, 2]];
  assert.equal(countMatching(dice, 2, true), 3);
  assert.equal(countMatching(dice, 1, true), 2);
});

test("dudo : l'enchère tient → le challenger perd, sinon l'enchérisseur", () => {
  assert.equal(resolveDudo(bid(3, 4), 3), "challenger");
  assert.equal(resolveDudo(bid(3, 4), 5), "challenger");
  assert.equal(resolveDudo(bid(3, 4), 2), "bidder");
});

test("calza : pile le compte → gain, sinon perte", () => {
  assert.equal(resolveCalza(bid(3, 4), 3), "gain");
  assert.equal(resolveCalza(bid(3, 4), 4), "lose");
  assert.equal(resolveCalza(bid(3, 4), 2), "lose");
});

test("rollDice : n dés entre 1 et 6", () => {
  const dice = rollDice(100);
  assert.equal(dice.length, 100);
  assert.equal(dice.every((d) => d >= 1 && d <= 6), true);
  assert.deepEqual(rollDice(3, () => 0), [1, 1, 1]);
  assert.deepEqual(rollDice(3, () => 0.999999), [6, 6, 6]);
});
