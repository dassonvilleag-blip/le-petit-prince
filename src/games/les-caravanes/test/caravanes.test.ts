import { test } from "node:test";
import assert from "node:assert/strict";
import { BIENS, BIEN_PAR_ID, CARACTERES, COEF_ACHAT, COEF_NEUTRE, AMPLITUDE_COURS, FORMES, VILLES } from "../data.ts";
import {
  casesPiece,
  chargementAuto,
  cours,
  dureeTrajet,
  formatDuree,
  formatNombre,
  occupation,
  peutPlacer,
  prixAchat,
  prixVente,
  rejouerGabarit,
  rotationsUtiles,
  tourner,
  type Piece,
} from "../eco.ts";
import { accepterContreOffre, complimenter, montantFinal, ouvrir, proposer } from "../marchandage.ts";
import {
  avancer,
  embaucherCaravanier,
  encaisser,
  nouvelEtat,
  partir,
  poser,
  reprendre,
  remplirAuto,
} from "../state.ts";

// ---- formes ----

test("quatre quarts de tour ramènent la forme d'origine", () => {
  for (const b of BIENS) assert.deepEqual(tourner(b.forme, 4), tourner(b.forme, 0));
});

test("un quart de tour couche la barre", () => {
  assert.deepEqual(tourner(FORMES.i3, 1), [
    [0, 0],
    [0, 1],
    [0, 2],
  ]);
});

test("rotations utiles : 1 pour le carré, 2 pour la barre, 4 pour le T", () => {
  assert.equal(rotationsUtiles(FORMES.o4).length, 1);
  assert.equal(rotationsUtiles(FORMES.i3).length, 2);
  assert.equal(rotationsUtiles(FORMES.t4).length, 4);
});

test("placement : refusé hors grille ou sur une case prise", () => {
  const pieces: Piece[] = [{ bien: "poterie", rot: 0, x: 0, y: 0 }];
  assert.equal(peutPlacer(3, 3, pieces, { bien: "sel", rot: 0, x: 1, y: 1 }), false);
  assert.equal(peutPlacer(3, 3, pieces, { bien: "sel", rot: 0, x: 2, y: 2 }), true);
  assert.equal(peutPlacer(3, 3, pieces, { bien: "ble", rot: 0, x: 1, y: 2 }), false);
  assert.equal(peutPlacer(3, 3, pieces, { bien: "ble", rot: 1, x: 2, y: 0 }), true);
});

// ---- prix ----

test("les cours restent dans ±AMPLITUDE", () => {
  for (const v of VILLES)
    for (const b of BIENS)
      for (let t = 0; t < 1e8; t += 7_777_777) {
        const c = cours(v.id, b.id, t);
        assert.ok(c >= 1 - AMPLITUDE_COURS - 1e-9 && c <= 1 + AMPLITUDE_COURS + 1e-9);
      }
});

test("revendre ailleurs que chez le producteur rapporte toujours, même au pire des cours", () => {
  const pire = (COEF_NEUTRE * (1 - AMPLITUDE_COURS)) / (COEF_ACHAT * (1 + AMPLITUDE_COURS));
  assert.ok(pire > 1);
});

test("chaque bien est produit par une ville et réclamé par au moins une autre", () => {
  for (const b of BIENS) {
    assert.equal(VILLES.filter((v) => v.produit.includes(b.id)).length, 1, b.id);
    assert.ok(VILLES.some((v) => v.demande.includes(b.id)), `${b.id} n'est réclamé nulle part`);
  }
});

test("on n'achète que chez le producteur", () => {
  assert.equal(prixAchat("portvent", "ble", 0), null);
  assert.ok(prixAchat("portvent", "sel", 0)! > 0);
  assert.ok(prixVente("terracuite", "sel", 0) > prixVente("lainebourg", "sel", 0));
});

// ---- trajets ----

test("premier trajet court, grands voyages longs, et l'attelage accélère", () => {
  const premier = dureeTrajet("portvent", "terracuite", 0);
  assert.ok(premier > 60_000 && premier < 120_000, `${premier} ms`);
  assert.ok(dureeTrajet("portvent", "mirazur", 0) > 30 * 60_000);
  assert.ok(dureeTrajet("portvent", "terracuite", 2) < premier);
});

// ---- chargement auto ----

test("le chargement auto ne chevauche rien, reste dans la grille et le budget", () => {
  for (const [l, h] of [
    [3, 3],
    [4, 4],
    [6, 5],
  ]) {
    const pieces = chargementAuto(l, h, "terracuite", "portvent", 0, 1e9);
    const cases = pieces.flatMap(casesPiece);
    assert.equal(occupation(pieces).size, cases.length, "chevauchement");
    assert.ok(cases.every(([x, y]) => x >= 0 && y >= 0 && x < l && y < h));
    assert.ok(cases.length >= l * h - 2, `trop de trous : ${cases.length}/${l * h}`);
  }
  const radin = chargementAuto(4, 4, "portvent", "terracuite", 0, 10);
  const cout = radin.reduce((s, p) => s + prixAchat("portvent", p.bien, 0)!, 0);
  assert.ok(cout <= 10);
});

