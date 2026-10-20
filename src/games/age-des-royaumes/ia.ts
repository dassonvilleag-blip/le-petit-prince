// L'Âge des Royaumes — l'adversaire. Il joue avec les mêmes ordres que le
// joueur (former, construire, ordonner, attaquer), une fois par seconde de jeu :
// villageois en continu, répartis sur les ressources, camps près des sources,
// maisons à temps, armée, passage des âges, défense et vagues d'attaque.
// shortcut: il ignore le brouillard et sait où est la base du joueur, comme l'IA standard d'AoE II.

import { AGES, BATIMENTS, NATURE, RESSOURCES, UNITES, type BatimentId, type NatureId, type Ressource, type UniteId } from "./data.ts";
import {
  attaquer,
  batimentsPourAge,
  construire,
  ennemis,
  former,
  franchissable,
  ordonner,
  peutPayer,
  peutPoser,
  plusProche,
  popActuelle,
  popMaxi,
  taille,
  type Batiment,
  type Partie,
  type Point,
  type Unite,
} from "./sim.ts";

export interface IA {
  camp: number;
  prochain: number; // instant de la prochaine réflexion
  vagues: number;
}

export const creerIA = (camp = 1): IA => ({ camp, prochain: 0, vagues: 0 });

const VILLAGEOIS_VOULUS = 28;
const SEUIL_AGE = [16, 22]; // villageois avant de viser l'âge suivant
// la part des villageois sur chaque ressource, selon l'âge
const PARTS: Record<Ressource, number>[] = [
  { nourriture: 0.55, bois: 0.45, or: 0, pierre: 0 },
  { nourriture: 0.4, bois: 0.35, or: 0.25, pierre: 0 },
  { nourriture: 0.4, bois: 0.3, or: 0.25, pierre: 0.05 },
];
// ce que forme chaque bâtiment militaire, le meilleur disponible d'abord
const RECRUES: Partial<Record<BatimentId, UniteId[]>> = {
  caserne: ["lancier", "milicien"],
  archerie: ["archerMonte", "archer"],
  ecurie: ["chevalier", "eclaireur"],
};
const SOURCE: Record<Ressource, NatureId> = { nourriture: "baies", bois: "arbre", or: "or", pierre: "pierre" };
const CAMP_DE: Record<Ressource, BatimentId> = { nourriture: "moulin", bois: "bucheron", or: "mineur", pierre: "mineur" };

const centre = (b: Batiment): Point => ({ x: b.x + taille(b) / 2, y: b.y + taille(b) / 2 });
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

// Une place pour ce bâtiment, au plus près de `pres`, avec un passage libre tout autour.
function place(p: Partie, type: BatimentId, pres: Point, rmin: number, rmax: number): Point | null {
  const t = BATIMENTS[type].taille;
  const x0 = Math.round(pres.x - t / 2);
  const y0 = Math.round(pres.y - t / 2);
  for (let r = rmin; r <= rmax; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = x0 + dx;
        const y = y0 + dy;
        if (!peutPoser(p, type, x, y)) continue;
        let passage = true;
        for (let i = -1; i <= t && passage; i++) passage = [[x + i, y - 1], [x + i, y + t], [x - 1, y + i], [x + t, y + i]].every(([a, b]) => franchissable(p, a, b));
        if (passage) return { x, y };
      }
  return null;
}

