import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvePlayerText, SPECIES_LABELS, SPECIES_ORDER } from "../player.ts";
import type { Player } from "../types.ts";

const joueurHomme: Player = { name: "Gaspard", gender: "homme", species: "geant" };
const joueurFemme: Player = { name: "Isaline", gender: "femme", species: "lunarien" };

test("resolvePlayerText : remplace {prenom} par le prénom du joueur", () => {
  assert.equal(resolvePlayerText("Bonjour {prenom}.", joueurHomme), "Bonjour Gaspard.");
});

test("resolvePlayerText : remplace {espece} par le libellé accordé au genre", () => {
  assert.equal(resolvePlayerText("Un {espece} passe.", joueurHomme), "Un Géant passe.");
  assert.equal(resolvePlayerText("Une {espece} passe.", joueurFemme), "Une Lunarienne passe.");
});

test("resolvePlayerText : résout {motM/motF} selon le genre", () => {
  assert.equal(resolvePlayerText("Tu es {prêt/prête}.", joueurHomme), "Tu es prêt.");
  assert.equal(resolvePlayerText("Tu es {prêt/prête}.", joueurFemme), "Tu es prête.");
});

test("resolvePlayerText : combine plusieurs placeholders dans un même texte", () => {
  const result = resolvePlayerText("{prenom}, {espece} {prêt/prête} au combat.", joueurFemme);
  assert.equal(result, "Isaline, Lunarienne prête au combat.");
});

test("resolvePlayerText : un texte sans placeholder reste inchangé", () => {
  assert.equal(resolvePlayerText("Rien à substituer ici.", joueurHomme), "Rien à substituer ici.");
});

test("resolvePlayerText : une accolade non refermée reste telle quelle, sans planter", () => {
  assert.equal(resolvePlayerText("Un { orphelin.", joueurHomme), "Un { orphelin.");
});

test("SPECIES_LABELS : couvre exactement les 5 espèces de SPECIES_ORDER", () => {
  assert.deepEqual(Object.keys(SPECIES_LABELS).sort(), [...SPECIES_ORDER].sort());
});
