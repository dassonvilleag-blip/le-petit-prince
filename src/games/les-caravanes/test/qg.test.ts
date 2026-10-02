import { test } from "node:test";
import assert from "node:assert/strict";
import { ATTENTE_CARAVANIER, BIEN_PAR_ID, COEF_DEMANDE, ENTREPOTS, PRIX_QG, RECETTES, RECETTE_PAR_PRODUIT, VILLES, type VilleId } from "../data.ts";
import { cours, dureeTrajet, prixAchat, prixVente, type Piece } from "../eco.ts";
import {
  acheterQG,
  apprendre,
  avancer,
  capaciteQG,
  casesQG,
  deposer,
  duree,
  embaucherCaravanier,
  encaisser,
  fabriquer,
  nouvelEtat,
  partir,
  poser,
  quotaAppro,
  quotaEcoulement,
  regler,
  remplirAuto,
  reprendre,
  seuilNiveau,
  stockN,
  type Etat,
} from "../state.ts";

function etatAvecQG(): Etat {
  const s = nouvelEtat(0);
  s.villes = VILLES.map((v) => v.id);
  s.ecus = 1e7;
  assert.ok(acheterQG(s));
  return s;
}

function avecIntendant(): Etat {
  const s = etatAvecQG();
  s.reputation = seuilNiveau(18);
  assert.ok(apprendre(s, "intendant"));
  assert.ok(embaucherCaravanier(s, 0));
  return s;
}

// Arrivée d'une caravane au QG, chargée de pièces posées à la main.
function livrerAuQG(s: Etat, ville: VilleId, pieces: Piece[], t = 0): number {
  s.caravanes[0].ville = ville;
  for (const p of pieces) assert.ok(poser(s, 0, p, t), `pose ${p.bien}`);
  assert.ok(partir(s, 0, "qg", t));
  const arrivee = t + duree(s, ville, "qg");
  avancer(s, arrivee);
  const c = s.caravanes[0];
  assert.ok(c.aVendre && c.ville === "qg");
  return arrivee;
}

test("recettes : ingrédients d'au moins deux villes, produit plus compact et plus cher", () => {
  for (const r of RECETTES) {
    const produit = BIEN_PAR_ID[r.produit];
    assert.ok(produit.fabrique, r.produit);
    assert.equal(VILLES.filter((v) => v.produit.includes(r.produit)).length, 0, "produit nulle part");
    const villes = new Set(r.ingredients.map(([b]) => VILLES.find((v) => v.produit.includes(b))!.id));
    assert.ok(villes.size >= 2, `${r.produit} : ${[...villes]}`);
    const casesIngr = r.ingredients.reduce((k, [b, n]) => k + BIEN_PAR_ID[b].forme.length * n, 0);
    assert.ok(produit.forme.length < casesIngr, "plus compact");
    const base = r.ingredients.reduce((k, [b, n]) => k + BIEN_PAR_ID[b].base * n, 0);
    assert.ok(Math.abs(produit.base - 1.5 * base) <= 1, `${r.produit} : ${produit.base} vs ${1.5 * base}`);
    const ville = r.reclame[0];
    assert.equal(prixAchat(ville, r.produit, 0), null, "ne s'achète nulle part");
    assert.ok(Math.abs(prixVente(ville, r.produit, 0) / cours(ville, r.produit, 0) - produit.base * COEF_DEMANDE) < 1e-9);
  }
});

test("le QG s'achète une fois Sablemire ouverte, une seule fois", () => {
  const s = nouvelEtat(0);
  s.ecus = 1e7;
  assert.equal(acheterQG(s), false);
  s.villes = ["portvent", "terracuite", "lainebourg", "clos-vermeil", "sablemire"];
  assert.ok(acheterQG(s));
  assert.equal(s.ecus, 1e7 - PRIX_QG);
  assert.equal(acheterQG(s), false);
  assert.ok(!(s.villes as string[]).includes("qg"), "le QG n'est pas une ville : pas de nouvelles dessus");
});