export function penser(p: Partie, ia: IA): void {
  if (p.temps < ia.prochain || p.vainqueur !== null) return;
  ia.prochain = p.temps + 1;
  const { camp } = ia;
  const age = p.camps[camp].age;
  const miens = [...p.unites.values()].filter((u) => u.camp === camp);
  const villageois = miens.filter((u) => u.type === "villageois");
  const soldats = miens.filter((u) => u.type !== "villageois");
  const batiments = [...p.batiments.values()].filter((b) => b.camp === camp);
  const hotel = batiments.find((b) => b.type === "hotel" && b.fini);
  const base = hotel ? centre(hotel) : (miens[0] ?? null);
  if (!base) return;
  const libres = villageois.filter((v) => v.tache.type === "rien");
  const occupes = new Set<number>(); // villageois pris cette seconde pour bâtir

  // Bâtir près de `pres` avec le villageois donné, ou le plus proche disponible.
  const batir = (type: BatimentId, pres: Point, rmin: number, rmax: number, qui?: Unite): boolean => {
    if (!peutPayer(p, BATIMENTS[type].cout, camp) || BATIMENTS[type].age > age) return false;
    const pl = place(p, type, pres, rmin, rmax);
    const ouvrier = qui ?? plusProche(villageois, pl ?? pres, () => 0, (v) => v.tache.type !== "construire" && !occupes.has(v.id));
    if (!pl || !ouvrier || !construire(p, type, pl.x, pl.y, [ouvrier.id], camp)) return false;
    occupes.add(ouvrier.id);
    return true;
  };
  const enChantier = (t: BatimentId) => batiments.some((b) => b.type === t && !b.fini);
  const possede = (t: BatimentId) => batiments.some((b) => b.type === t);

  // --- l'Hôtel de ville : l'âge suivant dès que possible, sinon des villageois
  const veutAge = !!hotel && age + 1 < AGES.length && villageois.length >= SEUIL_AGE[age];
  if (hotel && !hotel.file.length && !(veutAge && former(p, hotel.id, "age")) && villageois.length < VILLAGEOIS_VOULUS) former(p, hotel.id, "villageois");
  const economiser = veutAge && batimentsPourAge(p, camp) >= 2 && !hotel?.file.includes("age"); // on garde la nourriture pour l'âge

  // --- des maisons avant d'être bloqué
  const enConstruction = batiments.filter((b) => b.type === "maison" && !b.fini).length;
  const militaires = batiments.filter((b) => RECRUES[b.type]).length;
  if (popMaxi(p, camp) + enConstruction * 5 - popActuelle(p, camp) < 3 + militaires && popMaxi(p, camp) < 200 && enConstruction < 2) batir("maison", base, 4, 12);

  // --- qui récolte quoi
  const parRes: Record<Ressource, number> = { nourriture: 0, bois: 0, or: 0, pierre: 0 };
  for (const v of villageois)
    if (v.tache.type === "recolter") parRes[v.tache.nature === "ferme" ? "nourriture" : NATURE[v.tache.nature].res]++;
  const parts = PARTS[age];
  const sourceProche = (res: Ressource, de: Point, rayon: number) =>
    plusProche(p.noeuds.values(), de, () => 1, (n) => n.nature === SOURCE[res] && dist(n, base) < rayon);

  // --- un camp près de chaque source exploitée
  if (!batiments.some((b) => !b.fini && b.type !== "maison" && b.type !== "ferme"))
    for (const res of RESSOURCES) {
      if (!parRes[res] && !parts[res]) continue;
      const n = sourceProche(res, base, res === "nourriture" ? 14 : 26);
      if (!n) continue;
      const depot = plusProche(batiments, n, taille, (b) => BATIMENTS[b.type].depot.includes(res));
      if (!depot || dist(centre(depot), n) > 6) {
        if (batir(CAMP_DE[res], n, 2, 5)) break;
      }
    }

  // --- les villageois sans travail vont là où il en manque le plus
  for (const v of libres) {
    if (occupes.has(v.id)) continue;
    const res = [...RESSOURCES].sort((a, b) => parts[b] * villageois.length - parRes[b] - (parts[a] * villageois.length - parRes[a]))[0];
    parRes[res]++;
    const n = sourceProche(res, v, res === "nourriture" ? 14 : 30);
    if (n) {
      ordonner(p, [v.id], n.x, n.y);
      continue;
    }
    if (res === "nourriture") {
      const ferme = batiments.find((b) => b.type === "ferme" && b.fini && !villageois.some((o) => o.tache.type === "recolter" && o.tache.cible === b.id));
      const pres = batiments.find((b) => b.type === "moulin" && b.fini) ?? hotel;
      if (ferme) ordonner(p, [v.id], ferme.x, ferme.y);
      else if (pres && !batir("ferme", centre(pres), 2, 10, v) && hotel) batir("ferme", centre(hotel), 3, 16, v);
      continue;
    }
    const bois = sourceProche("bois", v, 40);
    if (bois) ordonner(p, [v.id], bois.x, bois.y);
  }

  // --- les bâtiments militaires, puis ceux qu'exige l'âge suivant
  if (!enChantier("caserne") && !enChantier("archerie") && !enChantier("ecurie")) {
    if (villageois.length >= 10 && !possede("caserne")) batir("caserne", base, 5, 12);
    else if (age >= 1 && villageois.length >= 18 && !possede("archerie")) batir("archerie", base, 5, 13);
    else if (age >= 1 && villageois.length >= 18 && !possede("ecurie")) batir("ecurie", base, 5, 13);
  }

  // --- l'armée
  if (!economiser && villageois.length >= 12)
    for (const b of batiments) {
      const liste = RECRUES[b.type];
      if (!liste || !b.fini || b.file.length) continue;
      const u = liste.find((u) => UNITES[u].age <= age);
      if (u) former(p, b.id, u);
    }

  // --- défendre la base : tout soldat sur l'ennemi le plus proche
  const intrus = plusProche(p.unites.values(), base, () => 0, (u) => ennemis(u.camp, camp) && dist(u, base) < 18);
  if (intrus) {
    attaquer(p, soldats.filter((s) => s.tache.type !== "attaquer").map((s) => s.id), intrus.id);
    return;
  }

  // --- les vagues d'attaque, de plus en plus grosses
  const prets = soldats.filter((s) => s.tache.type === "rien");
  if (age >= 1 && prets.length >= Math.min(6 + 3 * ia.vagues, 25)) {
    // ses bâtiments d'abord, puis ce qui reste de ses unités
    const cible =
      plusProche(p.batiments.values(), base, taille, (b) => ennemis(b.camp, camp) && p.enJeu.includes(b.camp)) ??
      plusProche(p.unites.values(), base, () => 0, (u) => ennemis(u.camp, camp) && p.enJeu.includes(u.camp));
    if (cible) {
      attaquer(p, prets.map((s) => s.id), cible.id);
      ia.vagues++;
    }
  }
}
