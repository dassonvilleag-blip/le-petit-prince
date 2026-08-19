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

import { validateStoryGraph } from "../engine.ts";
import type { StoryNode } from "../types.ts";

test("validateStoryGraph : accepte un graphe valide à deux nœuds", () => {
  const nodes: StoryNode[] = [
    { id: "a", text: "A", svg: "", choices: [{ text: "aller à b", effects: {}, next: "b" }] },
    { id: "b", text: "B", svg: "", choices: [], isEnding: true },
  ];
  assert.deepEqual(validateStoryGraph(nodes), []);
});

test("validateStoryGraph : signale une référence next vers un id inexistant", () => {
  const nodes: StoryNode[] = [
    { id: "a", text: "A", svg: "", choices: [{ text: "x", effects: {}, next: "n-existe-pas" }] },
  ];
  const errors = validateStoryGraph(nodes);
  assert.ok(errors.some((e) => e.includes("n-existe-pas")));
});

test("validateStoryGraph : signale des identifiants dupliqués", () => {
  const nodes: StoryNode[] = [
    { id: "a", text: "A", svg: "", choices: [], isEnding: true },
    { id: "a", text: "A bis", svg: "", choices: [], isEnding: true },
  ];
  const errors = validateStoryGraph(nodes);
  assert.ok(errors.some((e) => e.includes("dupliqué")));
});

test("validateStoryGraph : signale un nœud non-fin sans aucun choix", () => {
  const nodes: StoryNode[] = [{ id: "a", text: "A", svg: "", choices: [] }];
  const errors = validateStoryGraph(nodes);
  assert.ok(errors.some((e) => e.includes("aucun choix")));
});

test("validateStoryGraph : signale un nœud dont tous les choix sont conditionnels", () => {
  const nodes: StoryNode[] = [
    {
      id: "a",
      text: "A",
      svg: "",
      choices: [{ text: "x", effects: {}, next: "b", requiresFlags: ["flag"] }],
    },
    { id: "b", text: "B", svg: "", choices: [], isEnding: true },
  ];
  const errors = validateStoryGraph(nodes);
  assert.ok(errors.some((e) => e.includes("inconditionnel")));
});

test("validateStoryGraph : suit aussi les cibles de duel et de fruit en attente", () => {
  const nodes: StoryNode[] = [
    {
      id: "a",
      text: "A",
      svg: "",
      choices: [
        {
          text: "duel",
          effects: {},
          duel: {
            opponentPower: 10,
            win: "victoire-manquante",
            loseMinor: "b",
            loseMajor: "b",
          },
        },
        { text: "manger", effects: {}, eatPendingFruit: { next: "manger-manquant" } },
      ],
    },
    { id: "b", text: "B", svg: "", choices: [], isEnding: true },
  ];
  const errors = validateStoryGraph(nodes);
  assert.ok(errors.some((e) => e.includes("victoire-manquante")));
  assert.ok(errors.some((e) => e.includes("manger-manquant")));
});

test("validateStoryGraph : signale un choix sans aucun routage (ni next, ni duel, ni eatPendingFruit)", () => {
  const nodes: StoryNode[] = [
    {
      id: "a",
      text: "A",
      svg: "",
      choices: [{ text: "choix orphelin", effects: {} }],
    },
  ];
  const errors = validateStoryGraph(nodes);
  assert.ok(errors.some((e) => e.includes("aucun routage")));
});

test("validateStoryGraph : un choix pickFruitCandidate accompagné de next n'est pas signalé", () => {
  const nodes: StoryNode[] = [
    {
      id: "a",
      text: "A",
      svg: "",
      choices: [{ text: "ouvrir", effects: {}, pickFruitCandidate: {}, next: "b" }],
    },
    { id: "b", text: "B", svg: "", choices: [], isEnding: true },
  ];
  assert.deepEqual(validateStoryGraph(nodes), []);
});
