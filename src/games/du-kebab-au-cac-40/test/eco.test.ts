import { test } from "node:test";
import assert from "node:assert/strict";
import { AMELIORATIONS, COMMERCES, COMMERCE_PAR_ID } from "../data.ts";
import {
  actionsTotales,
  coutAchat,
  dureeCycle,
  formatArgent,
  formatDuree,
  maxAchetable,
  multPalierRevenu,
  prochainPalier,
} from "../eco.ts";
import {
  acheterCommerce,
  actionsAGagner,
  avancer,
  embaucher,
  entrerEnBourse,
  lancer,
  nouvelEtat,
  revenuCycle,
} from "../state.ts";

const kebab = COMMERCE_PAR_ID.anatolie;

test("le coût de n achats est la somme des prix unitaires successifs", () => {
  let somme = 0;
  for (let i = 0; i < 10; i++) somme += kebab.coutInitial * kebab.coef ** (3 + i);
  assert.ok(Math.abs(coutAchat(kebab, 3, 10) - somme) < 1e-6 * somme);
});

test("maxAchetable renvoie le plus grand n abordable", () => {
  for (const argent of [0, 59, 60, 1000, 123_456, 1e12]) {
    const n = maxAchetable(kebab, 7, argent);
    assert.ok(coutAchat(kebab, 7, n) <= argent, `n=${n} trop cher pour ${argent}`);
    assert.ok(coutAchat(kebab, 7, n + 1) > argent, `n+1=${n + 1} abordable avec ${argent}`);
  }
});

test("chaque palier de vitesse divise le cycle par deux", () => {
  assert.equal(dureeCycle(kebab, 24), 3);
  assert.equal(dureeCycle(kebab, 25), 1.5);
  assert.equal(dureeCycle(kebab, 400), 3 / 64);
  assert.equal(dureeCycle(kebab, 5000), 3 / 64);
});

test("au-delà de 400, chaque centaine double les revenus", () => {
  assert.equal(multPalierRevenu(499), 1);
  assert.equal(multPalierRevenu(500), 2);
  assert.equal(multPalierRevenu(750), 8);
  assert.deepEqual(prochainPalier(30), { precedent: 25, cible: 50, vitesse: true });
  assert.deepEqual(prochainPalier(420), { precedent: 400, cible: 500, vitesse: false });
});

test("sans gérant, un cycle rapporte une fois puis s'arrête", () => {
  const s = nouvelEtat(0);
  assert.ok(lancer(s, "vide-grenier", 0));
  assert.ok(!lancer(s, "vide-grenier", 500), "déjà en cours");
  assert.equal(avancer(s, 999), 0);
  assert.equal(avancer(s, 60_000), 1);
  assert.equal(s.commerces["vide-grenier"].debut, null);
});

test("avec gérant, l'absence rapporte tous les cycles écoulés", () => {
  const s = nouvelEtat(0);
  s.argent = 1e6;
  assert.ok(embaucher(s, "vide-grenier", 0));
  const avant = s.argent;
  const gain = avancer(s, 3_600_000 + 400); // une heure et des poussières
  assert.equal(gain, 3600);
  assert.equal(s.argent, avant + 3600);
  assert.equal(s.commerces["vide-grenier"].debut, 3_600_000, "le cycle entamé est conservé");
});

test("acheter sans assez d'argent ne change rien", () => {
  const s = nouvelEtat(0);
  assert.ok(!acheterCommerce(s, "anatolie", 1, 0));
  assert.equal(s.commerces.anatolie.nb, 0);
  s.argent = 60;
  assert.ok(acheterCommerce(s, "anatolie", 1, 0));
  assert.equal(s.argent, 0);
});

test("la Bourse garde les actions et remet l'empire à zéro", () => {
  const s = nouvelEtat(0);
  s.gainsCumules = 1e13;
  s.argent = 5e12;
  s.commerces.osr.nb = 40;
  s.gerants.push("osr");
  assert.equal(actionsAGagner(s), 150);
  const t = entrerEnBourse(s, 10);
  assert.equal(t.actions, 150);
  assert.equal(t.argent, 0);
  assert.equal(t.commerces.osr.nb, 0);
  assert.equal(t.commerces["vide-grenier"].nb, 1);
  assert.deepEqual(t.gerants, []);
  assert.equal(actionsAGagner(t), 0, "on ne touche pas deux fois les mêmes actions");
  // +2 % par action
  assert.equal(revenuCycle(t, COMMERCE_PAR_ID["vide-grenier"]), 1 * 4);
  assert.equal(actionsTotales(4e13), 300);
});

test("les commerces sont rangés du plus petit au plus gros", () => {
  for (let i = 1; i < COMMERCES.length; i++) {
    assert.ok(COMMERCES[i].coutInitial > COMMERCES[i - 1].coutInitial, COMMERCES[i].id);
    assert.ok(COMMERCES[i].revenu > COMMERCES[i - 1].revenu, COMMERCES[i].id);
  }
});

test("les améliorations ont des ids uniques et sont triées par prix", () => {
  assert.equal(new Set(AMELIORATIONS.map((a) => a.id)).size, AMELIORATIONS.length);
  for (let i = 1; i < AMELIORATIONS.length; i++) assert.ok(AMELIORATIONS[i].prix >= AMELIORATIONS[i - 1].prix);
});

test("les montants s'affichent en échelle longue française", () => {
  const nb = (s: string) => s.replace(/ /g, " ");
  assert.equal(nb(formatArgent(4.28)), "4,28 €");
  assert.equal(nb(formatArgent(12_345)), "12 345 €");
  assert.equal(nb(formatArgent(1e6)), "1 million €");
  assert.equal(nb(formatArgent(12_431_000)), "12,43 millions €");
  assert.equal(nb(formatArgent(2.5e9)), "2,5 milliards €");
  assert.equal(nb(formatArgent(1e12)), "1 billion €");
  assert.equal(nb(formatArgent(999_999_999)), "999,99 millions €");
});

test("les durées s'affichent lisiblement", () => {
  assert.equal(formatDuree(5), "0:05");
  assert.equal(formatDuree(96), "1:36");
  assert.equal(formatDuree(6144), "1 h 42");
  assert.equal(formatDuree(36_864), "10 h 14");
});
