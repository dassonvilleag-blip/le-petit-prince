import { test } from "node:test";
import assert from "node:assert/strict";
import { Vie } from "../vie/moteur.ts";
import { CONTENU } from "../vie/contenu/index.ts";
import { validerContenu } from "../vie/valider.ts";
import { rendre, deLieu, aLieu } from "../vie/texte.ts";
import { titreDeFin, volontesProduites } from "../vie/fin.ts";

function vivreJusquauBout(graine: number): Vie {
  const vie = new Vie({ graine, contenu: CONTENU });
  let garde = 0;
  while (vie.etat.vivant && garde++ < 400) vie.avancerAuto();
  return vie;
}

test("Vivre Card : le contenu ne contient aucune erreur", () => {
  const { erreurs } = validerContenu(CONTENU);
  assert.deepEqual(erreurs, []);
});

test("Vivre Card : une même graine rejoue exactement la même vie", () => {
  const a = vivreJusquauBout(1234);
  const b = vivreJusquauBout(1234);
  assert.deepEqual(a.etat.journal, b.etat.journal);
  assert.equal(a.etat.mort?.texte, b.etat.mort?.texte);
});

test("Vivre Card : 300 vies vont jusqu'au bout sans erreur, avec des jauges bornées", () => {
  let ages = 0;
  for (let g = 1; g <= 300; g++) {
    const vie = vivreJusquauBout(g * 104729);
    const v = vie.etat;
    assert.equal(v.vivant, false, `la vie ${g} ne finit pas`);
    assert.ok(v.mort, `la vie ${g} n'a pas de mort`);
    for (const j of Object.values(v.jauges)) assert.ok(j >= 0 && j <= 100);
    assert.ok(v.prime >= 0);
    assert.ok(titreDeFin(vie).length > 0);
    volontesProduites(vie);
    ages += v.age;
  }
  const moyenne = ages / 300;
  assert.ok(moyenne > 35 && moyenne < 80, `âge moyen improbable : ${moyenne}`);
});

test("Vivre Card : les quatre jumeaux naissent la même année et vivent leur vie", () => {
  const vie = vivreJusquauBout(42);
  assert.equal(vie.jumeaux.length, 4);
  for (const j of vie.jumeaux) {
    assert.equal(j.etat.anneeNaissance, vie.etat.anneeNaissance);
    assert.equal(j.etat.monde, vie.etat.monde);
    assert.ok(j.etat.age > 0 || !j.etat.vivant);
  }
});

test("Vivre Card : gabarits, accords et prépositions de lieu", () => {
  const vie = new Vie({ graine: 7, contenu: CONTENU });
  const v = vie.etat;
  v.sexe = "f";
  v.prenom = "Lina";
  assert.equal(rendre("{prenom} est {né/née} {aIle}.", { ...v, nomIle: "le village de Syrup" }), "Lina est née au village de Syrup.");
  assert.equal(deLieu("Ohara"), "d'Ohara");
  assert.equal(deLieu("le royaume de Drum"), "du royaume de Drum");
  assert.equal(aLieu("l'île de Kalmo"), "à l'île de Kalmo");
  // Une valeur insérée n'est jamais relue comme un gabarit.
  assert.equal(rendre("{prenom}", { ...v, prenom: "{age}" }), "{age}");
});
