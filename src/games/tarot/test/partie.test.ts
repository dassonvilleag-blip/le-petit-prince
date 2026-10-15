import { test } from "node:test";
import assert from "node:assert/strict";
import { TOTAL_DEMI_POINTS, aleaGraine, demiPoints, type Alea } from "../cartes.ts";
import { annoncer, appeler, distribuer, faireEcart, jouer, annoncerPoignee, peutAnnoncerPoignee, type Donne } from "../donne.ts";
import { choisirAnnonce, choisirAppel, choisirCarte, choisirEcart, choisirPoignee, connaissance, type Niveau } from "../ia.ts";
import { echantillonner } from "../ia-mc.ts";

/** joue une donne entière avec un niveau par siège ; null si tout le monde passe */
function jouerDonne(n: number, niveaux: Niveau[], alea: Alea, donneur = 0): Donne | null {
  const d = distribuer(n, donneur, alea);
  while (d.phase === "encheres") {
    if (annoncer(d, d.tour, choisirAnnonce(d, d.tour, niveaux[d.tour], alea)) === "redonne") return null;
  }
  if (d.phase === "appel") appeler(d, choisirAppel(d, alea));
  if (d.phase === "ecart") faireEcart(d, choisirEcart(d));
  while (d.phase === "jeu") {
    const j = d.tour;
    if (peutAnnoncerPoignee(d, j)) {
      const t = choisirPoignee(d, j, niveaux[j], alea);
      if (t) annoncerPoignee(d, j, t);
    }
    jouer(d, j, choisirCarte(d, j, niveaux[j], alea));
  }
  return d;
}

function verifierDonne(d: Donne): void {
  const total = d.plis.flatMap((p) => p.cartes).concat(d.ecart);
  assert.equal(total.length, 78, "toutes les cartes sont passées");
  assert.equal(new Set(total).size, 78, "aucune carte en double");
  assert.equal(total.reduce((s, c) => s + demiPoints(c), 0), TOTAL_DEMI_POINTS);
  const dc = d.decompte!;
  assert.ok(dc.demiPointsAttaque >= 0 && dc.demiPointsAttaque <= TOTAL_DEMI_POINTS + 2);
  assert.equal(dc.scores.reduce((a, b) => a + b, 0), 0, "les scores s'équilibrent");
}

for (const n of [4, 5]) {
  for (const niveau of ["facile", "moyen"] as Niveau[]) {
    test(`${n} joueurs, IA ${niveau} : 150 donnes complètes et cohérentes`, () => {
      const alea = aleaGraine(n * 100 + niveau.length);
      let jouees = 0;
      for (let i = 0; i < 150; i++) {
        const d = jouerDonne(n, new Array(n).fill(niveau), alea, i % n);
        if (!d) continue;
        verifierDonne(d);
        jouees++;
      }
      assert.ok(jouees > 60, `assez de donnes prises (${jouees})`);
    });
  }
}

test("difficile : quelques donnes complètes, à 4 et à 5", () => {
  const alea = aleaGraine(7);
  for (const n of [4, 5]) {
    let faites = 0;
    for (let i = 0; faites < 2 && i < 30; i++) {
      const d = jouerDonne(n, ["difficile", "moyen", "difficile", "moyen", "difficile"].slice(0, n) as Niveau[], alea, i % n);
      if (!d) continue;
      verifierDonne(d);
      faites++;
    }
    assert.equal(faites, 2);
  }
});

test("les tirages Monte-Carlo respectent ce que l'on sait", () => {
  const alea = aleaGraine(42);
  for (let i = 0; i < 40; i++) {
    const d = distribuer(4, 0, alea);
    while (d.phase === "encheres") if (annoncer(d, d.tour, choisirAnnonce(d, d.tour, "moyen", alea)) === "redonne") break;
    if (d.phase !== "ecart" && d.phase !== "jeu") continue;
    if (d.phase === "ecart") faireEcart(d, choisirEcart(d));
    // avancer d'une dizaine de cartes
    for (let k = 0; k < 10 && d.phase === "jeu"; k++) jouer(d, d.tour, choisirCarte(d, d.tour, "moyen", alea));
    const moi = d.tour;
    const k = connaissance(d, moi);
    const t = echantillonner(d, k, alea);
    if (!t) continue;
    for (let j = 0; j < 4; j++) {
      assert.equal(t.mains[j].length, d.mains[j].length, "tailles de main respectées");
      if (j === moi) continue;
      for (const c of t.mains[j]) {
        const coul = c < 56 ? Math.floor(c / 14) : c < 77 ? 4 : -1;
        if (coul >= 0) assert.ok(!k.vides[j][coul], "pas de carte dans une couleur où il est vide");
      }
    }
    assert.equal(t.ecart.length, d.ecart.length);
    const toutes = [...t.mains.flat(), ...t.ecart, ...k.jouees];
    assert.equal(new Set(toutes).size, 78);
  }
});
