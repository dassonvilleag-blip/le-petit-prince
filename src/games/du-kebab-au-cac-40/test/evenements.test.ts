import { test } from "node:test";
import assert from "node:assert/strict";
import { COMMERCE_PAR_ID } from "../data.ts";
import { EVENEMENTS, choisir, coutImmediat, decrire, evenementsPossibles, recompenseClient } from "../evenements.ts";
import { ajouterEffet, avancer, debit, dureeMs, embaucher, lancer, nouvelEtat, revenuCycle } from "../state.ts";

const T0 = 1_000_000;
const proche = (a: number, b: number) => assert.ok(Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b)), `${a} ≠ ${b}`);

function etatAvecGerant() {
  const s = nouvelEtat(T0);
  s.argent = 1e9;
  embaucher(s, "vide-grenier", T0); // cycle de 1 s, 1 € par cycle
  s.argent = 0;
  s.gainsCumules = 0;
  return s;
}

test("un bonus ne compte que pour les cycles terminés avant sa fin, même après une longue absence", () => {
  const s = etatAvecGerant();
  const def = COMMERCE_PAR_ID["vide-grenier"];
  const base = revenuCycle(s, def);
  const duree = dureeMs(s, def);
  // ×7 pendant 10,5 s : les cycles qui finissent à 1 s … 10 s en profitent
  ajouterEffet(s, { cible: "tous", mult: 7, fin: T0 + 10.5 * duree, icone: "🔥" });
  const gain = avancer(s, T0 + 3600 * duree);
  proche(gain, 10 * 7 * base + 3590 * base);
  assert.equal(s.effets.length, 0, "l'effet expiré est purgé");
});

test("des effets qui se chevauchent se multiplient sur leur tranche commune", () => {
  const s = etatAvecGerant();
  const base = revenuCycle(s, COMMERCE_PAR_ID["vide-grenier"]);
  ajouterEffet(s, { cible: "tous", mult: 2, fin: T0 + 5000, icone: "a" }); // cycles 1-4
  ajouterEffet(s, { cible: "vide-grenier", mult: 3, fin: T0 + 2500, icone: "b" }); // cycles 1-2
  ajouterEffet(s, { cible: "anatolie", mult: 100, fin: T0 + 9000, icone: "c" }); // pas concerné
  const gain = avancer(s, T0 + 10_000);
  proche(gain, base * (2 * 6 + 2 * 2 + 6));
  assert.equal(s.effets.length, 0);
});

test("un cycle lancé à la main touche le bonus actif à l'instant où il se termine", () => {
  const s = nouvelEtat(T0);
  const def = COMMERCE_PAR_ID["vide-grenier"];
  lancer(s, "vide-grenier", T0);
  ajouterEffet(s, { cible: "tous", mult: 7, fin: T0 + 500, icone: "🔥" });
  proche(avancer(s, T0 + 5000), revenuCycle(s, def)); // fini à 1 s : bonus expiré
  lancer(s, "vide-grenier", T0 + 5000);
  ajouterEffet(s, { cible: "tous", mult: 7, fin: T0 + 9000, icone: "🔥" });
  proche(avancer(s, T0 + 6000), 7 * revenuCycle(s, def));
});

test("une dépense ne fait jamais passer l'argent sous zéro ni baisser la fortune cumulée", () => {
  const s = etatAvecGerant();
  s.argent = 10;
  s.gainsCumules = 500;
  const fisc = EVENEMENTS.find((e) => e.id === "fisc")!;
  choisir(s, fisc, fisc.options[0], T0, () => 0);
  assert.equal(s.argent, 0);
  assert.equal(s.gainsCumules, 500);
});

test("un pari suit le tirage, et le détail décrit ce qui s'est vraiment passé", () => {
  const loto = EVENEMENTS.find((e) => e.id === "loto")!;
  const gratter = loto.options[1];

  const gagnant = etatAvecGerant();
  const d = debit(gagnant);
  const ok = choisir(gagnant, loto, gratter, T0, () => 0.05);
  assert.equal(ok.reussi, true);
  proche(gagnant.argent, 60 * 60 * d);
  assert.match(ok.detail, /^\+1 h de revenus/);

  const perdant = etatAvecGerant();
  const ko = choisir(perdant, loto, gratter, T0, () => 0.5);
  assert.equal(ko.reussi, false);
  assert.equal(perdant.argent, 0);
  assert.equal(perdant.effets[0].mult, 0.8);
  assert.equal(ko.texte, (gratter.effets[0] as { textePerdu: string }).textePerdu);
});

test("les événements ne tombent que sur des commerces ouverts", () => {
  const s = nouvelEtat(T0);
  assert.deepEqual(
    evenementsPossibles(s).map((e) => e.id),
    ["influenceur"]
  );
  s.commerces["club-foot"].nb = 1;
  assert.ok(evenementsPossibles(s).some((e) => e.id === "finale"));
});

test("chaque option d'événement a un texte à afficher", () => {
  for (const ev of EVENEMENTS)
    for (const o of ev.options) {
      const pari = o.effets.some((c) => c.type === "pari");
      assert.ok(pari || o.texte.length > 0, `${ev.id} / ${o.libelle} sans texte`);
      assert.ok(decrire(o.effets, 1).length > 0);
    }
});

test("les quatre récompenses d'un client pressé", () => {
  const rush = etatAvecGerant();
  assert.match(recompenseClient(rush, T0, () => 0.1), /Rush/);
  assert.equal(rush.effets[0].mult, 7);

  const pourboire = etatAvecGerant();
  const d = debit(pourboire);
  recompenseClient(pourboire, T0, () => 0.6);
  proche(pourboire.argent, 600 * d);
  proche(pourboire.gainsCumules, 600 * d);

  const fortune = etatAvecGerant();
  recompenseClient(fortune, T0, () => 0.99);
  proche(fortune.argent, 3600 * d);

  const pub = etatAvecGerant();
  pub.commerces.anatolie.nb = 1;
  const tirages = [0.9, 0.999]; // coup de pub, puis le commerce le plus à droite de la roue
  recompenseClient(pub, T0, () => tirages.shift()!);
  assert.equal(pub.effets[0].cible, "anatolie");
  assert.equal(pub.effets[0].mult, 20);
});

test("le pourboire pendant un Rush est sept fois plus gros", () => {
  const s = etatAvecGerant();
  const d = debit(s);
  recompenseClient(s, T0, () => 0.1);
  recompenseClient(s, T0 + 1000, () => 0.6);
  proche(s.argent, 7 * 600 * d);
});

test("chaque événement garde une option gratuite : on n'est jamais coincé, même fauché", () => {
  for (const ev of EVENEMENTS) assert.ok(ev.options.some((o) => coutImmediat(o, 1) === 0), ev.id);
  const classico = EVENEMENTS.find((e) => e.id === "classico")!;
  assert.equal(coutImmediat(classico.options[0], 2), 3 * 60 * 2);
});

test("un pari sans gain se présente comme un risque", () => {
  const hygiene = EVENEMENTS.find((e) => e.id === "hygiene")!;
  assert.match(decrire(hygiene.options[1].effets, 1), /^30 % de risque : −5 min de revenus \(300\s€\)$/);
});
