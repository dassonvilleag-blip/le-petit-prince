import { test } from "node:test";
import assert from "node:assert/strict";
import { ARRIVEE_MS, COMMERCES, COMMERCE_PAR_ID, PLACES_APPART, coutEtage } from "../data.ts";
import {
  avancer,
  capacite,
  commander,
  construire,
  embaucher,
  employes,
  finirChantier,
  finirLivraison,
  monterVisiteur,
  nouvelEtat,
  prixUnitaire,
  residents,
  type Rng,
} from "../sim.ts";

// générateur déterministe pour des tests reproductibles
function rngFixe(seed = 42): Rng {
  let x = seed;
  return () => {
    x = (x * 1664525 + 1013904223) % 2 ** 32;
    return x / 2 ** 32;
  };
}

const snack = COMMERCE_PAR_ID.snack;

function partieAvecEmployes(n: number) {
  const s = nouvelEtat(0, rngFixe());
  for (const h of s.habitants.slice(0, n)) assert.ok(embaucher(s, h.id, 1, 0));
  return s;
}

test("départ : un appartement de 2 habitants et un Snack vide", () => {
  const s = nouvelEtat(0, rngFixe());
  assert.equal(s.habitants.length, 2);
  assert.equal(s.etages[1].type, "snack");
  assert.equal(capacite(s), PLACES_APPART);
});

test("commander exige autant d'employés que le rang du produit", () => {
  const s = partieAvecEmployes(1);
  assert.ok(commander(s, 1, 0, 0));
  assert.ok(!commander(s, 1, 1, 0), "le 2e produit demande 2 employés");
  assert.equal(s.argent, 1500 - snack.produits[0].cout);
});

test("un stock livré se vend en entier puis se vide", () => {
  const s = partieAvecEmployes(1);
  commander(s, 1, 0, 0);
  const p = snack.produits[0];
  const livre = p.livraison * 1000;
  avancer(s, livre - 1, rngFixe());
  assert.equal(s.etages[1].produits[0].etat, "livraison");
  const argentAvant = s.argent;
  const bilan = avancer(s, livre + p.dureeVente * 1000 + 1, rngFixe());
  assert.equal(s.etages[1].produits[0].etat, "vide");
  assert.equal(bilan.ventes, p.quantite * prixUnitaire(s, 1, p));
  assert.equal(s.argent, argentAvant + bilan.ventes);
});

test("la vente est progressive", () => {
  const s = partieAvecEmployes(1);
  commander(s, 1, 0, 0);
  const p = snack.produits[0];
  avancer(s, p.livraison * 1000 + (p.dureeVente * 1000) / 2, rngFixe());
  assert.equal(s.etages[1].produits[0].vendus, p.quantite / 2);
});

test("chaque produit rapporte plus qu'il ne coûte, même sans bonus", () => {
  for (const c of COMMERCES)
    for (const p of c.produits) assert.ok(p.quantite * p.prix > p.cout * 1.5, `${c.id} / ${p.nom}`);
});

test("les employés compétents font monter les prix", () => {
  const s = partieAvecEmployes(0);
  const base = prixUnitaire(s, 1, snack.produits[2]);
  s.habitants[0].competences.bouffe = 9;
  embaucher(s, s.habitants[0].id, 1, 0);
  assert.ok(prixUnitaire(s, 1, snack.produits[2]) > base);
});

test("le métier de rêve rapporte un ticket, une seule fois", () => {
  const s = nouvelEtat(0, rngFixe());
  const h = s.habitants[0];
  h.reve = "snack";
  const t = s.tickets;
  embaucher(s, h.id, 1, 0);
  assert.equal(s.tickets, t + 1);
  h.travail = null;
  embaucher(s, h.id, 1, 0);
  assert.equal(s.tickets, t + 1);
});

test("pas plus de 3 employés par commerce", () => {
  const s = nouvelEtat(0, rngFixe());
  s.etages.push({ type: "appartement", chantierFin: null, produits: [] });
  for (let i = 0; i < 3; i++) avancer(s, ARRIVEE_MS * (i + 1), rngFixe(i));
  const ids = s.habitants.map((h) => h.id);
  assert.ok(ids.length >= 4);
  ids.forEach((id) => embaucher(s, id, 1, 0));
  assert.equal(employes(s, 1).length, 3);
});

test("construire un étage : coût, chantier, emménagement et ticket", () => {
  const s = nouvelEtat(0, rngFixe());
  s.argent = 1e6;
  const cout = coutEtage(3);
  assert.ok(construire(s, "appartement", 0));
  assert.equal(s.argent, 1e6 - cout);
  assert.ok(!construire(s, "appartement", 0), "un seul chantier à la fois");
  const t = s.tickets;
  const n = s.habitants.length;
  avancer(s, s.etages[2].chantierFin!, rngFixe());
  assert.equal(s.etages[2].chantierFin, null);
  assert.equal(s.tickets, t + 1);
  assert.ok(s.habitants.length > n);
  assert.equal(capacite(s), 2 * PLACES_APPART);
});

test("un commerce est unique et débloqué selon la hauteur", () => {
  const s = nouvelEtat(0, rngFixe());
  s.argent = 1e9;
  assert.ok(!construire(s, "snack", 0), "déjà construit");
  assert.ok(!construire(s, "pizzeria", 0), "rang 4 pas encore débloqué");
  assert.ok(construire(s, "barbier", 0));
});

test("finir un chantier coûte des tickets", () => {
  const s = nouvelEtat(0, rngFixe());
  s.argent = 1e6;
  assert.ok(construire(s, "barbier", 0));
  s.tickets = 0;
  assert.ok(!finirChantier(s, 0));
  s.tickets = 10;
  assert.ok(finirChantier(s, 0));
  assert.ok(s.tickets < 10);
});

test("une livraison peut être finie avec un ticket", () => {
  const s = partieAvecEmployes(1);
  commander(s, 1, 0, 0);
  assert.ok(finirLivraison(s, 1, 0, 5));
  avancer(s, 5, rngFixe());
  assert.equal(s.etages[1].produits[0].etat, "vente");
});

test("les emménagements s'arrêtent quand les appartements sont pleins", () => {
  const s = nouvelEtat(0, rngFixe());
  avancer(s, ARRIVEE_MS * 50, rngFixe());
  assert.equal(residents(s, 0).length, PLACES_APPART);
  assert.equal(s.prochaineArrivee, null);
});

test("l'ascenseur : au plus 3 visiteurs, un pourboire par course", () => {
  const s = nouvelEtat(0, rngFixe());
  avancer(s, 3_600_000, rngFixe());
  assert.equal(s.visiteurs.length, 3);
  const avant = s.argent;
  const course = monterVisiteur(s, rngFixe());
  assert.ok(course && course.gain > 0);
  assert.equal(s.argent, avant + course!.gain);
  assert.equal(s.visiteurs.length, 2);
});

test("le prix des étages augmente toujours", () => {
  for (let n = 2; n < 80; n++) assert.ok(coutEtage(n + 1) > coutEtage(n), `étage ${n + 1}`);
});
