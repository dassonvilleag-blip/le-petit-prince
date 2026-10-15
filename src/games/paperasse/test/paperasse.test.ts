import { test } from "node:test";
import assert from "node:assert/strict";
import { FEUILLES_PAR_RAMETTE, PROJETS, PROJET_PAR_ID, REGIONS, UNITE_PAR_ID, USAGERS } from "../data.ts";
import { coutUnite, formatDelai, formatNombre, mods, renonciation, seuilGalon, usagersParSec } from "../eco.ts";
import {
  acheterProjet,
  acheterUnite,
  changerTimbre,
  decisionGreve,
  nouvelEtat,
  ouvrirRegion,
  partirALaRetraite,
  rattraper,
  reparer,
  repondreGuichet,
  setRandom,
  tamponner,
  tick,
} from "../state.ts";
import { jouer } from "./sim.ts";

setRandom(() => 0.5);

test("formatNombre : espaces, puis échelle longue", () => {
  assert.equal(formatNombre(0), "0");
  assert.equal(formatNombre(1284.7), "1 284");
  assert.equal(formatNombre(999_999), "999 999");
  assert.equal(formatNombre(1_500_000), "1,5 million");
  assert.equal(formatNombre(2e6), "2 millions");
  assert.equal(formatNombre(3.4e9), "3,4 milliards");
  assert.equal(formatNombre(1e12), "1 billion");
  assert.equal(formatNombre(12e15), "12 billiards");
  assert.equal(formatNombre(3e54), "3 nonillions");
});

test("formatDelai : en jours, puis en années", () => {
  assert.equal(formatDelai(0), "immédiat");
  assert.equal(formatDelai(1), "1 jour");
  assert.equal(formatDelai(12), "12 jours");
  assert.equal(formatDelai(730), "2 ans");
  assert.equal(formatDelai(Infinity), "indéterminé");
});

test("les galons tombent à 1, 2, 3, 5, 8… × 1 000 dossiers", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(seuilGalon), [1000, 2000, 3000, 5000, 8000, 13000]);
});

test("un timbre plus cher fait venir moins d'usagers", () => {
  const e = nouvelEtat(0);
  const m = mods(e);
  const avant = usagersParSec(e, m);
  changerTimbre(e, 1);
  assert.ok(usagersParSec(e, m) < avant);
});

test("le pas du timbre suit l'ordre de grandeur", () => {
  const e = nouvelEtat(0);
  e.timbre = 0.95;
  changerTimbre(e, 1);
  assert.equal(e.timbre, 1);
  changerTimbre(e, 1);
  assert.equal(e.timbre, 1.1);
  changerTimbre(e, -1);
  changerTimbre(e, -1);
  assert.equal(e.timbre, 0.95);
  e.timbre = 3900;
  changerTimbre(e, 1);
  assert.equal(e.timbre, 4000);
  e.timbre = 0.05;
  changerTimbre(e, -1);
  assert.equal(e.timbre, 0.05);
});

test("les usagers remplissent la pile, le tampon la vide", () => {
  const e = nouvelEtat(0);
  tick(e, 10);
  assert.ok(e.pile > 0);
  const pile = e.pile;
  assert.equal(tamponner(e), 1);
  assert.equal(e.pile, pile - 1);
  assert.equal(e.dossiers, 1);
  assert.ok(e.budget > 0);
});

test("à la main, le tampon ne consomme pas de papier", () => {
  const e = nouvelEtat(0);
  e.pile = 5;
  tamponner(e);
  assert.equal(e.feuilles, FEUILLES_PAR_RAMETTE);
});

test("à la main, on tamponne même sans papier", () => {
  const e = nouvelEtat(0);
  e.feuilles = 0;
  e.pile = 5;
  assert.equal(tamponner(e), 1);
  assert.equal(e.feuilles, 0);
});

test("sans papier, les agents s'arrêtent", () => {
  const e = nouvelEtat(0);
  e.unites.stagiaire = 10;
  e.feuilles = 0;
  e.pile = 100;
  tick(e, 1);
  assert.equal(e.dossiers, 0);
});

test("acheter une unité coûte son prix et augmente le débit", () => {
  const e = nouvelEtat(0);
  e.budget = 100;
  const prix = coutUnite(UNITE_PAR_ID.stagiaire, 0);
  assert.ok(acheterUnite(e, "stagiaire"));
  assert.equal(e.unites.stagiaire, 1);
  assert.ok(Math.abs(e.budget - (100 - prix)) < 1e-9);
  assert.equal(acheterUnite(e, "tampon"), false, "le tampon automatique attend son projet");
});

test("la renonciation démarre au-delà de la patience et plafonne à 100 %", () => {
  assert.equal(renonciation(10, 30), 0);
  assert.equal(renonciation(30, 30), 0);
  assert.equal(renonciation(60, 30), 0.5);
  assert.equal(renonciation(1e9, 30), 1);
});

test("sans aucun agent, la file ne décourage pas tout le monde", () => {
  const e = nouvelEtat(0);
  tick(e, 20);
  assert.ok(e.flux.deposes > 0);
});

test("le concours interne fait passer en phase 2", () => {
  const e = nouvelEtat(0);
  e.dossiers = 100_000;
  e.notes = 1e6;
  assert.ok(acheterProjet(e, "concours-interne"));
  assert.equal(e.phase, 2);
  assert.equal(e.tPhases[1], e.t);
});