test("trajets vers le QG : le palier de la ville d'en face", () => {
  const lainebourg = dureeTrajet("qg", "lainebourg", 0);
  assert.ok(Math.abs(lainebourg - Math.hypot(48 - 38, 32 - 46) * 4 * 1.5 * 1000) < 2);
  assert.ok(dureeTrajet("qg", "mirazur", 0) > 15 * 60_000);
  assert.equal(dureeTrajet("qg", "portvent", 0), dureeTrajet("portvent", "qg", 0));
});

test("déposer au QG, puis recharger depuis le stock au coût moyen", () => {
  const s = etatAvecQG();
  const t = livrerAuQG(s, "terracuite", [
    { bien: "poterie", rot: 0, x: 0, y: 0 },
    { bien: "olives", rot: 0, x: 2, y: 0 },
  ]);
  const paye = s.caravanes[0].cout;
  assert.equal(encaisser(s, 0, 999, t), 0, "on ne vend rien au QG");
  assert.equal(deposer(s, 0), 2);
  const qg = s.qg!;
  assert.equal(stockN(qg, "poterie"), 1);
  assert.equal(casesQG(qg), 5);
  assert.equal(s.caravanes[0].cargaison.length, 0);
  // recharger la poterie ne coûte pas d'écus, et son coût suit
  const ecus = s.ecus;
  assert.ok(poser(s, 0, { bien: "poterie", rot: 0, x: 0, y: 0 }, t));
  assert.equal(s.ecus, ecus);
  assert.equal(stockN(qg, "poterie"), 0);
  assert.ok(s.caravanes[0].cout > 0 && s.caravanes[0].cout < paye);
  assert.equal(poser(s, 0, { bien: "poterie", rot: 0, x: 0, y: 2 }, t), false, "plus en stock");
  reprendre(s, 0, 0);
  assert.equal(stockN(qg, "poterie"), 1, "reprise : retour au stock");
  assert.equal(s.ecus, ecus);
});

test("entrepôt plein : on dépose ce qui rentre, le reste reste chargé", () => {
  const s = etatAvecQG();
  s.charrette = 2; // 4 × 4
  s.qg!.stock.laine = { n: ENTREPOTS[0].cases - 5, cout: 1 };
  livrerAuQG(s, "terracuite", [
    { bien: "poterie", rot: 0, x: 0, y: 0 },
    { bien: "poterie", rot: 0, x: 0, y: 2 },
  ]);
  assert.equal(deposer(s, 0), 1);
  assert.equal(casesQG(s.qg!), capaciteQG(s.qg!) - 1);
  const c = s.caravanes[0];
  assert.equal(c.cargaison.length, 1);
  assert.ok(!c.aVendre, "prête à repartir avec le reste");
  assert.ok(c.cout > 0);
});

test("fabrication en temps réel : ingrédients consommés, produit au stock à la fin", () => {
  const s = etatAvecQG();
  const qg = s.qg!;
  Object.assign(qg.stock, { poisson: { n: 2, cout: 10 }, sel: { n: 1, cout: 2 }, poterie: { n: 1, cout: 12 } });
  const r = RECETTE_PAR_PRODUIT.salaisons!;
  assert.ok(fabriquer(s, 0, "salaisons", 1000));
  assert.equal(stockN(qg, "poisson"), 0);
  assert.equal(casesQG(qg), 4, "place réservée pour le produit");
  assert.equal(fabriquer(s, 0, "salaisons", 1000), false, "emplacement occupé");
  avancer(s, 1000 + r.duree - 1);
  assert.equal(stockN(qg, "salaisons"), 0, "rien d'instantané");
  const bilan = avancer(s, 1000 + r.duree);
  assert.equal(bilan.fabrications, 1);
  assert.equal(stockN(qg, "salaisons"), 1);
  assert.equal(qg.stock.salaisons!.cout, 24, "le produit coûte ses ingrédients");
  assert.equal(qg.emplacements[0], null, "pas de relance sans Compagnon");
  assert.equal(qg.pretes, 1);
});

