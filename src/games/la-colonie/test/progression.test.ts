import { test } from "node:test";
import assert from "node:assert/strict";
import { EXPEDITIONS, REINE, SALLES, STOCK_BASE, type Cost, type ResourceId } from "../data.ts";

// Capacité maximale atteignable quand la Reine est au niveau `reine` :
// base + tous les greniers autorisés, chacun poussé au plus haut niveau
// que la règle d'amélioration permet (niveau de salle < niveau de Reine + 1).
function capaciteMax(reine: number): number {
  const grenier = SALLES.find((s) => s.id === "grenier")!;
  const nb = grenier.maxParReine[reine - 1];
  const niveauMax = Math.min(grenier.niveaux.length, reine);
  return STOCK_BASE + nb * (grenier.niveaux[niveauMax - 1].stockBonus ?? 0);
}

// Le bug du joueur bloqué à 3300/3300 pour un palier à 4000 : chaque coût du
// jeu doit être payable avec la capacité atteignable au moment où il se
// présente, avec une marge (on ne veut pas exiger un stock plein à 100 %).
test("chaque niveau de Reine est payable avec la capacité de son palier", () => {
  for (let reine = 1; reine < REINE.length; reine++) {
    const cout = REINE[reine].cout; // coût pour passer au niveau reine+1
    const cap = capaciteMax(reine);
    for (const [res, n] of Object.entries(cout) as [ResourceId, number][])
      assert.ok(
        n <= cap * 0.9,
        `Reine niv. ${reine + 1} : ${n} ${res} exigés mais capacité max ${cap} au niv. ${reine} (marge 90 % dépassée)`
      );
  }
});

test("chaque amélioration de salle est payable à son palier", () => {
  for (const salle of SALLES) {
    for (let niveau = 0; niveau < salle.niveaux.length; niveau++) {
      // une salle niveau n+1 exige Reine niveau n+1 au minimum
      const reineRequise = Math.max(1, Math.min(REINE.length, niveau + 1));
      const cap = capaciteMax(reineRequise);
      const verifier = (cout: Cost): void => {
        for (const [res, n] of Object.entries(cout) as [ResourceId, number][])
          assert.ok(
            n <= cap * 0.9,
            `${salle.nom} niv. ${niveau + 1} : ${n} ${res} exigés mais capacité max ${cap} (Reine niv. ${reineRequise})`
          );
      };
      verifier(salle.niveaux[niveau].cout);
    }
  }
});

test("chaque offrande d'expédition est payable à son palier", () => {
  for (const exp of EXPEDITIONS) {
    if (!exp.offrande) continue;
    const cap = capaciteMax(exp.reineMin);
    for (const [res, n] of Object.entries(exp.offrande) as [ResourceId, number][])
      assert.ok(n <= cap * 0.9, `${exp.nom} : offrande de ${n} ${res} mais capacité max ${cap} au niv. ${exp.reineMin}`);
  }
});
