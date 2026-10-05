import { test } from "node:test";
import assert from "node:assert/strict";
import { RECETTE_PAR_PRODUIT, VILLES } from "../data.ts";
import {
  acheterCaravane,
  acheterQG,
  affecterRavitaillement,
  apprendre,
  avancer,
  duree,
  embaucherCaravanier,
  enChargement,
  fabriquer,
  nouvelEtat,
  partir,
  placeLibreQG,
  poser,
  quotaAppro,
  rappeler,
  regler,
  remplirAuto,
  seuilNiveau,
  stockN,
  type Etat,
} from "../state.ts";

const HEURE = 3_600_000;

// QG acheté, toutes les villes ouvertes, une caravane avec caravanier à quai au QG.
function etatRavitaillement(): Etat {
  const s = nouvelEtat(0);
  s.villes = VILLES.map((v) => v.id);
  s.ecus = 1e7;
  s.charrette = 2; // 4 × 4
  assert.ok(acheterQG(s));
  assert.ok(embaucherCaravanier(s, 0));
  s.caravanes[0].ville = "qg";
  return s;
}

test("affecter demande le QG et un caravanier", () => {
  const sansQG = nouvelEtat(0);
  embaucherCaravanier(sansQG, 0);
  assert.equal(affecterRavitaillement(sansQG, 0, 0), false);

  const s = etatRavitaillement();
  assert.ok(acheterCaravane(s));
  s.caravanes[1].ville = "qg";
  assert.equal(affecterRavitaillement(s, 1, 0), false, "pas de caravanier");
  assert.ok(affecterRavitaillement(s, 0, 0));
  assert.equal(affecterRavitaillement(s, 0, 0), false, "déjà en mission");
});

test("disponible sans l'Intendant", () => {
  const s = etatRavitaillement();
  regler(s, "appro", "miel", 3);
  assert.ok(affecterRavitaillement(s, 0, 0));
  avancer(s, 2 * HEURE);
  assert.equal(stockN(s.qg!, "miel"), 3);
});

test("elle va dans la ville qui produit ce qui manque", () => {
  const s = etatRavitaillement();
  regler(s, "appro", "poisson", 4);
  assert.ok(affecterRavitaillement(s, 0, 0));
  assert.equal(s.caravanes[0].trajet?.vers, "portvent");
});

test("une recette sur trois villes : tout arrive, jusqu'au stock visé, puis elle attend au QG", () => {
  const s = etatRavitaillement();
  for (const [b, n] of RECETTE_PAR_PRODUIT.tarte!.ingredients) regler(s, "appro", b, 2 * n);
  assert.ok(affecterRavitaillement(s, 0, 0));
  const bilan = avancer(s, 3 * HEURE);
  const qg = s.qg!;
  assert.equal(stockN(qg, "miel"), 4);
  assert.equal(stockN(qg, "ble"), 2);
  assert.equal(stockN(qg, "fromage"), 2);
  assert.equal(stockN(qg, "raisin"), 0, "rien hors de la liste");
  assert.ok(bilan.achats > 0 && bilan.depots === 8);
  const c = s.caravanes[0];
  assert.ok(c.ville === "qg" && !c.trajet && c.attente != null, "elle attend au QG");
  // on consomme du miel : elle repart à la tentative suivante
  delete qg.stock.miel;
  avancer(s, c.attente! + HEURE);
  assert.equal(stockN(qg, "miel"), 4);
});

test("elle écoule le stock coché dans une ville qui le paie, en gardant le minimum", () => {
  const s = etatRavitaillement();
  const qg = s.qg!;
  qg.stock.salaisons = { n: 3, cout: 60 };
  qg.stock.robe = { n: 1, cout: 300 };
  regler(s, "ecoulement", "salaisons", 1);
  assert.ok(affecterRavitaillement(s, 0, 0));
  const c = s.caravanes[0];
  assert.equal(c.cargaison.length, 2);
  assert.ok(RECETTE_PAR_PRODUIT.salaisons!.reclame.includes(c.trajet!.vers as never), `vers ${c.trajet!.vers}`);
  const avant = s.ecus;
  const bilan = avancer(s, c.trajet!.arrivee);
  assert.ok(bilan.gain > 0 && s.ecus > avant);
  assert.equal(stockN(qg, "salaisons"), 1);
  assert.equal(stockN(qg, "robe"), 1, "pas cochée : gardée");
});

