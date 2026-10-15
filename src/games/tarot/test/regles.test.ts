import { test } from "node:test";
import assert from "node:assert/strict";
import { EXCUSE, PETIT, VINGT_ET_UN, TOTAL_DEMI_POINTS, atout, carteCouleur, demiPoints, paquetNeuf, PIQUE, COEUR, CARREAU } from "../cartes.ts";
import { coupsLegaux, decompter, ecartValide, indexGagnant, poigneePossible, GARDE, PRISE, GARDE_CONTRE, type PliJoue } from "../regles.ts";
import { appelsPossibles } from "../donne.ts";

const pique = (r: number) => carteCouleur(PIQUE, r);
const coeur = (r: number) => carteCouleur(COEUR, r);
const carreau = (r: number) => carteCouleur(CARREAU, r);

test("le paquet vaut 91 points et contient 3 bouts", () => {
  assert.equal(paquetNeuf().reduce((s, c) => s + demiPoints(c), 0), TOTAL_DEMI_POINTS);
});

test("gagnant du pli : la plus forte de la couleur demandée, l'atout bat tout, l'Excuse jamais", () => {
  assert.equal(indexGagnant([pique(5), pique(14), coeur(14), pique(1)]), 1);
  assert.equal(indexGagnant([pique(5), atout(2), pique(14), atout(1)]), 1);
  assert.equal(indexGagnant([EXCUSE, coeur(3), coeur(9), pique(14)]), 2);
});

test("fournir à la couleur demandée (l'Excuse reste toujours jouable)", () => {
  const main = [pique(3), pique(12), coeur(5), atout(4), EXCUSE];
  assert.deepEqual(coupsLegaux(main, [pique(14)]).sort(), [pique(3), pique(12), EXCUSE].sort());
});

test("couper si on n'a pas la couleur, et monter sur l'atout le plus fort", () => {
  const main = [coeur(5), atout(4), atout(12), atout(15)];
  assert.deepEqual(coupsLegaux(main, [pique(14)]).sort(), [atout(4), atout(12), atout(15)].sort());
  assert.deepEqual(coupsLegaux(main, [pique(14), atout(10)]).sort(), [atout(12), atout(15)].sort());
  // impossible de monter : n'importe quel atout (sous-couper)
  assert.deepEqual(coupsLegaux(main, [pique(14), atout(20)]).sort(), [atout(4), atout(12), atout(15)].sort());
});

test("ni couleur ni atout : défausse libre", () => {
  const main = [coeur(5), carreau(14)];
  assert.deepEqual(coupsLegaux(main, [pique(2)]).sort(), main.sort());
});

test("entame à l'Excuse : la carte suivante fixe la couleur", () => {
  const main = [pique(3), coeur(5)];
  assert.deepEqual(coupsLegaux(main, [EXCUSE, coeur(9)]), [coeur(5)]);
  assert.deepEqual(coupsLegaux(main, [EXCUSE]).sort(), main.sort());
});

test("écart : pas de roi, pas de bout, atouts seulement si nécessaire", () => {
  const main = [pique(14), pique(2), pique(3), coeur(4), coeur(5), coeur(6), carreau(7), atout(5), PETIT];
  assert.equal(ecartValide(main, [pique(2), pique(3), coeur(4)], 3), null);
  assert.match(ecartValide(main, [pique(14), pique(2), pique(3)], 3)!, /rois/);
  assert.match(ecartValide(main, [PETIT, pique(2), pique(3)], 3)!, /bouts/);
  assert.match(ecartValide(main, [atout(5), pique(2), pique(3)], 3)!, /atout/);
  const courte = [pique(14), coeur(14), pique(2), atout(5), atout(6), VINGT_ET_UN];
  assert.equal(ecartValide(courte, [pique(2), atout(5), atout(6)], 3), null);
});

test("seuils de poignée à 4 et à 5", () => {
  assert.equal(poigneePossible(9, 4), 0);
  assert.equal(poigneePossible(10, 4), 1);
  assert.equal(poigneePossible(13, 4), 2);
  assert.equal(poigneePossible(15, 4), 3);
  assert.equal(poigneePossible(8, 5), 1);
  assert.equal(poigneePossible(13, 5), 3);
});

