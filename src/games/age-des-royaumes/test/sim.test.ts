import { test } from "node:test";
import assert from "node:assert/strict";
import { DEPART } from "../data.ts";
import {
  ajouterNoeud,
  ajouterUnite,
  annulerFormation,
  attaquer,
  degats,
  SAUVAGE,
  explore,
  visible,
  avancerPartie,
  chemin,
  construire,
  fixerRalliement,
  former,
  franchissable,
  nouvellePartie,
  ordonner,
  partieVide,
  popActuelle,
  popMaxi,
  poser,
  peutFormer,
  supprimer,
  type Partie,
} from "../sim.ts";

const jouer = (p: Partie, secondes: number) => {
  for (let t = 0; t < secondes; t += 0.1) avancerPartie(p, 0.1);
};

test("le chemin contourne un mur sans passer dedans ni couper les coins", () => {
  const p = partieVide(10);
  for (let y = 0; y < 9; y++) ajouterNoeud(p, "arbre", 5, y);
  const c = chemin(p, { x: 1.5, y: 1.5 }, 8, 1, 1, 0);
  assert.ok(c);
  assert.deepEqual(c.at(-1), { x: 8.5, y: 1.5 });
  for (const pt of c) assert.ok(franchissable(p, Math.floor(pt.x), Math.floor(pt.y)));
  assert.ok(c.some((pt) => pt.y > 9), "passe par le trou en bas");
});

test("pas de chemin vers une zone fermée", () => {
  const p = partieVide(10);
  for (let y = 0; y < 10; y++) ajouterNoeud(p, "arbre", 5, y);
  assert.equal(chemin(p, { x: 1.5, y: 1.5 }, 8, 1, 1, 0), null);
});

test("un villageois coupe du bois et le rapporte à l'Hôtel de ville", () => {
  const p = partieVide(16);
  poser(p, "hotel", 2, 2, true);
  const arbre = ajouterNoeud(p, "arbre", 10, 3);
  const v = ajouterUnite(p, "villageois", 7.5, 3.5);
  ordonner(p, [v.id], 10, 3);
  jouer(p, 60);
  assert.ok(p.camps[0].stock.bois > DEPART.bois + 20, `bois ${p.camps[0].stock.bois}`);
  assert.ok(arbre.reste < 100);
});

test("construire paie, refuse le chevauchement, et une maison finie loge 5 de plus", () => {
  const p = partieVide(16);
  poser(p, "hotel", 2, 2, true);
  const v = ajouterUnite(p, "villageois", 8.5, 8.5);
  assert.equal(construire(p, "maison", 3, 3, [v.id]), null, "sur l'Hôtel de ville");
  const m = construire(p, "maison", 9, 9, [v.id]);
  assert.ok(m);
  assert.equal(p.camps[0].stock.bois, DEPART.bois - 25);
  assert.equal(popMaxi(p), 5);
  jouer(p, 20);
  assert.ok(m.fini);
  assert.equal(popMaxi(p), 10);
});

test("pas assez de bois, pas de bâtiment", () => {
  const p = partieVide(16);
  p.camps[0].stock.bois = 50;
  assert.equal(construire(p, "moulin", 5, 5, []), null);
  assert.equal(p.camps[0].stock.bois, 50);
});

test("la formation attend une place libre dans la population", () => {
  const p = partieVide(16);
  const h = poser(p, "hotel", 2, 2, true);
  for (let i = 0; i < 5; i++) ajouterUnite(p, "villageois", 10.5, 10.5);
  assert.ok(former(p, h.id, "villageois"));
  assert.equal(p.camps[0].stock.nourriture, DEPART.nourriture - 50);
  jouer(p, 30);
  assert.equal(popActuelle(p), 5);
  poser(p, "maison", 12, 12, true);
  jouer(p, 30);
  assert.equal(popActuelle(p), 6);
});

test("la carte de départ : un Hôtel de ville et 3 villageois par camp, de quoi récolter, l'adversaire atteignable", () => {
  const p = nouvellePartie(42);
  const hotels = [...p.batiments.values()].filter((b) => b.type === "hotel");
  assert.deepEqual(hotels.map((b) => b.camp), [0, 1]);
  assert.equal(popActuelle(p), 3);
  assert.equal(popActuelle(p, 1), 3);
  const natures = new Set([...p.noeuds.values()].map((n) => n.nature));
  assert.deepEqual([...natures].sort(), ["arbre", "baies", "or", "pierre"]);
  const v = [...p.unites.values()][0];
  for (const nature of natures) {
    // le plus proche : le cœur d'une forêt est inaccessible, comme dans AoE
    const n = [...p.noeuds.values()].filter((n) => n.nature === nature).sort((a, b) => Math.hypot(a.x - v.x, a.y - v.y) - Math.hypot(b.x - v.x, b.y - v.y))[0];
    assert.ok(chemin(p, v, n.x, n.y, 1, 1), `${nature} accessible`);
  }
  assert.deepEqual([...nouvellePartie(42).noeuds.values()].length, p.noeuds.size, "même graine, même carte");
  for (const g of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const q = nouvellePartie(g);
    const moi = [...q.unites.values()].find((u) => u.camp === 0)!;
    const lui = [...q.batiments.values()].find((b) => b.camp === 1)!;
    assert.ok(chemin(q, moi, lui.x, lui.y, 4, 1), `graine ${g} : base adverse atteignable`);
    for (const n of q.noeuds.values()) assert.ok(q.noeuds.size && q.caseNoeud[(q.taille - 1 - n.y) * q.taille + (q.taille - 1 - n.x)] > 0, "carte symétrique");
  }
});