test("elle n'emporte pas ce qui se vendrait à perte", () => {
  const s = etatRavitaillement();
  s.qg!.stock.olives = { n: 5, cout: 5 * 1000 }; // payées une fortune
  regler(s, "ecoulement", "olives", 0);
  assert.ok(affecterRavitaillement(s, 0, 0));
  assert.ok(s.caravanes[0].attente != null && !s.caravanes[0].trajet, "rien à faire");
});

test("deux ravitailleuses n'achètent pas deux fois le même manque", () => {
  const s = etatRavitaillement();
  assert.ok(acheterCaravane(s));
  assert.ok(embaucherCaravanier(s, 1));
  s.caravanes[1].ville = "qg";
  regler(s, "appro", "miel", 3);
  assert.ok(affecterRavitaillement(s, 0, 0));
  assert.ok(affecterRavitaillement(s, 1, 0));
  avancer(s, 2 * HEURE);
  assert.equal(stockN(s.qg!, "miel"), 3);
});

test("ce qui roule déjà vers le QG compte dans le manque (Intendant compris)", () => {
  const s = etatRavitaillement();
  regler(s, "appro", "olives", 6);
  const c = s.caravanes[0];
  c.ville = "terracuite";
  remplirAuto(s, 0, "qg", 0);
  const n = c.cargaison.filter((p) => p.bien === "olives").length;
  const place = placeLibreQG(s);
  assert.ok(partir(s, 0, "qg", 0));
  assert.equal(quotaAppro(s).olives ?? 0, Math.max(0, 6 - n));
  assert.ok(placeLibreQG(s) < place, "place promise");
});

test("entrepôt plein ou listes vides : elle attend au QG", () => {
  const s = etatRavitaillement();
  assert.ok(affecterRavitaillement(s, 0, 0));
  assert.ok(s.caravanes[0].attente != null && !s.caravanes[0].trajet, "listes vides");

  const p = etatRavitaillement();
  p.qg!.stock.poterie = { n: 10, cout: 100 }; // 40 cases : le hangar est plein
  regler(p, "appro", "miel", 5);
  assert.ok(affecterRavitaillement(p, 0, 0));
  assert.ok(p.caravanes[0].attente != null && !p.caravanes[0].trajet, "entrepôt plein");
});

test("on ne charge pas une ravitailleuse à la main", () => {
  const s = etatRavitaillement();
  s.qg!.stock.miel = { n: 2, cout: 10 };
  assert.ok(affecterRavitaillement(s, 0, 0));
  assert.equal(enChargement(s.caravanes[0]), false);
  assert.equal(poser(s, 0, { bien: "miel", rot: 0, x: 0, y: 0 }, 0), false);
});

test("rappeler : elle finit son trajet et redevient une caravane normale", () => {
  const s = etatRavitaillement();
  regler(s, "appro", "miel", 3);
  assert.ok(affecterRavitaillement(s, 0, 0));
  const c = s.caravanes[0];
  avancer(s, c.trajet!.arrivee); // achète à Clos-Vermeil, repart vers le QG
  assert.equal(c.trajet?.vers, "qg");
  rappeler(s, 0);
  avancer(s, c.trajet!.arrivee + 10 * duree(s, "qg", "clos-vermeil"));
  assert.ok(c.aVendre && c.ville === "qg", "Tout déposer à la main");
  assert.equal(stockN(s.qg!, "miel"), 0);
  assert.equal(c.mission, null);
});

test("hors ligne une nuit : ravitaillement, fabrication et écoulement s'enchaînent", () => {
  const s = etatRavitaillement();
  s.reputation = seuilNiveau(18);
  assert.ok(apprendre(s, "intendant") && apprendre(s, "compagnon"));
  const r = RECETTE_PAR_PRODUIT.salaisons!;
  for (const [b, n] of r.ingredients) regler(s, "appro", b, 2 * n);
  regler(s, "ecoulement", "salaisons", 0);
  // la première fabrication se lance à la main, Compagnon relance ensuite
  for (const [b, n] of r.ingredients) s.qg!.stock[b] = { n, cout: 10 * n };
  assert.ok(fabriquer(s, 0, "salaisons", 0));
  assert.ok(affecterRavitaillement(s, 0, 0));
  const ecus = s.ecus;
  const bilan = avancer(s, 10 * HEURE);
  assert.ok(bilan.fabrications > 0, "l'atelier a tourné");
  assert.ok(bilan.gain > 0 && bilan.achats > 0);
  assert.ok(s.ecus > ecus - bilan.achats, "les ventes ont rapporté");
  for (const [b, n] of r.ingredients) assert.ok(stockN(s.qg!, b) <= 2 * n, `${b} : pas plus que le stock visé`);
});