test("rejouer un gabarit saute ce qu'on ne peut plus se payer", () => {
  const gabarit: Piece[] = [
    { bien: "poisson", rot: 0, x: 0, y: 0 },
    { bien: "poisson", rot: 0, x: 0, y: 1 },
  ];
  const un = prixAchat("portvent", "poisson", 0)!;
  assert.equal(rejouerGabarit(gabarit, 3, 3, "portvent", 0, un * 1.5).length, 1);
  assert.equal(rejouerGabarit(gabarit, 3, 3, "portvent", 0, un * 3).length, 2);
});

// ---- marchandage ----

const alea = (v: number) => () => v;

test("une demande sous la marge secrète est acceptée telle quelle", () => {
  const n = ouvrir("patient", 100, alea(0.5));
  assert.equal(proposer(n, 0.1), "accepte");
  assert.ok(Math.abs(montantFinal(n) - 110) < 1e-9);
});

test("refus : contre-offre croissante, puis porte claquée quand la patience est à bout", () => {
  const n = ouvrir("pressee", 100, alea(0));
  assert.equal(n.marge, CARACTERES.pressee.margeMin);
  assert.equal(proposer(n, 0.6), "insulte");
  assert.ok(n.contreOffre > 0 && n.contreOffre < n.marge);
  assert.equal(proposer(n, 0.6), "fache");
  assert.ok(Math.abs(montantFinal(n) - 90) < 1e-9);
});

test("accepter la contre-offre est sans risque", () => {
  const n = ouvrir("patient", 200, alea(1));
  proposer(n, 0.5);
  proposer(n, 0.5);
  const offre = n.contreOffre;
  accepterContreOffre(n);
  assert.ok(Math.abs(montantFinal(n) - 200 * (1 + offre)) < 1e-9);
  assert.ok(offre > 0);
});

test("compliment : ravit la flatteuse, agace la pressée, une seule fois", () => {
  const f = ouvrir("flatteuse", 100, alea(0));
  const avant = f.marge;
  complimenter(f);
  assert.ok(f.marge > avant);
  assert.equal(complimenter(f), "");
  const p = ouvrir("pressee", 100, alea(0));
  proposer(p, 0.9);
  complimenter(p);
  assert.ok(p.fin?.fache);
});

// ---- partie ----

test("poser puis reprendre une pièce rembourse au centime", () => {
  const s = nouvelEtat(0);
  const depart = s.ecus;
  assert.ok(poser(s, 0, { bien: "poisson", rot: 0, x: 0, y: 0 }, 0));
  assert.ok(s.ecus < depart);
  assert.equal(poser(s, 0, { bien: "sel", rot: 0, x: 1, y: 0 }, 0), false, "case prise");
  reprendre(s, 0, 0);
  assert.equal(s.ecus, depart);
  assert.equal(s.caravanes[0].cout, 0);
});

test("un voyage manuel : départ, arrivée, vente avec bénéfice", () => {
  const s = nouvelEtat(0);
  remplirAuto(s, 0, "terracuite", 0);
  const cout = s.caravanes[0].cout;
  assert.ok(cout > 0 && s.ecus >= 0);
  assert.ok(partir(s, 0, "terracuite", 0));
  assert.deepEqual(Object.keys(s.caravanes[0].gabarits), ["portvent"]);
  avancer(s, 10_000);
  assert.equal(s.caravanes[0].aVendre, false, "pas encore arrivée");
  avancer(s, dureeTrajet("portvent", "terracuite", 0));
  const c = s.caravanes[0];
  assert.ok(c.aVendre && c.ville === "terracuite");
  const benefice = encaisser(s, 0, 1000);
  assert.equal(benefice, 1000 - cout);
  assert.equal(c.cargaison.length, 0);
});

test("hors ligne, un caravanier fait la navette et s'enrichit", () => {
  const s = nouvelEtat(0);
  s.ecus = 1000;
  assert.ok(embaucherCaravanier(s, 0));
  remplirAuto(s, 0, "terracuite", 0);
  partir(s, 0, "terracuite", 0);
  const avant = s.ecus;
  const aller = dureeTrajet("portvent", "terracuite", 0);
  const bilan = avancer(s, 10 * aller + 1);
  assert.equal(bilan.voyages, 10);
  assert.ok(s.ecus > avant + 10 * 20, `${s.ecus} vs ${avant}`);
  assert.ok(s.caravanes[0].trajet, "toujours en route");
  assert.equal(s.caravanes[0].ville, "terracuite", "10e arrivée à Portvent, repartie vers Terracuite");
  assert.ok(Object.keys(s.caravanes[0].gabarits).length >= 1);
  assert.ok(s.ecus >= 0);
});

test("la forme d'un bien compte autant de cases que son nom le promet", () => {
  assert.equal(BIEN_PAR_ID.epices.forme.length, 4);
  assert.equal(BIEN_PAR_ID.sel.forme.length, 1);
});

// ---- mise en forme ----

test("formatNombre et formatDuree", () => {
  assert.equal(formatNombre(4.25), "4,2");
  assert.equal(formatNombre(12), "12");
  assert.equal(formatNombre(123_456), "123 456");
  assert.equal(formatNombre(2_500_000), "2,50 M");
  assert.equal(formatDuree(88), "1:28");
  assert.equal(formatDuree(7300), "2 h 01");
});
