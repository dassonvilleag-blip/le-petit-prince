import { test } from "node:test";
import assert from "node:assert/strict";
import { validateStoryGraph } from "../engine.ts";
import { STORY } from "../story.ts";

test("STORY : le graphe narratif ne contient aucune référence cassée", () => {
  const errors = validateStoryGraph(STORY);
  assert.deepEqual(errors, []);
});

test("STORY : les 4 fins existent et sont bien marquées comme telles", () => {
  const endingIds = ["fin-roi-des-pirates", "fin-legende", "fin-retraite", "fin-capture"];
  for (const id of endingIds) {
    const node = STORY.find((n) => n.id === id);
    assert.ok(node, `fin manquante: ${id}`);
    assert.equal(node!.isEnding, true);
  }
});
