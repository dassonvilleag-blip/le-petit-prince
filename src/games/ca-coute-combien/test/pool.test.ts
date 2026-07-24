import { test } from "node:test";
import assert from "node:assert/strict";
import { shuffle, drawRound } from "../pool.ts";

const ITEMS = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];

test("shuffle returns all the same elements, in some order", () => {
  const result = shuffle(ITEMS);
  const sortById = (arr: { id: string }[]) => [...arr].sort((a, b) => a.id.localeCompare(b.id));
  assert.deepEqual(sortById(result), sortById(ITEMS));
});

test("shuffle does not mutate the input array", () => {
  const copy = [...ITEMS];
  shuffle(ITEMS);
  assert.deepEqual(ITEMS, copy);
});

test("drawRound picks only unseen items when enough are available", () => {
  const { round, updatedSeenIds } = drawRound(ITEMS, ["a"], 2);
  assert.equal(round.length, 2);
  assert.ok(round.every((item) => item.id !== "a"));
  assert.deepEqual(updatedSeenIds.sort(), ["a", ...round.map((i) => i.id)].sort());
});

test("drawRound cycles the pool when not enough unseen items remain", () => {
  const { round, updatedSeenIds } = drawRound(ITEMS, ["a", "b", "c"], 2);
  assert.equal(round.length, 2);
  assert.ok(round.some((item) => item.id === "d"));
  assert.equal(updatedSeenIds.length, 2);
});

test("drawRound never repeats an item within the same round", () => {
  const { round } = drawRound(ITEMS, ["a", "b", "c"], 3);
  const ids = round.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
});
