import { test } from "node:test";
import assert from "node:assert/strict";
import { creerIA, penser } from "../ia.ts";
import { avancerPartie, nouvellePartie } from "../sim.ts";

test("seule face à un joueur qui ne fait rien, l'IA développe son économie, monte les âges et gagne", () => {
  const p = nouvellePartie(1);
  const ia = creerIA(1);
  const bilan = (camp: number) => [...p.unites.values()].filter((u) => u.camp === camp && u.type === "villageois").length;
  while (p.temps < 20 * 60) {
    penser(p, ia);
    avancerPartie(p, 0.1);
  }
  assert.ok(bilan(1) >= 25, `${bilan(1)} villageois à 20 min`);
  assert.ok(p.camps[1].age >= 1, "âge féodal à 20 min");
  assert.ok([...p.batiments.values()].some((b) => b.camp === 1 && b.type === "caserne"));
  while (p.vainqueur === null && p.temps < 60 * 60) {
    penser(p, ia);
    avancerPartie(p, 0.1);
  }
  assert.equal(p.vainqueur, 1);
});