test("un arbre au cœur de la forêt : le villageois prend le plus proche qu'il peut atteindre", () => {
  const p = partieVide(16);
  poser(p, "hotel", 0, 0, true);
  for (let y = 6; y < 9; y++) for (let x = 6; x < 9; x++) ajouterNoeud(p, "arbre", x, y);
  const v = ajouterUnite(p, "villageois", 5.5, 10.5);
  ordonner(p, [v.id], 7, 7);
  jouer(p, 5);
  assert.equal(v.tache.type, "recolter");
  assert.ok(v.charge && v.charge.n > 0, "il coupe");
});

test("le constructeur d'une ferme la cultive, et une ferme épuisée disparaît", () => {
  const p = partieVide(16);
  poser(p, "hotel", 0, 0, true);
  const v = ajouterUnite(p, "villageois", 5.5, 5.5);
  const f = construire(p, "ferme", 5, 5, [v.id]);
  assert.ok(f);
  jouer(p, 40);
  assert.ok(f.fini);
  assert.ok(p.camps[0].stock.nourriture > DEPART.nourriture, "la nourriture arrive");
  jouer(p, 600);
  assert.equal(p.batiments.has(f.id), false);
  assert.equal(p.occupe[5 * p.taille + 5], 0, "la place est libérée");
});

test("le constructeur d'un camp de bûcheron se met à couper à côté", () => {
  const p = partieVide(16);
  const v = ajouterUnite(p, "villageois", 5.5, 5.5);
  const arbre = ajouterNoeud(p, "arbre", 9, 5);
  construire(p, "bucheron", 6, 5, [v.id]);
  jouer(p, 30);
  assert.deepEqual(v.tache, { type: "recolter", cible: arbre.id, nature: "arbre" });
});

test("clic droit sur l'Hôtel de ville avec une charge : il la dépose, puis s'arrête", () => {
  const p = partieVide(16);
  poser(p, "hotel", 2, 2, true);
  const v = ajouterUnite(p, "villageois", 10.5, 10.5);
  v.charge = { res: "or", n: 7 };
  ordonner(p, [v.id], 3, 3);
  jouer(p, 15);
  assert.equal(p.camps[0].stock.or, 107);
  assert.equal(v.charge, null);
  assert.equal(v.tache.type, "rien");
});

test("point de ralliement sur un arbre : le villageois formé part couper", () => {
  const p = partieVide(16);
  const h = poser(p, "hotel", 2, 2, true);
  const arbre = ajouterNoeud(p, "arbre", 10, 10);
  fixerRalliement(p, h.id, 10, 10);
  former(p, h.id, "villageois");
  jouer(p, 16);
  const v = [...p.unites.values()][0];
  assert.deepEqual(v.tache, { type: "recolter", cible: arbre.id, nature: "arbre" });
});

test("Suppr : fondation remboursée si pas commencée, rien rendu sinon", () => {
  const p = partieVide(16);
  const m = construire(p, "maison", 5, 5, [])!;
  supprimer(p, m.id);
  assert.equal(p.camps[0].stock.bois, DEPART.bois);
  assert.equal(p.occupe[5 * p.taille + 5], 0);
  const m2 = construire(p, "maison", 5, 5, [])!;
  m2.construit = 3;
  supprimer(p, m2.id);
  assert.equal(p.camps[0].stock.bois, DEPART.bois - 25);
});

test("dégâts d'AoE II : armure de mêlée ou de perce, bonus contre une classe, au moins 1", () => {
  const p = partieVide(16);
  const milicien = ajouterUnite(p, "milicien", 1, 1);
  const chevalier = ajouterUnite(p, "chevalier", 1, 1);
  const archer = ajouterUnite(p, "archer", 1, 1);
  const maison = poser(p, "maison", 5, 5, true);
  assert.equal(degats("archer", milicien), 3, "4 − 1 de perce");
  assert.equal(degats("lancier", chevalier), 16, "3 + 15 contre la cavalerie − 2");
  assert.equal(degats("tirailleur", archer), 5, "2 + 3 contre les archers");
  assert.equal(degats("milicien", maison), 4);
  assert.equal(degats("archer", maison), 1, "une flèche ne fait presque rien à une maison");
});