test("appel : un roi, une dame si l'on a les quatre rois", () => {
  assert.deepEqual(appelsPossibles([pique(2)]), [0, 1, 2, 3].map((c) => carteCouleur(c, 14)));
  const quatreRois = [0, 1, 2, 3].map((c) => carteCouleur(c, 14));
  assert.deepEqual(appelsPossibles(quatreRois), [0, 1, 2, 3].map((c) => carteCouleur(c, 13)));
});

/** fabrique des plis où `gagnant` remporte les cartes données */
function plis(...defs: [number, number[], number[]][]): PliJoue[] {
  return defs.map(([gagnant, cartes, joueurs]) => ({ gagnant, cartes, joueurs }));
}

test("décompte : garde gagnée de 6 avec 2 bouts, à 4", () => {
  // l'attaque (joueur 0) récupère des cartes pour 47 points avec le Petit et le 21
  const attaque = [PETIT, VINGT_ET_UN, pique(14), coeur(14), carreau(14), carteCouleur(3, 14), pique(13), coeur(13), carreau(13), carteCouleur(3, 13), pique(12)];
  const pts = attaque.reduce((s, c) => s + demiPoints(c), 0) / 2; // 4.5*6 + 3.5*4 + 2.5 = 43.5
  assert.equal(pts, 43.5);
  // complète à 47 avec 7 petites cartes (3.5 points)
  const petites = [pique(2), pique(3), pique(4), pique(5), pique(6), pique(7), pique(8)];
  const d = decompter({
    n: 4,
    contrat: GARDE,
    preneur: 0,
    partenaire: -1,
    plis: plis([0, [...attaque, ...petites], [0]], [1, [EXCUSE, coeur(2)], [1, 2]]),
    ecart: [],
    poignees: [],
  });
  assert.equal(d.demiPointsAttaque, 94);
  assert.equal(d.bouts, 2);
  assert.equal(d.gagne, true);
  assert.equal(d.part, (25 + 6) * 2);
  assert.deepEqual(d.scores, [186, -62, -62, -62]);
});

test("décompte : l'Excuse reste à son camp contre une demi-carte", () => {
  // la défense prend le pli mais l'Excuse du preneur lui revient ; il rend ½ point
  const d = decompter({
    n: 4,
    contrat: PRISE,
    preneur: 0,
    partenaire: -1,
    plis: plis([1, [coeur(2), EXCUSE, coeur(3), coeur(4)], [1, 0, 2, 3]], [1, [pique(2), pique(3), pique(4), pique(5)], [1, 2, 3, 0]]),
    ecart: [],
    poignees: [],
  });
  assert.equal(d.demiPointsAttaque, 9 - 1);
  assert.equal(d.bouts, 1);
});

test("décompte : petit au bout et garde contre (le chien va à la défense)", () => {
  const d = decompter({
    n: 4,
    contrat: GARDE_CONTRE,
    preneur: 0,
    partenaire: -1,
    plis: plis([0, [PETIT, coeur(2), coeur(3), coeur(4)], [0, 1, 2, 3]]),
    ecart: [VINGT_ET_UN],
    poignees: [{ joueur: 0, taille: 1 }],
  });
  assert.equal(d.bouts, 1); // le 21 du chien compte pour la défense
  assert.equal(d.petitAuBout, 1);
  assert.equal(d.chelem, 1);
  // chute (6 pts sur 51) : -(25+45)*6 + 10*6 (petit au bout) - 20 (poignée) + 200 (chelem)
  assert.equal(d.part, -(25 + 45) * 6 + 60 - 20 + 200);
});

test("décompte à 5 : le preneur prend deux parts, son partenaire une", () => {
  const d = decompter({
    n: 5,
    contrat: PRISE,
    preneur: 2,
    partenaire: 4,
    plis: plis([4, [coeur(2), coeur(3), coeur(4), coeur(5), coeur(6)], [0, 1, 2, 3, 4]]),
    ecart: [],
    poignees: [],
  });
  assert.equal(d.scores.reduce((a, b) => a + b, 0), 0);
  assert.equal(d.scores[2], 2 * d.part);
  assert.equal(d.scores[4], d.part);
  assert.equal(d.scores[0], -d.part);
});