test("Compagnon : l'atelier relance la recette tant qu'il a les ingrédients, même hors ligne", () => {
  const s = etatAvecQG();
  s.reputation = seuilNiveau(18);
  assert.ok(apprendre(s, "intendant"));
  assert.ok(apprendre(s, "compagnon"));
  const qg = s.qg!;
  Object.assign(qg.stock, { poisson: { n: 6, cout: 30 }, sel: { n: 3, cout: 6 }, poterie: { n: 3, cout: 36 } });
  fabriquer(s, 0, "salaisons", 0);
  const bilan = avancer(s, 10 * RECETTE_PAR_PRODUIT.salaisons!.duree);
  assert.equal(bilan.fabrications, 3);
  assert.equal(stockN(qg, "salaisons"), 3);
  assert.equal(qg.emplacements[0], null);
});

test("les compétences du QG demandent le QG", () => {
  const s = nouvelEtat(0);
  s.reputation = seuilNiveau(18);
  assert.equal(apprendre(s, "intendant"), false);
  s.villes = VILLES.map((v) => v.id);
  s.ecus = 1e6;
  acheterQG(s);
  assert.ok(apprendre(s, "intendant"));
});

test("sans Intendant, le caravanier ne fait pas la navette avec le QG", () => {
  const s = etatAvecQG();
  embaucherCaravanier(s, 0);
  s.caravanes[0].ville = "terracuite";
  remplirAuto(s, 0, "qg", 0);
  assert.ok(s.caravanes[0].cargaison.length > 0);
  partir(s, 0, "qg", 0, true);
  avancer(s, duree(s, "terracuite", "qg"));
  assert.ok(s.caravanes[0].aVendre, "arrivée à décharger à la main");
});

test("Intendant : la navette n'apporte que la liste, jusqu'au stock visé, puis attend", () => {
  const s = avecIntendant();
  regler(s, "appro", "olives", 6);
  regler(s, "appro", "poisson", 4); // pas produit à Terracuite : sans effet sur ce trajet
  assert.deepEqual(quotaAppro(s, "terracuite"), { olives: 6 });
  s.caravanes[0].ville = "terracuite";
  partir(s, 0, "qg", 0, true); // départ à vide, le caravanier prend la suite
  const aller = duree(s, "terracuite", "qg");
  avancer(s, 12 * aller);
  const qg = s.qg!;
  assert.equal(stockN(qg, "olives"), 6, "stock visé atteint, pas plus");
  assert.equal(stockN(qg, "ble"), 0, "rien hors de la liste");
  assert.equal(stockN(qg, "poterie"), 0);
  const c = s.caravanes[0];
  assert.ok(!c.trajet && c.attente != null, "il attend au lieu de rouler à vide");
  // on vide le stock : il repart à la tentative suivante
  delete qg.stock.olives;
  avancer(s, c.attente! + ATTENTE_CARAVANIER + 3 * aller);
  assert.ok(stockN(qg, "olives") > 0);
});

test("Intendant : la navette écoule les produits cochés, en gardant le minimum", () => {
  const s = avecIntendant();
  s.charrette = 2; // 4 × 4 : de la place pour plusieurs jarres
  const qg = s.qg!;
  qg.stock.salaisons = { n: 3, cout: 60 };
  qg.stock.robe = { n: 2, cout: 400 };
  regler(s, "ecoulement", "salaisons", 1);
  assert.deepEqual(quotaEcoulement(s), { salaisons: 2 });
  s.caravanes[0].ville = "lainebourg";
  partir(s, 0, "qg", 0, true);
  const aller = duree(s, "lainebourg", "qg");
  const avant = s.ecus;
  const bilan = avancer(s, 2 * aller + 1);
  assert.equal(stockN(qg, "salaisons"), 1);
  assert.equal(stockN(qg, "robe"), 2, "pas cochée : gardée pour la marchander soi-même");
  assert.ok(bilan.gain > 0 && s.ecus > avant, "vendues à Lainebourg, qui les réclame");
});

test("un trajet qui ne touche pas le QG ne change pas", () => {
  const s = etatAvecQG();
  embaucherCaravanier(s, 0);
  remplirAuto(s, 0, "terracuite", 0);
  partir(s, 0, "terracuite", 0);
  const bilan = avancer(s, 4 * dureeTrajet("portvent", "terracuite", 0) + 1);
  assert.equal(bilan.voyages, 4);
  assert.equal(bilan.depots, 0);
});