test("un milicien au repos attaque le loup qui approche et le tue", () => {
  const p = partieVide(16);
  const m = ajouterUnite(p, "milicien", 5.5, 5.5);
  const loup = ajouterUnite(p, "loup", 8.5, 5.5, SAUVAGE);
  jouer(p, 20);
  assert.equal(p.unites.has(loup.id), false);
  assert.ok(m.pv > 0 && m.pv < 40, `pv ${m.pv}`);
  assert.equal(m.tache.type, "rien");
});

test("un archer tire de loin sans s'approcher", () => {
  const p = partieVide(16);
  const a = ajouterUnite(p, "archer", 2.5, 2.5);
  const cible = ajouterUnite(p, "villageois", 6.5, 2.5, 1);
  attaquer(p, [a.id], cible.id);
  jouer(p, 1);
  assert.deepEqual([a.x, a.y], [2.5, 2.5]);
  assert.equal(cible.pv, 25 - 4);
});

test("des soldats rasent une maison ennemie, et sa place se libère", () => {
  const p = partieVide(16);
  const maison = poser(p, "maison", 8, 8, true);
  maison.camp = 1;
  const ids = [0, 1, 2, 3].map((i) => ajouterUnite(p, "milicien", 3.5 + i, 3.5).id);
  attaquer(p, ids, maison.id);
  jouer(p, 60);
  assert.equal(p.batiments.has(maison.id), false);
  assert.equal(p.occupe[8 * p.taille + 8], 0);
});

test("la caserne forme un milicien, et l'annulation rembourse", () => {
  const p = partieVide(16);
  poser(p, "maison", 0, 0, true);
  const c = poser(p, "caserne", 5, 5, true);
  assert.equal(former(p, c.id, "villageois"), false, "pas de villageois à la caserne");
  assert.equal(former(p, c.id, "lancier"), false, "lancier : âge féodal");
  assert.ok(former(p, c.id, "milicien"));
  assert.ok(former(p, c.id, "milicien"));
  annulerFormation(p, c.id);
  assert.deepEqual([p.camps[0].stock.nourriture, p.camps[0].stock.or], [DEPART.nourriture - 60, DEPART.or - 20]);
  jouer(p, 13);
  assert.deepEqual([...p.unites.values()].map((u) => u.type), ["milicien"]);
});

test("passer à l'âge féodal : 2 bâtiments de l'âge sombre, 500 de nourriture, puis de nouvelles unités", () => {
  const p = partieVide(16);
  const h = poser(p, "hotel", 0, 0, true);
  p.camps[0].stock.nourriture = 1000;
  assert.equal(construire(p, "archerie", 8, 8, []), null, "archerie : âge féodal");
  poser(p, "moulin", 6, 0, true);
  assert.equal(former(p, h.id, "age"), false, "un seul bâtiment");
  const caserne = poser(p, "caserne", 9, 0, true);
  assert.ok(former(p, h.id, "age"));
  assert.equal(former(p, h.id, "age"), false, "déjà en cours");
  assert.equal(p.camps[0].stock.nourriture, 500);
  jouer(p, 130 / 1.7 + 1);
  assert.equal(p.camps[0].age, 1);
  assert.ok(peutFormer(p, caserne, "lancier"));
  assert.ok(construire(p, "archerie", 8, 8, []));
});

test("l'Hôtel de ville tire sur l'ennemi à portée", () => {
  const p = partieVide(20);
  poser(p, "hotel", 2, 2, true);
  const loup = ajouterUnite(p, "loup", 10.5, 4.5, SAUVAGE);
  const loin = ajouterUnite(p, "loup", 16.5, 16.5, SAUVAGE);
  jouer(p, 2);
  assert.ok(loup.pv < 25, "à 4,5 cases : touché");
  assert.equal(loin.pv, 25, "trop loin");
});

test("brouillard : on voit autour de ses unités, ce qu'on a vu reste exploré", () => {
  const p = partieVide(30);
  const v = ajouterUnite(p, "villageois", 5.5, 5.5);
  jouer(p, 0.1);
  assert.ok(visible(p, 7, 5));
  assert.ok(!explore(p, 20, 20));
  v.x = v.y = 25.5;
  jouer(p, 0.1);
  assert.ok(!visible(p, 7, 5) && explore(p, 7, 5));
  assert.ok(visible(p, 24, 24));
});

test("conquête : le camp qui n'a plus rien a perdu", () => {
  const p = partieVide(16);
  p.enJeu = [0, 1];
  ajouterUnite(p, "chevalier", 3.5, 3.5);
  const ennemi = ajouterUnite(p, "villageois", 5.5, 3.5, 1);
  jouer(p, 1);
  assert.equal(p.vainqueur, null);
  attaquer(p, [...p.unites.values()].filter((u) => u.camp === 0).map((u) => u.id), ennemi.id);
  jouer(p, 10);
  assert.equal(p.vainqueur, 0);
});