test("un projet invisible ou trop cher ne s'achète pas", () => {
  const e = nouvelEtat(0);
  assert.equal(acheterProjet(e, "concours-interne"), false);
  e.dossiers = 100_000;
  assert.equal(acheterProjet(e, "concours-interne"), false);
});

test("chaque projet a un texte, un journal et un prix", () => {
  const ids = new Set<string>();
  for (const p of PROJETS) {
    assert.ok(!ids.has(p.id), `doublon ${p.id}`);
    ids.add(p.id);
    assert.ok(p.nom && p.texte && p.journal, p.id);
    assert.ok((p.notes ?? 0) + (p.budget ?? 0) > 0, `${p.id} est gratuit`);
  }
});

test("chaque usager du Guichet a trois réponses", () => {
  for (const u of USAGERS) assert.equal(u.reponses.length, 3, u.id);
});

test("répondre au Guichet applique l'effet et libère le guichet", () => {
  const e = nouvelEtat(0);
  e.phase = 2;
  e.guichet = { id: "durand", fin: 100 };
  repondreGuichet(e, 1); // +25 % du plafond de notes
  assert.equal(e.guichet, null);
  assert.equal(e.notes, 250);
});

test("l'usager repart si on ne répond pas", () => {
  const e = nouvelEtat(0);
  e.phase = 2;
  e.guichet = { id: "durand", fin: 5 };
  tick(e, 6);
  assert.equal(e.guichet, null);
});

test("ouvrir une région coûte et augmente la demande", () => {
  const e = nouvelEtat(0);
  e.phase = 3;
  e.budget = 1e9;
  const avant = usagersParSec(e, mods(e));
  assert.ok(ouvrirRegion(e, "idf"));
  assert.ok(usagersParSec(e, mods(e)) > avant * 4);
  assert.equal(ouvrirRegion(e, "idf"), false, "déjà ouverte");
  assert.equal(REGIONS.length, 13);
});

test("la grogne à 100 % déclenche la grève, qui bloque la production", () => {
  const e = nouvelEtat(0);
  e.phase = 3;
  e.unites.agent = 10;
  e.feuilles = 1e9;
  e.pile = 1e6;
  e.grogne = 99.9;
  e.cerfas = Array(20).fill("x");
  tick(e, 1);
  assert.equal(e.greve, true);
  const d = e.dossiers;
  tick(e, 5);
  assert.equal(e.dossiers, d);
  assert.ok(decisionGreve(e, "requisitionner"));
  assert.equal(e.greve, false);
  assert.equal(e.grogne, 70);
});

test("attendre la fin de la grève prend deux minutes", () => {
  const e = nouvelEtat(0);
  e.phase = 3;
  e.greve = true;
  e.grogne = 100;
  decisionGreve(e, "attendre");
  tick(e, 60);
  assert.equal(e.greve, true);
  tick(e, 61);
  assert.equal(e.greve, false);
});

test("hors ligne : plafonné à 8 h, jamais de grève", () => {
  const e = nouvelEtat(0);
  e.phase = 3;
  e.unites.agent = 5;
  e.cerfas = Array(30).fill("x");
  e.feuilles = 1e9;
  const r = rattraper(e, 24 * 3600);
  assert.equal(r.duree, 8 * 3600);
  assert.equal(e.greve, false);
  assert.ok(e.grogne <= 90);
  assert.ok(r.dossiers > 0);
});

test("la commande groupée rachète le papier toute seule", () => {
  const e = nouvelEtat(0);
  e.unites.stagiaire = 20;
  e.dossiers = 5000;
  e.notes = 1e6;
  e.budget = 1e6;
  acheterProjet(e, "commande-groupee");
  e.feuilles = 0;
  e.pile = 1000;
  tick(e, 1);
  assert.ok(e.feuilles > 0);
  assert.ok(e.ramettesAchetees > 0);
  void FEUILLES_PAR_RAMETTE;
});

test("la retraite clôt la partie", () => {
  const e = nouvelEtat(0);
  assert.equal(partirALaRetraite(e), false);
  e.retraite = true;
  assert.ok(partirALaRetraite(e));
  assert.equal(e.fin, true);
});

test("une sauvegarde incomplète est réparée", () => {
  const e = nouvelEtat(0);
  const brut = JSON.parse(JSON.stringify(e));
  delete brut.unites.ia;
  delete brut.usagersVus;
  const r = reparer(brut)!;
  assert.equal(r.unites.ia, 0);
  assert.deepEqual(r.usagersVus, []);
  assert.equal(reparer({ v: 2 } as never), null);
});

test("les projets de passage existent", () => {
  for (const id of ["concours-interne", "concours-prefet", "remaniement", "prefecture-lune", "univers"]) {
    assert.ok(PROJET_PAR_ID[id], id);
  }
});

test("le joueur simulé finit la partie entre 2 h 30 et 5 h", () => {
  for (const graine of [1, 42]) {
    const r = jouer({ graine });
    assert.ok(r.fini, `graine ${graine} : pas fini (${r.log.join(", ")})`);
    assert.ok(r.total > 2.5 * 3600 && r.total < 5 * 3600, `graine ${graine} : ${Math.round(r.total / 60)} min`);
    for (const [i, d] of r.phases.entries()) assert.ok(d > 20 * 60 && d < 90 * 60, `phase ${i + 1} : ${Math.round(d / 60)} min`);
  }
});
