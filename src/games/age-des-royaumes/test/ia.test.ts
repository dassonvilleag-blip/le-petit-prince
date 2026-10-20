import { test } from "node:test";
import assert from "node:assert/strict";
import { creerIA, penser, type Niveau } from "../ia.ts";
import { avancerPartie, nouvellePartie } from "../sim.ts";

test("seule face à un joueur qui ne fait rien, l'IA développe son économie, monte les âges et gagne", () => {
  const p = nouvellePartie(1);
  const ia = creerIA(1, "difficile");
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

test("les niveaux : à 20 minutes, l'IA difficile a plus de villageois et d'armée que la facile", () => {
  const bilan = (niveau: Niveau) => {
    const p = nouvellePartie(2);
    const ia = creerIA(1, niveau);
    while (p.temps < 20 * 60) {
      penser(p, ia);
      avancerPartie(p, 0.1);
    }
    const siens = [...p.unites.values()].filter((u) => u.camp === 1);
    return { villageois: siens.filter((u) => u.type === "villageois").length, soldats: siens.filter((u) => u.type !== "villageois").length, age: p.camps[1].age };
  };
  const facile = bilan("facile");
  const difficile = bilan("difficile");
  assert.ok(facile.villageois <= 15, `facile : ${facile.villageois} villageois`);
  assert.ok(difficile.villageois > facile.villageois + 8, `difficile ${difficile.villageois} contre facile ${facile.villageois}`);
  assert.ok(facile.soldats <= 8);
  assert.ok(difficile.age >= facile.age);
});
